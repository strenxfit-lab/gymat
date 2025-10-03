"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, collection, getDocs, Timestamp, query, where, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, User, Users, CalendarCheck, CalendarX, IndianRupee, HandCoins } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { startOfMonth, getDaysInMonth, isWithinInterval } from 'date-fns';

interface Trainer {
  fullName: string;
  salaryRate: string;
}

interface AssignedMember {
  fullName: string;
}

interface Settlement {
    id: string;
    month: string;
    year: number;
    salary: number;
    commission: number;
    total: number;
    status: 'Paid' | 'Unpaid';
    settledAt: string;
}

const settlementSchema = z.object({
    salary: z.coerce.number().min(0),
    commission: z.coerce.number().min(0),
    status: z.enum(['Paid', 'Unpaid']),
});
type SettlementFormData = z.infer<typeof settlementSchema>;


export default function TrainerSettlementDetailPage() {
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [assignedMembers, setAssignedMembers] = useState<AssignedMember[]>([]);
  const [attendance, setAttendance] = useState({ present: 0, absent: 0 });
  const [settlementHistory, setSettlementHistory] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const { trainerId } = params;
  const { toast } = useToast();

  const form = useForm<SettlementFormData>({
    resolver: zodResolver(settlementSchema),
    defaultValues: { salary: 0, commission: 0, status: 'Unpaid' },
  });

  const totalAmount = (form.watch('salary') || 0) + (form.watch('commission') || 0);

  useEffect(() => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');

    if (!userDocId || !activeBranchId || !trainerId) {
      toast({ title: "Error", description: "Invalid session or IDs.", variant: "destructive" });
      router.push('/dashboard/owner/settlement/trainer-settlement');
      return;
    }

    const fetchData = async () => {
      try {
        const trainerRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers', trainerId as string);
        const trainerSnap = await getDoc(trainerRef);
        if (trainerSnap.exists()) {
            const data = trainerSnap.data();
            setTrainer({ fullName: data.fullName, salaryRate: data.salaryRate });
            form.setValue('salary', parseFloat(data.salaryRate) || 0);
        }

        const membersQuery = query(collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'members'), where('assignedTrainer', '==', trainerId));
        const membersSnap = await getDocs(membersQuery);
        setAssignedMembers(membersSnap.docs.map(d => ({ fullName: d.data().fullName })));
        
        const now = new Date();
        const monthStart = startOfMonth(now);
        const daysInMonth = getDaysInMonth(now);

        const attendanceQuery = query(collection(db, 'attendance'), where('userId', '==', trainerId));
        const attendanceSnap = await getDocs(attendanceQuery);
        
        const monthlyAttendanceDocs = attendanceSnap.docs.filter(doc => {
            const data = doc.data();
            const scanTime = (data.scanTime as Timestamp).toDate();
            return data.branchId === activeBranchId && isWithinInterval(scanTime, { start: monthStart, end: now });
        });

        const presentDays = new Set(monthlyAttendanceDocs.map(d => d.data().scanTime.toDate().getDate())).size;
        setAttendance({ present: presentDays, absent: daysInMonth - presentDays });

        const settlementsRef = collection(trainerRef, 'settlements');
        const settlementsSnap = await getDocs(query(settlementsRef, orderBy('settledAt', 'desc')));
        setSettlementHistory(settlementsSnap.docs.map(d => ({ id: d.id, ...d.data(), settledAt: d.data().settledAt.toDate().toLocaleDateString() } as Settlement)));

      } catch (error) {
        console.error("Error fetching trainer settlement data:", error);
        toast({ title: "Error", description: "Could not fetch trainer settlement data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [trainerId, router, toast, form]);

  const onSubmit = async (data: SettlementFormData) => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId || !trainerId) return;

    try {
        const now = new Date();
        const trainerRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers', trainerId as string);
        const settlementsCollection = collection(trainerRef, 'settlements');
        
        await addDoc(settlementsCollection, {
            ...data,
            total: totalAmount,
            month: now.toLocaleString('default', { month: 'long' }),
            year: now.getFullYear(),
            settledAt: serverTimestamp(),
        });
        toast({ title: "Success", description: "Settlement has been recorded."});
        router.push('/dashboard/owner/settlement/trainer-settlement');
    } catch(error) {
        console.error("Error recording settlement: ", error);
        toast({ title: "Error", description: "Failed to record settlement.", variant: "destructive" });
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!trainer) {
    return <div className="text-center p-8">Trainer not found.</div>;
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settlement for {trainer.fullName}</h1>
          <p className="text-muted-foreground">Process salary and commission for the current month.</p>
        </div>
        <Link href="/dashboard/owner/settlement/trainer-settlement" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back to List</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Create Settlement</CardTitle>
                </CardHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField control={form.control} name="salary" render={({ field }) => ( <FormItem><FormLabel>Salary (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name="commission" render={({ field }) => ( <FormItem><FormLabel>Commission (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            </div>
                            <div className="flex items-end gap-4">
                                <div className="flex-grow">
                                    <p className="text-sm font-medium text-muted-foreground">Total Payout</p>
                                    <p className="text-2xl font-bold">₹{totalAmount.toLocaleString()}</p>
                                </div>
                                 <FormField control={form.control} name="status" render={({ field }) => (
                                    <FormItem><FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent><SelectItem value="Paid">Paid</SelectItem><SelectItem value="Unpaid">Unpaid</SelectItem></SelectContent>
                                    </Select><FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                        </CardContent>
                        <CardContent>
                             <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Record Settlement'}
                            </Button>
                        </CardContent>
                    </form>
                </Form>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Settlement History</CardTitle>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow><TableHead>Date</TableHead><TableHead>Month/Year</TableHead><TableHead>Total Paid</TableHead><TableHead>Status</TableHead></TableRow>
                        </TableHeader>
                        <TableBody>
                            {settlementHistory.length > 0 ? settlementHistory.map(s => (
                                <TableRow key={s.id}>
                                    <TableCell>{s.settledAt}</TableCell>
                                    <TableCell>{s.month} {s.year}</TableCell>
                                    <TableCell>₹{s.total.toLocaleString()}</TableCell>
                                    <TableCell><Badge variant={s.status === 'Paid' ? 'default' : 'destructive'}>{s.status}</Badge></TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No settlement history.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>This Month's Attendance</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center p-4 border rounded-lg"><CalendarCheck className="h-6 w-6 text-primary mb-2"/><p className="text-2xl font-bold">{attendance.present}</p><p className="text-sm text-muted-foreground">Present</p></div>
                    <div className="flex flex-col items-center p-4 border rounded-lg"><CalendarX className="h-6 w-6 text-destructive mb-2"/><p className="text-2xl font-bold">{attendance.absent}</p><p className="text-sm text-muted-foreground">Absent</p></div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader><CardTitle>Assigned Members ({assignedMembers.length})</CardTitle></CardHeader>
                <CardContent>
                    <ul className="space-y-2 max-h-48 overflow-y-auto">
                        {assignedMembers.length > 0 ? assignedMembers.map((m, i) => <li key={i} className="text-sm flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground"/>{m.fullName}</li>) : <li className="text-sm text-muted-foreground">No members assigned.</li>}
                    </ul>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
