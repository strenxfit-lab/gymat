
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, Timestamp, query, where, orderBy, onSnapshot, writeBatch, addDoc, limit, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, ArrowLeft, KeyRound, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
  code: z.string().length(4, 'Code must be 4 digits.').regex(/^\d{4}$/, 'Code must be numeric.'),
});

interface LastVerified {
    userName: string;
    scanTime: string;
}

export default function VerifyAttendancePage() {
  const [loading, setLoading] = useState(false);
  const [lastVerified, setLastVerified] = useState<LastVerified | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { code: '' },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    setLastVerified(null);
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    
    if (!userDocId || !activeBranchId) {
      toast({ title: "Error", description: "Branch not selected.", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      const now = new Date();
      const codesRef = collection(db, 'attendanceCodes');
      const q = query(
        codesRef,
        where('code', '==', values.code),
        where('branchId', '==', activeBranchId)
      );
      
      const querySnapshot = await getDocs(q);

      const validDoc = querySnapshot.docs.find(doc => {
          const data = doc.data();
          const expiresAt = (data.expiresAt as Timestamp)?.toDate();
          return data.gymId === userDocId && expiresAt && expiresAt >= now;
      });


      if (!validDoc) {
        toast({ title: "Invalid Code", description: "The code is incorrect or has expired.", variant: "destructive" });
        setLoading(false);
        form.reset();
        return;
      }
      
      const codeData = validDoc.data();
      
      // Duplicate check
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const attendanceRef = collection(db, "attendance");
      const qAttendance = query(
          attendanceRef,
          where("gymId", "==", userDocId),
          where("branchId", "==", activeBranchId),
          where("userId", "==", codeData.userId),
          where("scanTime", ">=", Timestamp.fromDate(tenMinutesAgo))
      );

      const attendanceSnapshot = await getDocs(qAttendance);
      if(!attendanceSnapshot.empty) {
          toast({ title: "Already Checked In", description: `${codeData.userName} has already marked attendance recently.`, variant: "default" });
          await deleteDoc(validDoc.ref);
          setLoading(false);
          form.reset();
          return;
      }


      // Add new attendance record
      await addDoc(attendanceRef, {
        gymId: codeData.gymId,
        branchId: codeData.branchId,
        userId: codeData.userId,
        userRole: codeData.userRole,
        userName: codeData.userName,
        userPhone: codeData.userPhone,
        scanTime: serverTimestamp(),
        method: "Code",
      });
      
      // Delete the used code
      await deleteDoc(validDoc.ref);
      
      const verificationTime = new Date();
      setLastVerified({ userName: codeData.userName, scanTime: verificationTime.toLocaleTimeString() });

      toast({
        title: "✅ Attendance Marked!",
        description: `Welcome, ${codeData.userName}!`,
      });
      
      setLoading(false);
      form.reset();

    } catch (e) {
      console.error("Verification error:", e);
      toast({ title: "Verification Error", description: "Could not process the code. Please try again.", variant: "destructive" });
      setLoading(false);
    }
  };


  return (
    <div className="container mx-auto py-10 flex justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Verify Attendance Code</CardTitle>
          <CardDescription>Enter the 4-digit code provided by the member or trainer to mark their attendance.</CardDescription>
        </CardHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Enter Code</FormLabel>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <FormControl>
                                <Input placeholder="1234" {...field} className="pl-10 text-2xl h-14 tracking-[1em] text-center" maxLength={4} />
                                </FormControl>
                            </div>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    {lastVerified && (
                        <div className="p-4 rounded-md bg-green-500/10 text-green-700 flex items-center gap-4">
                            <CheckCircle className="h-6 w-6"/>
                            <div>
                                <p className="font-bold">{lastVerified.userName}</p>
                                <p className="text-sm">Verified at {lastVerified.scanTime}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex-col gap-4">
                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? <Loader2 className="animate-spin" /> : 'Verify & Mark Attendance'}
                    </Button>
                    <Link href="/dashboard/owner" passHref>
                        <Button variant="link" className="text-muted-foreground">
                            <ArrowLeft className="mr-2 h-4 w-4"/>
                            Back to Dashboard
                        </Button>
                    </Link>
                </CardFooter>
            </form>
        </Form>
      </Card>
    </div>
  );
}
