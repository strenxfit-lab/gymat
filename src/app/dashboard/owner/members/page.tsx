
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Member {
  id: string;
  fullName: string;
  email?: string;
  phone: string;
  membershipType: string;
  startDate: Date;
  endDate: Date;
  status: 'Active' | 'Expired';
}

export default function MembersListPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const userDocId = localStorage.getItem('userDocId');
    if (!userDocId) {
      toast({ title: "Error", description: "No user session found.", variant: "destructive" });
      router.push('/');
      return;
    }

    const fetchMembers = async () => {
      try {
        const membersCollection = collection(db, 'gyms', userDocId, 'members');
        const membersSnapshot = await getDocs(membersCollection);
        const now = new Date();

        const membersList = membersSnapshot.docs.map(doc => {
          const data = doc.data();
          const endDate = (data.endDate as Timestamp).toDate();
          return {
            id: doc.id,
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            membershipType: data.membershipType,
            startDate: (data.startDate as Timestamp).toDate(),
            endDate: endDate,
            status: endDate >= now ? 'Active' : 'Expired',
          } as Member;
        });

        setMembers(membersList);
      } catch (error) {
        console.error("Error fetching members:", error);
        toast({ title: "Error", description: "Failed to fetch members list.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [router, toast]);

  const filteredMembers = members.filter(member =>
    member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phone.includes(searchTerm) ||
    (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background">Loading members...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Members List</CardTitle>
          <CardDescription>A list of all members in your gym.</CardDescription>
          <div className="py-4">
            <Input
              placeholder="Filter by name, email, or phone..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Membership</TableHead>
                <TableHead>Expires On</TableHead>
                <TableHead>Status</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.fullName}</TableCell>
                    <TableCell>
                      <div>{member.email}</div>
                      <div>{member.phone}</div>
                    </TableCell>
                    <TableCell>{member.membershipType}</TableCell>
                    <TableCell>{member.endDate.toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={member.status === 'Active' ? 'default' : 'destructive'}>
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>View Profile</DropdownMenuItem>
                          <DropdownMenuItem>Collect Payment</DropdownMenuItem>
                           <DropdownMenuItem>Freeze Membership</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
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
