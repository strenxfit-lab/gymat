
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, Timestamp, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, User, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AttendanceRecord {
  id: string;
  userName: string;
  userRole: 'member' | 'trainer';
  scanTime: Date;
}

export default function VerifyAttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
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

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const attendanceCollection = collection(db, 'attendance');
    const q = query(
        attendanceCollection, 
        where('gymId', '==', userDocId), 
        where('branchId', '==', activeBranchId),
        where('scanTime', '>=', Timestamp.fromDate(startOfToday)),
        orderBy('scanTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const records = querySnapshot.docs.map(doc => ({
            id: doc.id,
            userName: doc.data().userName,
            userRole: doc.data().userRole,
            scanTime: (doc.data().scanTime as Timestamp).toDate(),
        }));
        setAttendance(records);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching attendance:", error);
        toast({ title: "Error", description: "Failed to fetch real-time attendance.", variant: "destructive" });
        setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-4">
        <div>
            <h1 className="text-3xl font-bold">Verify Daily Attendance</h1>
            <p className="text-muted-foreground">A real-time log of today's check-ins.</p>
        </div>
        <Link href="/dashboard/owner" passHref>
            <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Dashboard</Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Today's Check-ins</CardTitle>
          <CardDescription>This list updates automatically as users scan their QR code.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Check-in Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.length > 0 ? (
                attendance.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.userName}</TableCell>
                    <TableCell>
                      <Badge variant={record.userRole === 'member' ? 'secondary' : 'default'} className="capitalize flex items-center gap-1 w-fit">
                          {record.userRole === 'member' ? <User className="h-3 w-3"/> : <UserCog className="h-3 w-3"/>}
                          {record.userRole}
                      </Badge>
                    </TableCell>
                    <TableCell>{record.scanTime.toLocaleTimeString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No one has checked in yet today.
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
