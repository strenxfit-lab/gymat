
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, Timestamp, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Star, Users, BarChart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TrainerPerformance {
  id: string;
  name: string;
  assignedMembers: number;
  classesConducted: number;
  averageAttendance: number;
  averageRating?: number;
}

export default function TrainerPerformancePage() {
  const [performanceData, setPerformanceData] = useState<TrainerPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPerformanceData = async () => {
      setLoading(true);
      const userDocId = localStorage.getItem('userDocId');
      const activeBranchId = localStorage.getItem('activeBranch');

      if (!userDocId || !activeBranchId) {
        toast({ title: "Error", description: "Branch not selected.", variant: "destructive" });
        setLoading(false);
        return;
      }

      try {
        const trainersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers');
        const trainersSnapshot = await getDocs(trainersCollection);
        const trainersList = trainersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const membersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'members');
        const membersSnapshot = await getDocs(membersCollection);
        const membersList = membersSnapshot.docs.map(doc => doc.data());

        const classesCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'classes');
        const classesSnapshot = await getDocs(classesCollection);

        const allClassData: {id: string, trainerId: string, attendance: number, capacity: number}[] = [];

        for (const classDoc of classesSnapshot.docs) {
            const bookingsSnapshot = await getDocs(collection(classDoc.ref, 'bookings'));
            allClassData.push({
                id: classDoc.id,
                trainerId: classDoc.data().trainerId,
                attendance: bookingsSnapshot.size,
                capacity: classDoc.data().capacity,
            });
        }
        
        const performanceMetrics = trainersList.map(trainer => {
          const assignedMembers = membersList.filter(m => m.assignedTrainer === trainer.id).length;
          const trainerClasses = allClassData.filter(c => c.trainerId === trainer.id);
          const classesConducted = trainerClasses.length;
          
          const totalAttendance = trainerClasses.reduce((sum, cls) => sum + cls.attendance, 0);
          const averageAttendance = classesConducted > 0 ? totalAttendance / classesConducted : 0;
          
          const ratings = trainer.ratings;
          const averageRating = ratings?.ratingCount > 0 ? ratings.averageRating : undefined;

          return {
            id: trainer.id,
            name: trainer.fullName,
            assignedMembers,
            classesConducted,
            averageAttendance,
            averageRating,
          };
        });

        setPerformanceData(performanceMetrics);
      } catch (error) {
        console.error("Error fetching performance data:", error);
        toast({ title: "Error", description: "Failed to fetch trainer performance data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [toast]);

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
          <h1 className="text-3xl font-bold">Trainer Performance</h1>
          <p className="text-muted-foreground">An overview of key performance indicators for your trainers.</p>
        </div>
        <Link href="/dashboard/owner" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>Review and compare trainer performance across key areas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trainer</TableHead>
                <TableHead>Assigned Members</TableHead>
                <TableHead>Classes Conducted</TableHead>
                <TableHead>Avg. Class Attendance</TableHead>
                <TableHead>Avg. Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {performanceData.length > 0 ? (
                performanceData.map((trainer) => (
                  <TableRow key={trainer.id}>
                    <TableCell className="font-medium">{trainer.name}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                           <Users className="h-4 w-4 text-muted-foreground"/> {trainer.assignedMembers}
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <BarChart className="h-4 w-4 text-muted-foreground"/> {trainer.classesConducted}
                        </div>
                    </TableCell>
                    <TableCell>{trainer.averageAttendance.toFixed(1)}</TableCell>
                    <TableCell>
                      {trainer.averageRating ? (
                        <Badge variant="default" className="flex items-center gap-1 w-fit">
                          <Star className="h-3 w-3" /> {trainer.averageRating.toFixed(1)} / 5
                        </Badge>
                      ) : (
                        <Badge variant="secondary">No Ratings</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No trainer data available to display.
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

    