
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, Timestamp, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, ArrowLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface Trainer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  specialization?: string;
  shiftTiming: string;
}

export default function MembersListPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("members");
  const [activeBranch, setActiveBranch] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const branch = localStorage.getItem('activeBranch');
    setActiveBranch(branch);

    const userDocId = localStorage.getItem('userDocId');
    if (!userDocId || !branch) {
      toast({ title: "Error", description: "Session or branch not found.", variant: "destructive" });
      if (!userDocId) router.push('/');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const membersCollection = collection(db, 'gyms', userDocId, 'branches', branch, 'members');
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
        
        const trainersCollection = collection(db, 'gyms', userDocId, 'branches', branch, 'trainers');
        const trainersSnapshot = await getDocs(trainersCollection);
        const trainersList = trainersSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            specialization: data.specialization,
            shiftTiming: data.shiftTiming,
          } as Trainer;
        });
        setTrainers(trainersList);

      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ title: "Error", description: "Failed to fetch lists.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, toast]);

  const filteredMembers = members.filter(member =>
    member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phone.includes(searchTerm) ||
    (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredTrainers = trainers.filter(trainer =>
    trainer.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trainer.phone.includes(searchTerm) ||
    trainer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between mb-4">
                 <Link href="/dashboard/owner" passHref>
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4"/>
                        Back
                    </Button>
                </Link>
                <TabsList className="mx-auto">
                    <TabsTrigger value="members">Members</TabsTrigger>
                    <TabsTrigger value="trainers">Trainers</TabsTrigger>
                </TabsList>
                 <div className="w-full max-w-sm">
                    <Input
                    placeholder={`Filter ${activeTab}...`}
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    />
                </div>
            </div>
            <TabsContent value="members">
                <Card>
                    <CardHeader>
                    <CardTitle>Members List ({activeBranch})</CardTitle>
                    <CardDescription>A list of all members in this branch.</CardDescription>
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
                                No members found for this branch.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="trainers">
                 <Card>
                    <CardHeader>
                    <CardTitle>Trainers List ({activeBranch})</CardTitle>
                    <CardDescription>A list of all trainers in this branch.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Full Name</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Specialization</TableHead>
                            <TableHead>Shift</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredTrainers.length > 0 ? (
                            filteredTrainers.map((trainer) => (
                            <TableRow key={trainer.id}>
                                <TableCell className="font-medium">{trainer.fullName}</TableCell>
                                <TableCell>
                                    <div>{trainer.email}</div>
                                    <div>{trainer.phone}</div>
                                </TableCell>
                                <TableCell>{trainer.specialization || 'N/A'}</TableCell>
                                <TableCell><Badge variant="secondary">{trainer.shiftTiming}</Badge></TableCell>
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
                                    <DropdownMenuItem>Edit Details</DropdownMenuItem>
                                    <DropdownMenuItem>Mark Attendance</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No trainers found for this branch.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}
