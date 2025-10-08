
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from 'lucide-react';

interface ClassInfo {
  id: string;
  className: string;
  dateTime: Date;
  trainerId: string;
  location: string;
}

interface Trainer {
  id: string;
  name: string;
}

export default function TrainerAssignmentsPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const fetchAllData = async () => {
    setLoading(true);
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');

    if (!userDocId || !activeBranchId) {
      toast({ title: "Error", description: "Branch not selected.", variant: "destructive" });
      setLoading(false);
      return;
    }
    try {
      // Fetch Trainers first
      const trainersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers');
      const trainersSnapshot = await getDocs(trainersCollection);
      const trainersList = trainersSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().fullName }));
      setTrainers(trainersList);

      // Fetch Classes
      const classesCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'classes');
      const classesSnapshot = await getDocs(classesCollection);

      const classesList = classesSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          className: data.className,
          dateTime: (data.dateTime as Timestamp).toDate(),
          trainerId: data.trainerId,
          location: data.location,
        };
      });

      // Sort classes by date
      classesList.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
      setClasses(classesList);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Error", description: "Failed to fetch assignments data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [toast]);

  const handleTrainerChange = async (classId: string, newTrainerId: string) => {
    setUpdating(classId);
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId) {
      toast({ title: "Error", description: "Session invalid.", variant: "destructive" });
      setUpdating(null);
      return;
    }

    try {
      const classRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'classes', classId);
      await updateDoc(classRef, { trainerId: newTrainerId });

      // Update local state to reflect the change immediately
      setClasses(prevClasses =>
        prevClasses.map(cls =>
          cls.id === classId ? { ...cls, trainerId: newTrainerId } : cls
        )
      );

      toast({ title: "Success!", description: "Trainer has been reassigned." });
    } catch (error) {
      console.error("Error updating trainer:", error);
      toast({ title: "Error", description: "Could not reassign trainer.", variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  const getTrainerName = (trainerId: string) => {
    return trainers.find(t => t.id === trainerId)?.name || 'Unassigned';
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Trainer Assignments</h1>
          <p className="text-muted-foreground">Assign and manage trainers for your classes.</p>
        </div>
        <Link href="/dashboard/owner" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Classes</CardTitle>
          <CardDescription>Change trainer assignments directly from this list.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Assigned Trainer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.length > 0 ? (
                classes.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium">{cls.className}</TableCell>
                    <TableCell>{cls.dateTime.toLocaleString()}</TableCell>
                    <TableCell>{cls.location}</TableCell>
                    <TableCell>
                      {updating === cls.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Select
                          value={cls.trainerId}
                          onValueChange={(newTrainerId) => handleTrainerChange(cls.id, newTrainerId)}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select a trainer" />
                          </SelectTrigger>
                          <SelectContent>
                            {trainers.length > 0 ? (
                              trainers.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-sm text-muted-foreground">No trainers available</div>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No classes scheduled yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
