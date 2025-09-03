
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from 'lucide-react';

interface AssignedClass {
  id: string;
  className: string;
  dateTime: Date;
  capacity: number;
  location: string;
  booked: number;
}

interface TrainerInfo {
    name: string;
    branchName: string;
}

export default function TrainerDashboardPage() {
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [trainerInfo, setTrainerInfo] = useState<TrainerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchTrainerData = async () => {
      const userDocId = localStorage.getItem('userDocId');
      const activeBranchId = localStorage.getItem('activeBranch');
      const trainerId = localStorage.getItem('trainerId');

      if (!userDocId || !activeBranchId || !trainerId) {
        toast({ title: "Error", description: "Session invalid. Please log in again.", variant: "destructive" });
        router.push('/');
        return;
      }

      try {
        // Fetch trainer and branch name
        const trainerRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers', trainerId);
        const trainerSnap = await getDoc(trainerRef);
        const branchRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId);
        const branchSnap = await getDoc(branchRef);

        if (trainerSnap.exists() && branchSnap.exists()) {
            setTrainerInfo({
                name: trainerSnap.data().fullName,
                branchName: branchSnap.data().name
            });
        } else {
             toast({ title: "Error", description: "Could not find trainer details.", variant: "destructive" });
             router.push('/');
             return;
        }

        // Fetch assigned classes
        const classesCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'classes');
        const q = query(classesCollection, where("trainerId", "==", trainerId));
        const classesSnapshot = await getDocs(q);

        const classesListPromises = classesSnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const bookingsCollection = collection(docSnap.ref, 'bookings');
          const bookingsSnapshot = await getDocs(bookingsCollection);

          return {
            id: docSnap.id,
            className: data.className,
            dateTime: (data.dateTime as Timestamp).toDate(),
            capacity: data.capacity,
            location: data.location,
            booked: bookingsSnapshot.size,
          };
        });
        
        const classesList = await Promise.all(classesListPromises);
        classesList.sort((a,b) => a.dateTime.getTime() - b.dateTime.getTime()); // Sort by date
        setAssignedClasses(classesList);
      } catch (error) {
        console.error("Error fetching trainer data:", error);
        toast({ title: "Error", description: "Failed to fetch dashboard data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchTrainerData();
  }, [router, toast]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Trainer Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {trainerInfo?.name}! Here are your upcoming classes at {trainerInfo?.branchName}.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Schedule</CardTitle>
          <CardDescription>A list of your assigned classes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class Name</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Bookings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedClasses.length > 0 ? (
                assignedClasses.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium">{cls.className}</TableCell>
                    <TableCell>{cls.dateTime.toLocaleString()}</TableCell>
                    <TableCell>{cls.location}</TableCell>
                    <TableCell>{cls.booked} / {cls.capacity}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    You have no classes assigned yet.
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

    