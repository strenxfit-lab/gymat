"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Users, Eye } from 'lucide-react';

interface Trainer {
  id: string;
  fullName: string;
  phone: string;
  specialization?: string;
}

export default function TrainerSettlementListPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');

    if (!userDocId || !activeBranchId) {
      toast({ title: "Error", description: "Branch not selected.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const fetchTrainers = async () => {
      try {
        const trainersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers');
        const trainersSnapshot = await getDocs(trainersCollection);
        const trainersList = trainersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Trainer));
        setTrainers(trainersList);
      } catch (error) {
        console.error("Error fetching trainers:", error);
        toast({ title: "Error", description: "Could not fetch trainers list.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchTrainers();
  }, [toast]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Trainer Settlement</h1>
          <p className="text-muted-foreground">Select a trainer to view details and process settlement.</p>
        </div>
        <Link href="/dashboard/owner" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Dashboard</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Trainers</CardTitle>
          <CardDescription>List of all trainers in the current active branch.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trainers.length > 0 ? (
                trainers.map(trainer => (
                  <TableRow key={trainer.id}>
                    <TableCell className="font-medium">{trainer.fullName}</TableCell>
                    <TableCell>{trainer.phone}</TableCell>
                    <TableCell>{trainer.specialization || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/owner/settlement/trainer-settlement/${trainer.id}`} passHref>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          View & Settle
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No trainers found in this branch.
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
