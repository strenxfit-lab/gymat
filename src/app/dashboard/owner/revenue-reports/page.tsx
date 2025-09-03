
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collectionGroup, getDocs, Timestamp, query, collection, getDoc, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, IndianRupee, TrendingUp, Calendar, BarChart3, Users, AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, Legend } from 'recharts';
import { startOfWeek, startOfMonth, eachMonthOfInterval, format } from 'date-fns';

interface Payment {
  id: string;
  memberName: string;
  memberPhone: string;
  amountPaid: number;
  paymentDate: Date;
  paymentMode: string;
}

interface PendingDue {
    memberName: string;
    memberPhone: string;
    amountDue: number;
}

interface MonthlyRevenue {
    name: string;
    revenue: number;
}

export default function RevenueReportsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pendingDues, setPendingDues] = useState<PendingDue[]>([]);
  const [loading, setLoading] = useState(true);
  const [todaysRevenue, setTodaysRevenue] = useState(0);
  const [thisWeeksRevenue, setThisWeeksRevenue] = useState(0);
  const [thisMonthsRevenue, setThisMonthsRevenue] = useState(0);
  const [totalPendingDues, setTotalPendingDues] = useState(0);
  const [monthlyChartData, setMonthlyChartData] = useState<MonthlyRevenue[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRevenueData = async () => {
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
        const memberDetails = membersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const allPayments: Payment[] = [];
        const allPendingDues: PendingDue[] = [];
        let totalDues = 0;

        for (const member of memberDetails) {
            const paymentsCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', member.id, 'payments');
            const paymentsQuery = query(paymentsCollection, orderBy('paymentDate', 'desc'));
            const paymentsSnap = await getDocs(paymentsQuery);
            
            if (!paymentsSnap.empty) {
                const latestPayment = paymentsSnap.docs[0].data();
                if (latestPayment.balanceDue > 0) {
                    allPendingDues.push({
                        memberName: member.fullName,
                        memberPhone: member.phone,
                        amountDue: latestPayment.balanceDue
                    });
                    totalDues += latestPayment.balanceDue;
                }
            }

            paymentsSnap.forEach(doc => {
                const data = doc.data();
                allPayments.push({
                    id: doc.id,
                    memberName: member.fullName,
                    memberPhone: member.phone,
                    amountPaid: data.amountPaid,
                    paymentDate: (data.paymentDate as Timestamp).toDate(),
                    paymentMode: data.paymentMode
                });
            });
        }
        
        allPayments.sort((a,b) => b.paymentDate.getTime() - a.paymentDate.getTime());
        setPayments(allPayments);
        setPendingDues(allPendingDues);
        setTotalPendingDues(totalDues);
        
        // Calculate stats
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfThisWeek = startOfWeek(now);
        const startOfThisMonth = startOfMonth(now);
        
        let today = 0, week = 0, month = 0;
        const monthlyTotals: Record<string, number> = {};
        
        allPayments.forEach(p => {
            if (p.paymentDate >= startOfToday) today += p.amountPaid;
            if (p.paymentDate >= startOfThisWeek) week += p.amountPaid;
            if (p.paymentDate >= startOfThisMonth) month += p.amountPaid;

            const monthKey = format(p.paymentDate, 'MMM yyyy');
            monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + p.amountPaid;
        });

        setTodaysRevenue(today);
        setThisWeeksRevenue(week);
        setThisMonthsRevenue(month);

        const lastSixMonths = eachMonthOfInterval({
            start: new Date(now.getFullYear(), now.getMonth() - 5, 1),
            end: now
        });

        const chartData = lastSixMonths.map(monthDate => {
            const monthKey = format(monthDate, 'MMM yyyy');
            return {
                name: format(monthDate, 'MMM'),
                revenue: monthlyTotals[monthKey] || 0
            };
        });
        setMonthlyChartData(chartData);

      } catch (error) {
        console.error("Error fetching revenue data:", error);
        toast({ title: "Error", description: "Failed to fetch revenue reports.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchRevenueData();
  }, [toast]);
  
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Revenue Reports</h1>
          <p className="text-muted-foreground">Track your gym's financial performance.</p>
        </div>
        <Link href="/dashboard/owner" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Dashboard</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">₹{todaysRevenue.toLocaleString()}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Week's Revenue</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">₹{thisWeeksRevenue.toLocaleString()}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month's Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">₹{thisMonthsRevenue.toLocaleString()}</div>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pending Dues</CardTitle>
                <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-destructive">₹{totalPendingDues.toLocaleString()}</div>
            </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full lg:col-span-4">
            <CardHeader>
                <CardTitle>Monthly Revenue Trend (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={monthlyChartData}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value/1000}k`} />
                        <Tooltip contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
        <Card className="col-span-full lg:col-span-3">
            <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>A log of all payments received.</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[350px] overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Member</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payments.length > 0 ? (
                            payments.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium">{p.memberName}</TableCell>
                                    <TableCell>₹{p.amountPaid.toLocaleString()}</TableCell>
                                    <TableCell>{p.paymentDate.toLocaleDateString()}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">No payments found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
       <Card className="mt-6">
        <CardHeader>
          <CardTitle>Outstanding Payments</CardTitle>
          <CardDescription>A list of all members with pending dues.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Amount Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingDues.length > 0 ? (
                pendingDues.map((due, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{due.memberName}</TableCell>
                    <TableCell>{due.memberPhone}</TableCell>
                    <TableCell className="text-destructive font-medium">₹{due.amountDue.toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No outstanding payments. Great job!
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

    