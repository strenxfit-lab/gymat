"use client";

import { useState } from 'react';
import Link from 'next/link';
import { collection, getDocs, Timestamp, query, where, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, IndianRupee, TrendingUp, TrendingDown, Users, Percent } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { addDays, format, startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval } from 'date-fns';

interface ReportData {
    totalRevenue: number;
    totalExpenses: number;
    monthlyBreakdown: MonthlyBreakdown[];
}

interface MonthlyBreakdown {
    month: string;
    revenue: number;
    expenses: number;
    newMembers: number;
    attendancePercentage: number;
}

const StatCard = ({ title, value, icon, isCurrency = true }: { title: string, value: number, icon: React.ReactNode, isCurrency?: boolean }) => {
    const isNegative = value < 0;
    const colorClass = isNegative ? 'text-destructive' : 'text-primary';
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${isCurrency ? colorClass : ''}`}>
                    {isCurrency ? `₹${Math.abs(value).toLocaleString()}` : value}{!isCurrency && title.includes('Attendance') ? '%' : ''}
                </div>
            </CardContent>
        </Card>
    );
};


export default function CustomReportPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    if (!dateRange || !dateRange.from || !dateRange.to) {
        toast({ title: "Invalid Date Range", description: "Please select a start and end date.", variant: "destructive" });
        return;
    }
    setLoading(true);
    setReportData(null);
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');

    if (!userDocId || !activeBranchId) {
        toast({ title: "Error", description: "Branch not selected.", variant: "destructive" });
        setLoading(false);
        return;
    }

    try {
        const from = Timestamp.fromDate(dateRange.from);
        const to = Timestamp.fromDate(dateRange.to);

        // 1. Fetch Payments
        const paymentsQuery = query(collectionGroup(db, 'payments'), where('gymId', '==', userDocId), where('branchId', '==', activeBranchId), where('paymentDate', '>=', from), where('paymentDate', '<=', to));
        const paymentsSnap = await getDocs(paymentsQuery);
        const allPayments = paymentsSnap.docs.map(doc => ({ ...doc.data(), paymentDate: (doc.data().paymentDate as Timestamp).toDate() }));

        // 2. Fetch Expenses
        const expensesQuery = query(collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'expenses'), where('date', '>=', from), where('date', '<=', to));
        const expensesSnap = await getDocs(expensesQuery);
        const allExpenses = expensesSnap.docs.map(doc => ({ ...doc.data(), date: (doc.data().date as Timestamp).toDate() }));

        // 3. Fetch Members
        const membersQuery = query(collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'members'));
        const membersSnap = await getDocs(membersQuery);
        const allMembers = membersSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: (doc.data().createdAt as Timestamp).toDate() }));
        const activeMembersInRange = allMembers.filter(m => m.endDate && (m.endDate as Timestamp).toDate() >= dateRange.from!).length;


        // 4. Fetch Attendance
        const attendanceQuery = query(collection(db, 'attendance'), where('gymId', '==', userDocId), where('branchId', '==', activeBranchId), where('scanTime', '>=', from), where('scanTime', '<=', to));
        const attendanceSnap = await getDocs(attendanceQuery);
        const allAttendance = attendanceSnap.docs.map(doc => ({ ...doc.data(), scanTime: (doc.data().scanTime as Timestamp).toDate() }));

        // 5. Process Data
        let totalRevenue = 0;
        let totalExpenses = 0;
        const monthlyData: Record<string, Omit<MonthlyBreakdown, 'month'>> = {};

        const months = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
        months.forEach(month => {
            const monthKey = format(month, 'MMM yyyy');
            monthlyData[monthKey] = { revenue: 0, expenses: 0, newMembers: 0, attendancePercentage: 0 };
        });

        allPayments.forEach(p => {
            totalRevenue += p.amountPaid;
            const monthKey = format(p.paymentDate, 'MMM yyyy');
            if (monthlyData[monthKey]) {
                monthlyData[monthKey].revenue += p.amountPaid;
            }
        });

        allExpenses.forEach(e => {
            totalExpenses += e.amount;
            const monthKey = format(e.date, 'MMM yyyy');
            if (monthlyData[monthKey]) {
                monthlyData[monthKey].expenses += e.amount;
            }
        });

        allMembers.forEach(m => {
            if (isWithinInterval(m.createdAt, { start: dateRange.from!, end: dateRange.to! })) {
                const monthKey = format(m.createdAt, 'MMM yyyy');
                if (monthlyData[monthKey]) {
                    monthlyData[monthKey].newMembers++;
                }
            }
        });
        
        Object.keys(monthlyData).forEach(monthKey => {
            const monthDate = new Date(monthKey);
            const start = startOfMonth(monthDate);
            const end = endOfMonth(monthDate);
            const daysInMonth = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;
            
            const uniqueCheckinsThisMonth = new Set(
                allAttendance
                    .filter(a => isWithinInterval(a.scanTime, { start, end }))
                    .map(a => `${a.userId}-${format(a.scanTime, 'yyyy-MM-dd')}`)
            ).size;
            
            const possibleAttendance = activeMembersInRange * daysInMonth;
            monthlyData[monthKey].attendancePercentage = possibleAttendance > 0 ? Math.round((uniqueCheckinsThisMonth / possibleAttendance) * 100) : 0;
        });

        const monthlyBreakdown = Object.entries(monthlyData).map(([month, data]) => ({ month, ...data }));
        
        setReportData({
            totalRevenue,
            totalExpenses,
            monthlyBreakdown,
        });

    } catch (error) {
        console.error("Error generating report:", error);
        toast({ title: "Error", description: "Failed to generate the report. Please check the Firestore indexes if prompted.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Custom Report</h1>
          <p className="text-muted-foreground">Generate a detailed report for a specific period.</p>
        </div>
        <Link href="/dashboard/owner" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Dashboard</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Select Date Range</CardTitle>
            <CardDescription>Choose a start and end date to generate your report.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
           <DateRangePicker date={dateRange} setDate={setDateRange} />
            <Button onClick={handleGenerateReport} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Generate Report
            </Button>
        </CardContent>
      </Card>
      
      {reportData && (
          <Card>
            <CardHeader>
                <CardTitle>Generated Report</CardTitle>
                <CardDescription>Showing data from {dateRange?.from?.toLocaleDateString()} to {dateRange?.to?.toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                    <StatCard title="Total Revenue" value={reportData.totalRevenue} icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} />
                    <StatCard title="Total Expenses" value={-reportData.totalExpenses} icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />} />
                    <StatCard title="Total Net Profit/Loss" value={reportData.totalRevenue - reportData.totalExpenses} icon={<IndianRupee className="h-4 w-4 text-muted-foreground" />} />
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Month</TableHead>
                            <TableHead>Revenue</TableHead>
                            <TableHead>Expenses</TableHead>
                            <TableHead>Profit/Loss</TableHead>
                            <TableHead>New Members</TableHead>
                            <TableHead>Attendance %</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reportData.monthlyBreakdown.map(row => (
                            <TableRow key={row.month}>
                                <TableCell className="font-medium">{row.month}</TableCell>
                                <TableCell>₹{row.revenue.toLocaleString()}</TableCell>
                                <TableCell>₹{row.expenses.toLocaleString()}</TableCell>
                                <TableCell className={row.revenue - row.expenses >= 0 ? 'text-primary' : 'text-destructive'}>
                                    ₹{(row.revenue - row.expenses).toLocaleString()}
                                </TableCell>
                                <TableCell>{row.newMembers}</TableCell>
                                <TableCell>{row.attendancePercentage}%</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>
      )}

    </div>
  );
}

// A basic date range picker component. You might need to install react-day-picker and date-fns.
// This is a placeholder for the actual component from shadcn/ui.
// For the purpose of this example, let's assume `DateRangePicker` exists and works.
// In a real scenario, this would be `src/components/ui/date-range-picker.tsx`

