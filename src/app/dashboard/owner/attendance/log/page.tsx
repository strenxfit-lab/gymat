
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, Timestamp, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, User, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startOfMonth } from 'date-fns';

interface AttendanceRecord {
  id: string;
  userName: string;
  userRole: 'member' | 'trainer';
  scanTime: Date;
}

export default function AttendanceLogPage() {
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
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

    const fetchAttendance = async () => {
        const startOfThisMonth = startOfMonth(new Date());

        const attendanceCollection = collection(db, 'attendance');
        const q = query(
            attendanceCollection,
            where('gymId', '==', userDocId),
            where('branchId', '==', activeBranchId),
            where('scanTime', '>=', Timestamp.fromDate(startOfThisMonth)),
            orderBy('scanTime', 'desc')
        );

        try {
            const querySnapshot = await getDocs(q);
            const records = querySnapshot.docs.map(doc => ({
                id: doc.id,
                userName: doc.data().userName,
                userRole: doc.data().userRole,
                scanTime: (doc.data().scanTime as Timestamp).toDate(),
            }));
            setAllAttendance(records);
        } catch (error) {
            console.error("Error fetching attendance log:", error);
            toast({ title: "Error", description: "Failed to fetch attendance log.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    fetchAttendance();
  }, [toast]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  const memberAttendance = allAttendance.filter(r => r.userRole === 'member');
  const trainerAttendance = allAttendance.filter(r => r.userRole === 'trainer');

  const renderTable = (data: AttendanceRecord[], type: string) => (
     <Table>
        <TableHeader>
            <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Check-in Time</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {data.length > 0 ? (
            data.map((record) => (
                <TableRow key={record.id}>
                <TableCell className="font-medium">{record.userName}</TableCell>
                <TableCell>{record.scanTime.toLocaleDateString()}</TableCell>
                <TableCell>{record.scanTime.toLocaleTimeString()}</TableCell>
                </TableRow>
            ))
            ) : (
            <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                No attendance records for {type} this month.
                </TableCell>
            </TableRow>
            )}
        </TableBody>
    </Table>
  )

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-4">
        <div>
            <h1 className="text-3xl font-bold">Monthly Attendance Log</h1>
            <p className="text-muted-foreground">An overview of check-ins for the current month.</p>
        </div>
        <Link href="/dashboard/owner" passHref>
            <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Dashboard</Button>
        </Link>
      </div>
      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="trainers">Trainers</TabsTrigger>
        </TabsList>
        <TabsContent value="members">
            <Card>
                <CardHeader>
                    <CardTitle>Member Attendance</CardTitle>
                    <CardDescription>Showing all member check-ins for this month.</CardDescription>
                </CardHeader>
                <CardContent>
                    {renderTable(memberAttendance, "members")}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="trainers">
             <Card>
                <CardHeader>
                    <CardTitle>Trainer Attendance</CardTitle>
                    <CardDescription>Showing all trainer check-ins for this month.</CardDescription>
                </CardHeader>
                <CardContent>
                    {renderTable(trainerAttendance, "trainers")}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
