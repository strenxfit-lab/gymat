
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, ArrowLeft, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type MemberStatus = 'Active' | 'Expired' | 'Pending' | 'Frozen' | 'Stopped';

interface Member {
  id: string;
  fullName: string;
  phone: string;
  status: MemberStatus;
  endDate?: Date;
}

const getStatusVariant = (status: MemberStatus) => {
    switch (status) {
        case 'Active': return 'default';
        case 'Expired': return 'destructive';
        case 'Pending': return 'secondary';
        case 'Frozen':
        case 'Stopped':
             return 'destructive';
        default: return 'outline';
    }
}


export default function MemberStatusPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchMembers = async () => {
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
        const now = new Date();
        const membersList = membersSnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          const endDate = (data.endDate as Timestamp)?.toDate();
          
          let status: MemberStatus = data.status || 'Pending';
          if (status === 'Active' && endDate && endDate < now) {
              status = 'Expired';
          }
          
          return {
            id: docSnap.id,
            fullName: data.fullName,
            phone: data.phone,
            status: status,
            endDate: endDate
          };
        });
        setMembers(membersList);
      } catch (error) {
        console.error("Error fetching members:", error);
        toast({ title: "Error", description: "Failed to fetch member list.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [toast]);

  const handleStatusChange = async (memberId: string, newStatus: MemberStatus) => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId) return;

    try {
      const memberRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', memberId);
      await updateDoc(memberRef, { status: newStatus });
      
      setMembers(prevMembers =>
        prevMembers.map(m => m.id === memberId ? { ...m, status: newStatus } : m)
      );

      toast({ title: "Success", description: "Member status updated." });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
    }
  };

  const filteredMembers = members.filter(member =>
    member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phone.includes(searchTerm)
  );
  
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-4">
        <Link href="/dashboard/owner" passHref>
            <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back</Button>
        </Link>
        <div className="w-full max-w-sm">
            <Input
            placeholder="Filter by name or phone..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            />
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Member Status Management</CardTitle>
          <CardDescription>Update the status of member accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Expires On</TableHead>
                <TableHead>Current Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.fullName}</TableCell>
                    <TableCell>{member.phone}</TableCell>
                    <TableCell>{member.endDate ? member.endDate.toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(member.status)}>{member.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost">
                            Update Status <MoreHorizontal className="ml-2 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Change Status To</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => handleStatusChange(member.id, 'Active')}>Active</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleStatusChange(member.id, 'Frozen')}>Frozen</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleStatusChange(member.id, 'Stopped')}>Stopped</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No members found.
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
