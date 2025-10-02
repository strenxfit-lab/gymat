
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, Timestamp, query, orderBy, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft, IndianRupee, HandCoins } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

type SettlementStatus = 'Pending' | 'Completed' | 'Failed';

interface Settlement {
  id: string;
  amount: number;
  status: SettlementStatus;
  requestedAt: string;
  transactionId?: string;
}

const settlementRequestSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than zero."),
});
type SettlementRequestFormData = z.infer<typeof settlementRequestSchema>;

const getStatusVariant = (status: SettlementStatus) => {
    switch(status) {
        case 'Pending': return 'secondary';
        case 'Completed': return 'default';
        case 'Failed': return 'destructive';
        default: return 'outline';
    }
}

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [withdrawableBalance, setWithdrawableBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<SettlementRequestFormData>({
    resolver: zodResolver(settlementRequestSchema),
    defaultValues: { amount: 0 },
  });

  const fetchSettlements = async () => {
    setLoading(true);
    const userDocId = localStorage.getItem('userDocId');
    if (!userDocId) {
      setLoading(false);
      return;
    }

    try {
      const branchesCollection = collection(db, 'gyms', userDocId, 'branches');
      const branchesSnap = await getDocs(branchesCollection);
      
      let totalRevenue = 0;
      for (const branchDoc of branchesSnap.docs) {
        const paymentsQuery = query(collection(branchDoc.ref, 'payments'));
        const paymentsSnap = await getDocs(paymentsQuery);
        paymentsSnap.forEach(paymentDoc => {
            totalRevenue += paymentDoc.data().amountPaid || 0;
        });
      }

      const settlementsCollection = collection(db, 'gyms', userDocId, 'settlements');
      const q = query(settlementsCollection, orderBy('requestedAt', 'desc'));
      const settlementsSnap = await getDocs(q);
      
      const settlementsList = settlementsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        requestedAt: (doc.data().requestedAt as Timestamp).toDate().toLocaleString(),
      } as Settlement));
      setSettlements(settlementsList);

      const totalSettled = settlementsList
        .filter(s => s.status === 'Completed')
        .reduce((sum, s) => sum + s.amount, 0);
      
      setWithdrawableBalance(totalRevenue - totalSettled);

    } catch (error) {
      console.error("Error fetching settlements:", error);
      toast({ title: "Error", description: "Could not fetch settlements data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, [toast]);
  
  const onRequestSubmit = async (data: SettlementRequestFormData) => {
    if (data.amount > withdrawableBalance) {
        form.setError("amount", { type: "manual", message: "Cannot request more than withdrawable balance."});
        return;
    }

    const userDocId = localStorage.getItem('userDocId');
    if (!userDocId) return;

    try {
        const settlementsCollection = collection(db, 'gyms', userDocId, 'settlements');
        await addDoc(settlementsCollection, {
            amount: data.amount,
            status: 'Pending',
            requestedAt: serverTimestamp(),
        });
        toast({ title: 'Request Sent!', description: 'Your settlement request has been submitted for processing.'});
        setIsRequestDialogOpen(false);
        form.reset();
        await fetchSettlements();
    } catch (error) {
        console.error("Error requesting settlement:", error);
        toast({ title: "Error", description: "Could not submit your request.", variant: "destructive" });
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Settlements</h1>
          <p className="text-muted-foreground">View your settlement history and request new payouts.</p>
        </div>
        <Link href="/dashboard/owner" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="md:col-span-1">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><IndianRupee/> Withdrawable Balance</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-4xl font-bold">₹{withdrawableBalance.toLocaleString()}</p>
                <DialogTrigger asChild>
                    <Button className="mt-4 w-full">
                        <HandCoins className="mr-2"/> Request Settlement
                    </Button>
                </DialogTrigger>
            </CardContent>
        </Card>
        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle>Settlement History</CardTitle>
                <CardDescription>A log of all your past and pending settlement requests.</CardDescription>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transaction ID</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {settlements.length > 0 ? (
                    settlements.map((s) => (
                    <TableRow key={s.id}>
                        <TableCell>{s.requestedAt}</TableCell>
                        <TableCell className="font-medium">₹{s.amount.toLocaleString()}</TableCell>
                        <TableCell><Badge variant={getStatusVariant(s.status)}>{s.status}</Badge></TableCell>
                        <TableCell>{s.transactionId || 'N/A'}</TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        No settlement history found.
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
      </div>
    </div>

    <DialogContent>
        <DialogHeader>
            <DialogTitle>Request a New Settlement</DialogTitle>
            <DialogDescription>Enter the amount you wish to withdraw. This amount cannot exceed your withdrawable balance.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onRequestSubmit)} className="space-y-4 py-4">
            <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Amount to Withdraw (₹)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
             <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsRequestDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Submit Request'}
                </Button>
            </DialogFooter>
        </form>
        </Form>
    </DialogContent>

    </Dialog>
  );
}
