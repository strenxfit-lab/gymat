
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

interface Assignment {
  memberId: string;
  memberName: string;
  memberDob?: string;
  memberPhone?: string;
  memberHeight?: string;
  memberWeight?: string;
  memberGoal?: string;
  trainerId: string;
  trainerName: string;
  trainerDob?: string;
  trainerPhone?: string;
}

interface Member {
  id: string;
  fullName: string;
  dob?: Timestamp;
  phone: string;
  height?: string;
  weight?: string;
  fitnessGoal?: string;
  assignedTrainer?: string;
}

interface Trainer {
  id: string;
  fullName: string;
  dob?: Timestamp;
  phone: string;
}

export default function TrainerAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
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
      const membersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'members');
      const membersSnapshot = await getDocs(membersCollection);
      const membersList: Member[] = membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
      
      const trainersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers');
      const trainersSnapshot = await getDocs(trainersCollection);
      const trainersList: Trainer[] = trainersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trainer));

      const assignmentsData: Assignment[] = membersList
        .filter(member => member.assignedTrainer)
        .map(member => {
            const trainer = trainersList.find(t => t.id === member.assignedTrainer);
            return {
                memberId: member.id,
                memberName: member.fullName,
                memberDob: member.dob ? format(member.dob.toDate(), 'PPP') : 'N/A',
                memberPhone: member.phone,
                memberHeight: member.height,
                memberWeight: member.weight,
                memberGoal: member.fitnessGoal,
                trainerId: trainer?.id || 'unassigned',
                trainerName: trainer?.fullName || 'Unassigned',
                trainerDob: trainer?.dob ? format(trainer.dob.toDate(), 'PPP') : 'N/A',
                trainerPhone: trainer?.phone
            }
        });

      setAssignments(assignmentsData);

    } catch (error) {
      console.error("Error fetching assignments data:", error);
      toast({ title: "Error", description: "Failed to fetch assignments data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
          <h1 className="text-3xl font-bold">Trainer Assignments</h1>
          <p className="text-muted-foreground">An overview of all member-trainer pairings in this branch.</p>
        </div>
        <Link href="/dashboard/owner" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Member-Trainer Assignments</CardTitle>
          <CardDescription>This list shows all members who currently have an assigned trainer.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Trainer</TableHead>
                <TableHead>Member Details</TableHead>
                <TableHead>Trainer Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.length > 0 ? (
                assignments.map((item) => (
                  <TableRow key={item.memberId}>
                    <TableCell className="font-medium">{item.memberName}</TableCell>
                    <TableCell className="font-medium">{item.trainerName}</TableCell>
                    <TableCell>
                        <div className="text-sm">DOB: {item.memberDob}</div>
                        <div className="text-sm">Phone: {item.memberPhone}</div>
                        <div className="text-sm">Goal: {item.memberGoal || 'N/A'}</div>
                        <div className="text-sm">H/W: {item.memberHeight || 'N/A'}cm / {item.memberWeight || 'N/A'}kg</div>
                    </TableCell>
                    <TableCell>
                        <div className="text-sm">DOB: {item.trainerDob}</div>
                        <div className="text-sm">Phone: {item.trainerPhone}</div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No members have been assigned a trainer yet.
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

