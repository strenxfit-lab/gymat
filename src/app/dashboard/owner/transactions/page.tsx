"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, Timestamp, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Users, IndianRupee } from 'lucide-react';
import { startOfWeek, startOfMonth, endOfWeek, format, eachDayOfInterval } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, BarChart, XAxis, Tooltip, Bar } from 'recharts';


interface Payment {
  id: string;
  memberName: string;
  amount: number;
  method: string;
  date: string;
  status: 'Paid' | 'Balance Due';
}

interface Member {
    id: string;
    fullName: string;
    status: 'Active' | 'Expired' | 'Pending' | 'Frozen' | 'Stopped';
    endDate?: Date;
}

interface WeeklyChartData {
    name: string;
    total: number;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [activeMembers, setActiveMembers] = useState(0);
  const [weeklyTransactions, setWeeklyTransactions] = useState(0);
  const [weeklyUsers, setWeeklyUsers] = useState(0);
  const [weeklyChartData, setWeeklyChartData] = useState<WeeklyChartData[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTransactionData = async () => {
      setLoading(true);
      const userDocId = localStorage.getItem('userDocId');
      const activeBranchId = localStorage.getItem('activeBranch');

      if (!userDocId || !activeBranchId) {
        toast({ title: "Error", description: "Branch not selected.", variant: "destructive" });
        setLoading(false);
        return;
      }

      try {
        const membersRef = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'members');
        const membersSnap = await getDocs(membersRef);
        const allMembers = membersSnap.docs.map(doc => ({ id: doc.id, fullName: doc.data().fullName, endDate: doc.data().endDate?.toDate() } as Member));
        
        const now = new Date();
        const active = allMembers.filter(m => m.endDate && m.endDate >= now).length;
        setActiveMembers(active);

        const allPayments: Payment[] = [];
        let weeklyTxCount = 0;
        const weeklyUserSet = new Set<string>();

        const startOfMonthDate = startOfMonth(now);
        const startOfWeekDate = startOfWeek(now);
        const endOfWeekDate = endOfWeek(now);

        const weekDays = eachDayOfInterval({ start: startOfWeekDate, end: endOfWeekDate });
        const dailyTotals = weekDays.map(day => ({ name: format(day, 'EEE'), total: 0 }));

        for (const member of allMembers) {
            const paymentsCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', member.id, 'payments');
            const paymentsQuery = query(paymentsCollection, where('paymentDate', '>=', startOfMonthDate));
            const paymentsSnap = await getDocs(paymentsQuery);

            paymentsSnap.forEach(doc => {
                const data = doc.data();
                const paymentDate = (data.paymentDate as Timestamp).toDate();
                
                allPayments.push({
                    id: doc.id,
                    memberName: member.fullName,
                    amount: data.amountPaid,
                    method: data.paymentMode,
                    date: paymentDate.toLocaleDateString(),
                    status: data.balanceDue > 0 ? 'Balance Due' : 'Paid',
                });
                
                if(paymentDate >= startOfWeekDate && paymentDate <= endOfWeekDate) {
                    weeklyTxCount++;
                    weeklyUserSet.add(member.id);
                    const dayIndex = weekDays.findIndex(day => format(day, 'yyyy-MM-dd') === format(paymentDate, 'yyyy-MM-dd'));
                    if (dayIndex !== -1) {
                        dailyTotals[dayIndex].total += data.amountPaid;
                    }
                }
            });
        }
        
        allPayments.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setTransactions(allPayments);
        setTotalTransactions(allPayments.length);
        setWeeklyTransactions(weeklyTxCount);
        setWeeklyUsers(weeklyUserSet.size);
        setWeeklyChartData(dailyTotals);

      } catch (error) {
        console.error("Error fetching transaction data:", error);
        toast({ title: "Error", description: "Failed to fetch transaction reports.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchTransactionData();
  }, [toast]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">All Transactions</h1>
          <p className="text-muted-foreground">View and manage all payment transactions.</p>
        </div>
        <Link href="/dashboard/owner" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Dashboard</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>Total payments recorded this month.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div className="text-4xl font-bold flex items-center gap-2"><IndianRupee className="h-8 w-8"/>{totalTransactions}</div>
            <div className="text-right">
                <p className="text-sm text-muted-foreground">Active Members</p>
                <p className="font-bold flex items-center gap-1"><Users className="h-4 w-4"/>{activeMembers}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Weekly Transactions</CardTitle>
              <CardDescription>Summary of this week's transactions.</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Transactions</p>
              <p className="font-bold flex items-center gap-1"><IndianRupee className="h-4 w-4"/>{weeklyTransactions}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Users</p>
              <p className="font-bold flex items-center gap-1"><Users className="h-4 w-4"/>{weeklyUsers}</p>
            </div>
          </CardHeader>
          <CardContent className="h-[100px] -mt-4">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Transaction Log</CardTitle>
          <CardDescription>A detailed list of all payments recorded this month.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member Name</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length > 0 ? (
                transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">{tx.memberName}</TableCell>
                    <TableCell>₹{tx.amount.toLocaleString()}</TableCell>
                    <TableCell>{tx.method}</TableCell>
                    <TableCell>{tx.date}</TableCell>
                    <TableCell>
                      <Badge variant={tx.status === 'Paid' ? 'default' : 'destructive'}>{tx.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No transactions recorded this month.
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
