
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, Timestamp, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, CheckCircle, Calendar, IndianRupee } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { differenceInDays } from 'date-fns';

interface Payment {
  id: string;
  amountPaid: number;
  paymentDate: string;
  paymentMode: string;
  nextDueDate: string;
  balanceDue: number;
}

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    const memberId = localStorage.getItem('memberId');

    if (!userDocId || !activeBranchId || !memberId) {
      toast({ title: "Error", description: "Session invalid. Please log in again.", variant: "destructive" });
      router.push('/');
      return;
    }

    const fetchPaymentHistory = async () => {
        try {
            const memberRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', memberId);
            const memberSnap = await getDoc(memberRef);
            if(memberSnap.exists()) {
                const memberData = memberSnap.data();
                const lastPaymentDate = (memberData.lastPaymentDate as Timestamp)?.toDate();
                if (lastPaymentDate && differenceInDays(new Date(), lastPaymentDate) < 1) {
                    setShowSuccessMessage(true);
                }
            }


            const paymentsCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', memberId, 'payments');
            const paymentsQuery = query(paymentsCollection, orderBy('paymentDate', 'desc'));
            const paymentsSnapshot = await getDocs(paymentsQuery);

            const paymentsList = paymentsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    amountPaid: data.amountPaid,
                    paymentDate: (data.paymentDate as Timestamp).toDate().toLocaleDateString(),
                    paymentMode: data.paymentMode,
                    nextDueDate: (data.nextDueDate as Timestamp).toDate().toLocaleDateString(),
                    balanceDue: data.balanceDue,
                };
            });
            setPayments(paymentsList);
        } catch (error) {
            console.error("Error fetching payment history:", error);
            toast({ title: "Error", description: "Failed to fetch payment history.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    fetchPaymentHistory();
  }, [router, toast]);
  

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
        <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-3xl font-bold">Payment History</h1>
                <p className="text-muted-foreground">A record of all your past payments.</p>
            </div>
            <Link href="/dashboard/member" passHref>
                <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Button>
            </Link>
        </div>

        {showSuccessMessage && (
            <Alert className="mb-6 border-green-500 text-green-700">
                <CheckCircle className="h-4 w-4 !text-green-700" />
                <AlertTitle className="text-green-700 font-bold">Woohoo! Payment successful!</AlertTitle>
                <AlertDescription className="text-green-600">
                    Thank you for your payment. Your membership has been updated.
                </AlertDescription>
            </Alert>
        )}

        <Card>
            <CardHeader>
                <CardTitle>My Payments</CardTitle>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Payment Date</TableHead>
                            <TableHead>Amount Paid</TableHead>
                            <TableHead>Payment Mode</TableHead>
                            <TableHead>Next Due Date</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payments.length > 0 ? (
                            payments.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium flex items-center gap-2"><Calendar className="h-4 w-4"/>{p.paymentDate}</TableCell>
                                    <TableCell><span className="font-semibold flex items-center gap-1"><IndianRupee className="h-4 w-4"/>{p.amountPaid.toLocaleString()}</span></TableCell>
                                    <TableCell>{p.paymentMode}</TableCell>
                                    <TableCell>{p.nextDueDate}</TableCell>
                                    <TableCell>
                                        <Badge variant={p.balanceDue > 0 ? "destructive" : "default"}>
                                            {p.balanceDue > 0 ? `Due: ₹${p.balanceDue}` : 'Paid'}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    You have no payment history yet.
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
