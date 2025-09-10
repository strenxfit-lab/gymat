
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, Timestamp, query, addDoc, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Check, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface User {
  id: string;
  fullName: string;
  phone: string;
  lastCheckIn?: Date | null;
}

export default function MarkAttendancePage() {
  const [members, setMembers] = useState<User[]>([]);
  const [trainers, setTrainers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("members");
  const [activeBranch, setActiveBranch] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    const userDocId = localStorage.getItem('userDocId');
    const branchId = localStorage.getItem('activeBranch');
    setActiveBranch(branchId);

    if (!userDocId || !branchId) {
      toast({ title: "Error", description: "Branch not selected.", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      // Fetch Members
      const membersCollection = collection(db, 'gyms', userDocId, 'branches', branchId, 'members');
      const membersSnapshot = await getDocs(membersCollection);
      const membersList = await Promise.all(membersSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const attendanceQuery = query(collection(db, 'attendance'), where('userId', '==', doc.id), orderBy('scanTime', 'desc'), limit(1));
        const attendanceSnap = await getDocs(attendanceQuery);
        let lastCheckIn = null;
        if (!attendanceSnap.empty) {
            const lastScanTime = (attendanceSnap.docs[0].data().scanTime as Timestamp).toDate();
            if (lastScanTime > tenMinutesAgo) {
                lastCheckIn = lastScanTime;
            }
        }
        return { id: doc.id, fullName: data.fullName, phone: data.phone, lastCheckIn };
      }));
      setMembers(membersList);

      // Fetch Trainers
      const trainersCollection = collection(db, 'gyms', userDocId, 'branches', branchId, 'trainers');
      const trainersSnapshot = await getDocs(trainersCollection);
      const trainersList = await Promise.all(trainersSnapshot.docs.map(async (doc) => {
         const data = doc.data();
         const attendanceQuery = query(collection(db, 'attendance'), where('userId', '==', doc.id), orderBy('scanTime', 'desc'), limit(1));
         const attendanceSnap = await getDocs(attendanceQuery);
         let lastCheckIn = null;
         if (!attendanceSnap.empty) {
            const lastScanTime = (attendanceSnap.docs[0].data().scanTime as Timestamp).toDate();
             if (lastScanTime > tenMinutesAgo) {
                lastCheckIn = lastScanTime;
            }
         }
        return { id: doc.id, fullName: data.fullName, phone: data.phone, lastCheckIn };
      }));
      setTrainers(trainersList);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Error", description: "Failed to fetch user lists.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [toast]);
  
  const handleMarkAttendance = async (user: User, role: 'member' | 'trainer') => {
    const userDocId = localStorage.getItem('userDocId');
    const branchId = localStorage.getItem('activeBranch');
    if (!userDocId || !branchId) return;

    setMarkingId(user.id);
    
    try {
        const attendanceRef = collection(db, "attendance");
        await addDoc(attendanceRef, {
            gymId: userDocId,
            branchId,
            userId: user.id,
            userRole: role,
            userName: user.fullName,
            userPhone: user.phone,
            scanTime: Timestamp.now(),
            method: "Manual",
        });

        toast({ title: "Success", description: `${user.fullName}'s attendance has been marked.` });
        await fetchData(); // Refresh data to show updated check-in status
    } catch (e) {
        console.error("Error marking attendance:", e);
        toast({ title: "Error", description: "Could not mark attendance.", variant: "destructive" });
    } finally {
        setMarkingId(null);
    }
  }

  const renderTable = (data: User[], role: 'member' | 'trainer') => {
    const filteredData = data.filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone.includes(searchTerm)
    );

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.length > 0 ? (
            filteredData.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.fullName}</TableCell>
                <TableCell>{user.phone}</TableCell>
                <TableCell className="text-right">
                    {user.lastCheckIn ? (
                         <Button variant="outline" size="sm" disabled className="cursor-not-allowed">
                            <Check className="mr-2 h-4 w-4" />
                            Checked-in
                        </Button>
                    ) : (
                        <Button size="sm" onClick={() => handleMarkAttendance(user, role)} disabled={markingId === user.id}>
                            {markingId === user.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4" />}
                            Mark Attendance
                        </Button>
                    )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center">
                No {role}s found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  };
  
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
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
                    <CardTitle>Mark Member Attendance ({activeBranch})</CardTitle>
                    <CardDescription>Select a member to mark their attendance for today.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       {renderTable(members, 'member')}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="trainers">
                 <Card>
                    <CardHeader>
                    <CardTitle>Mark Trainer Attendance ({activeBranch})</CardTitle>
                    <CardDescription>Select a trainer to mark their attendance for today.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {renderTable(trainers, 'trainer')}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
         <Alert variant="destructive" className="mt-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              Attendance can only be marked for a user once every 10 minutes to prevent duplicate entries. Recently checked-in users will have a disabled button.
            </AlertDescription>
          </Alert>
    </div>
  );
}
