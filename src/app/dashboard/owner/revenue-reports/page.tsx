
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collectionGroup, getDocs, Timestamp, query, collection, getDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, IndianRupee, TrendingUp, Calendar, BarChart3, Users } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, Legend } from 'recharts';
import { startOfWeek, startOfMonth, endOfMonth, eachMonthOfInterval, format } from 'date-fns';

interface Payment {
  id: string;
  memberName: string;
  memberPhone: string;
  amountPaid: number;
  paymentDate: Date;
  paymentMode: string;
}

interface MonthlyRevenue {
    name: string;
    revenue: number;
}

export default function RevenueReportsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [todaysRevenue, setTodaysRevenue] = useState(0);
  const [thisWeeksRevenue, setThisWeeksRevenue] = useState(0);
  const [thisMonthsRevenue, setThisMonthsRevenue] = useState(0);
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

        const paymentsQuery = query(collectionGroup(db, 'payments'), where('__name__', '>', `gyms/${userDocId}/branches/${activeBranchId}/`));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        
        const allPayments: Payment[] = [];

        paymentsSnapshot.forEach(doc => {
            // Further client-side filtering because collectionGroup query is broad
            const path = doc.ref.path;
            if (path.startsWith(`gyms/${userDocId}/branches/${activeBranchId}/members/`)) {
                const data = doc.data();
                const member = memberDetails.find(m => path.includes(m.id));
                allPayments.push({
                    id: doc.id,
                    memberName: member?.fullName || 'Unknown Member',
                    memberPhone: member?.phone || 'N/A',
                    amountPaid: data.amountPaid,
                    paymentDate: (data.paymentDate as Timestamp).toDate(),
                    paymentMode: data.paymentMode
                });
            }
        });
        
        allPayments.sort((a,b) => b.paymentDate.getTime() - a.paymentDate.getTime());
        setPayments(allPayments);
        
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

      <div className="grid gap-4 md:grid-cols-3 mb-6">
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
    </div>
  );
}
