
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, query, where, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, KeyRound, Timer } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const CODE_EXPIRY_MINUTES = 5;

export default function GenerateAttendanceCodePage() {
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [expiryTime, setExpiryTime] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!expiryTime || !generatedCode) return;

    const interval = setInterval(() => {
        const now = new Date();
        const diff = expiryTime.getTime() - now.getTime();
        if (diff <= 0) {
            setTimeLeft('Expired');
            clearInterval(interval);
            setGeneratedCode(null);
            toast({ title: "Code Expired", description: "Your attendance code has expired. Please generate a new one.", variant: "destructive"});
        } else {
            const minutes = Math.floor(diff / 60000);
            const seconds = ((diff % 60000) / 1000).toFixed(0).padStart(2, '0');
            setTimeLeft(`${minutes}:${seconds}`);
        }
    }, 1000);

    return () => clearInterval(interval);

  }, [expiryTime, generatedCode, toast]);

  const generateCode = async () => {
    setLoading(true);
    const userRole = localStorage.getItem('userRole');
    const userId = localStorage.getItem(userRole === 'member' ? 'memberId' : 'trainerId');
    const userName = localStorage.getItem('userName');
    const userPhone = localStorage.getItem('userPhone');
    const gymId = localStorage.getItem('userDocId');
    const branchId = localStorage.getItem('activeBranch');

    if (!userRole || !userId || !gymId || !branchId) {
      toast({ title: "Error", description: "Your session is invalid. Please log in again.", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
        const codesCollection = collection(db, 'attendanceCodes');
        const q = query(codesCollection, where("userId", "==", userId));
        const existingCodes = await getDocs(q);
        if (!existingCodes.empty) {
            const batch = writeBatch(db);
            existingCodes.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        const code = Math.floor(1000 + Math.random() * 9000).toString();
        const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

        await addDoc(codesCollection, {
            code,
            userId,
            userName,
            userPhone,
            userRole,
            gymId,
            branchId,
            expiresAt: Timestamp.fromDate(expiresAt),
        });

        setGeneratedCode(code);
        setExpiryTime(expiresAt);
        setLoading(false);

    } catch (error) {
        console.error("Error generating code:", error);
        toast({ title: "Error", description: "Could not generate a code. Please try again.", variant: "destructive" });
        setLoading(false);
    }
  };
  
  const getBackLink = () => {
    const role = localStorage.getItem('userRole');
    if (role === 'member') return '/dashboard/member';
    if (role === 'trainer') return '/dashboard/trainer';
    return '/';
  }


  return (
    <div className="container mx-auto py-10 flex justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Manual Attendance</CardTitle>
          <CardDescription>Generate a one-time code and show it at the reception to mark your attendance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {generatedCode ? (
                <div className="text-center space-y-4">
                    <p className="text-muted-foreground">Your code is:</p>
                    <div className="p-4 bg-muted rounded-lg">
                        <p className="text-6xl font-bold tracking-widest">{generatedCode}</p>
                    </div>
                    <Alert>
                        <Timer className="h-4 w-4"/>
                        <AlertTitle>Expires In: {timeLeft}</AlertTitle>
                        <AlertDescription>This code is valid for {CODE_EXPIRY_MINUTES} minutes.</AlertDescription>
                    </Alert>
                    <Button onClick={() => setGeneratedCode(null)}>Done</Button>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-4">
                    <KeyRound className="h-20 w-20 text-primary p-4 bg-primary/10 rounded-full"/>
                    <Button onClick={generateCode} disabled={loading} size="lg">
                        {loading ? <Loader2 className="animate-spin" /> : 'Generate My Code'}
                    </Button>
                </div>
            )}
             <Button variant="outline" className="w-full" onClick={() => router.push(getBackLink())}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
