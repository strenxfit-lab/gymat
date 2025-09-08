
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, User, Briefcase, Calendar } from 'lucide-react';
import { differenceInYears } from 'date-fns';

interface Trainer {
  id: string;
  name: string;
  gender: string;
  age: number;
  specialization?: string;
  experience?: string;
}

export default function TrainersListPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchTrainers = async () => {
      setLoading(true);
      const userDocId = localStorage.getItem('userDocId');
      const activeBranchId = localStorage.getItem('activeBranch');

      if (!userDocId || !activeBranchId) {
        toast({ title: "Error", description: "Session invalid.", variant: "destructive" });
        setLoading(false);
        return;
      }
      
      try {
        const trainersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers');
        const trainersSnapshot = await getDocs(trainersCollection);

        const trainersList = trainersSnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          const dob = (data.dob as Timestamp)?.toDate();
          const age = dob ? differenceInYears(new Date(), dob) : 0;
          return {
            id: docSnap.id,
            name: data.fullName,
            gender: data.gender,
            age: age,
            specialization: data.specialization,
            experience: data.experience,
          } as Trainer;
        });
        setTrainers(trainersList);
      } catch (error) {
        console.error("Error fetching trainers:", error);
        toast({ title: "Error", description: "Failed to fetch trainers.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrainers();
  }, [toast]);
  
  const handleAssignTrainer = async (trainerId: string) => {
    setAssigningId(trainerId);
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    const memberId = localStorage.getItem('memberId');

    if (!userDocId || !activeBranchId || !memberId) {
      toast({ title: "Error", description: "Session expired. Please log in again.", variant: "destructive" });
      setAssigningId(null);
      return;
    }

    try {
      const memberRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', memberId);
      await updateDoc(memberRef, {
        assignedTrainer: trainerId,
      });
      toast({
        title: "Trainer Assigned!",
        description: "Your new trainer has been assigned successfully.",
      });
      router.push('/dashboard/member/profile');
    } catch (error) {
      console.error("Error assigning trainer:", error);
      toast({ title: "Error", description: "Could not assign trainer. Please try again.", variant: "destructive" });
    } finally {
      setAssigningId(null);
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
        <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-3xl font-bold">Your Center's Trainers</h1>
                <p className="text-muted-foreground">Choose a trainer to guide you on your fitness journey.</p>
            </div>
            <Link href="/dashboard/member" passHref>
                <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Button>
            </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainers.length > 0 ? (
                trainers.map(trainer => (
                    <Card key={trainer.id} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-xl">{trainer.name}</CardTitle>
                            <CardDescription>{trainer.specialization || 'General Trainer'}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 flex-grow">
                            <div className="flex items-center text-sm"><User className="mr-2 h-4 w-4 text-muted-foreground" /> {trainer.gender}, {trainer.age} years old</div>
                             <div className="flex items-center text-sm"><Briefcase className="mr-2 h-4 w-4 text-muted-foreground" /> {trainer.experience || 'N/A'} years of experience</div>
                        </CardContent>
                        <CardContent>
                            <Button 
                                className="w-full"
                                onClick={() => handleAssignTrainer(trainer.id)}
                                disabled={assigningId === trainer.id}
                            >
                                {assigningId === trainer.id ? <Loader2 className="animate-spin"/> : 'Assign Trainer'}
                            </Button>
                        </CardContent>
                    </Card>
                ))
            ) : (
                 <p className="col-span-full text-center text-muted-foreground py-10">No trainers are available in this branch currently.</p>
            )}
        </div>
    </div>
  );
}

    