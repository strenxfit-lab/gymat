
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, Timestamp, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, ArrowLeft, Loader2, User, UserCog } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type ComplaintStatus = 'Pending' | 'In Review' | 'Resolved';

interface Complaint {
  id: string;
  complaint: string;
  authorName: string;
  authorRole: 'member' | 'trainer';
  status: ComplaintStatus;
  submittedAt: string;
}

const getStatusVariant = (status: ComplaintStatus) => {
    switch (status) {
        case 'Pending': return 'secondary';
        case 'In Review': return 'default';
        case 'Resolved': return 'destructive';
        default: return 'outline';
    }
}

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const fetchComplaints = async () => {
    setLoading(true);
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');

    if (!userDocId || !activeBranchId) {
      toast({ title: "Error", description: "Branch not selected.", variant: "destructive" });
      setLoading(false);
      return;
    }
    
    try {
      const complaintsCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'complaints');
      const q = query(complaintsCollection, orderBy('submittedAt', 'desc'));
      const complaintsSnap = await getDocs(q);
      const complaintsList = complaintsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          submittedAt: (doc.data().submittedAt as Timestamp).toDate().toLocaleString()
      } as Complaint));
      setComplaints(complaintsList);
    } catch (error) {
      console.error("Error fetching complaints:", error);
      toast({ title: "Error", description: "Failed to fetch complaints.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [toast]);

  const handleStatusChange = async (complaintId: string, newStatus: ComplaintStatus) => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId) return;

    try {
      const complaintRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'complaints', complaintId);
      await updateDoc(complaintRef, { status: newStatus });
      
      setComplaints(prevComplaints =>
        prevComplaints.map(c => c.id === complaintId ? { ...c, status: newStatus } : c)
      );
      toast({ title: "Success", description: "Complaint status updated." });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-4">
        <div>
            <h1 className="text-3xl font-bold">Complaint Management</h1>
            <p className="text-muted-foreground">Review and resolve submitted complaints.</p>
        </div>
        <Link href="/dashboard/owner" passHref>
            <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back</Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Complaints</CardTitle>
          <CardDescription>A log of all complaints from members and trainers in this branch.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Submitted By</TableHead>
                <TableHead>Complaint</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {complaints.length > 0 ? (
                complaints.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                            {c.authorRole === 'member' ? <User className="h-4 w-4 text-muted-foreground" /> : <UserCog className="h-4 w-4 text-muted-foreground" />}
                            <span>{c.authorName}</span>
                        </div>
                    </TableCell>
                    <TableCell className="max-w-sm truncate">{c.complaint}</TableCell>
                    <TableCell>{c.submittedAt}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(c.status)}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => handleStatusChange(c.id, 'Pending')}>Mark as Pending</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleStatusChange(c.id, 'In Review')}>Mark as In Review</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleStatusChange(c.id, 'Resolved')}>Mark as Resolved</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No complaints found.
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
