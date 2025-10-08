
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, Timestamp, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Users, UserX, Clock, BarChart3, Calendar as CalendarIcon, UserCheck } from 'lucide-react';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, Legend } from 'recharts';
import { subDays, format, eachDayOfInterval, startOfToday, endOfToday, isSameDay } from 'date-fns';
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';

interface MonthlyChartData {
    name: string;
    present: number;
}

interface DailyAttendanceRecord {
    userName: string;
    scanTime: Date;
}

const StatCard = ({ title, value, change, icon, changeType }: { title: string, value: string, change?: string, icon: React.ReactNode, changeType?: 'increase' | 'decrease' }) => {
    const changeColor = changeType === 'increase' ? 'text-green-500' : 'text-red-500';
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {change && (
                    <p className={`text-xs ${changeColor}`}>{change}</p>
                )}
            </CardContent>
        </Card>
    );
}

export default function AttendanceDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [monthlyChartData, setMonthlyChartData] = useState<MonthlyChartData[]>([]);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState<{userId: string, userName: string, scanTime: Date}[]>([]);
  const [dailyAttendance, setDailyAttendance] = useState<DailyAttendanceRecord[]>([]);
  const [stats, setStats] = useState({
      presentToday: 0,
      absentToday: 0,
      overallAttendance: 0,
      lateToday: 0,
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { toast } = useToast();

  useEffect(() => {
    const fetchAttendanceData = async () => {
      setLoading(true);
      const userDocId = localStorage.getItem('userDocId');
      const activeBranchId = localStorage.getItem('activeBranch');

      if (!userDocId || !activeBranchId) {
        toast({ title: "Error", description: "Branch not selected.", variant: "destructive" });
        setLoading(false);
        return;
      }

      try {
        const thirtyDaysAgo = subDays(new Date(), 30);
        const todayStart = startOfToday();

        const membersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'members');
        const membersSnapshot = await getDocs(membersCollection);
        const membersMap = new Map<string, string>();
        membersSnapshot.docs.forEach(doc => membersMap.set(doc.id, doc.data().fullName));
        const activeMembers = membersSnapshot.docs.filter(doc => {
            const data = doc.data();
            const endDate = (data.endDate as Timestamp)?.toDate();
            return endDate && endDate >= new Date();
        }).length;

        const attendanceQuery = query(collection(db, 'attendance'), where('branchId', '==', activeBranchId));
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const attendanceRecords = attendanceSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                userId: data.userId,
                userName: membersMap.get(data.userId) || data.userName || 'Unknown',
                scanTime: (data.scanTime as Timestamp).toDate(),
            };
        }).filter(record => record.scanTime >= thirtyDaysAgo);
        setAllAttendanceRecords(attendanceRecords);
        
        const presentTodaySet = new Set<string>();
        attendanceRecords.forEach(r => {
            if (r.scanTime >= todayStart) {
                presentTodaySet.add(r.userId);
            }
        });
        const presentTodayCount = presentTodaySet.size;
        const absentTodayCount = activeMembers - presentTodayCount;
        
        const dailyCounts: { [key: string]: Set<string> } = {};
        const interval = eachDayOfInterval({ start: thirtyDaysAgo, end: new Date() });
        interval.forEach(day => {
            dailyCounts[format(day, 'MMM d')] = new Set();
        });

        attendanceRecords.forEach(r => {
            const dayKey = format(r.scanTime, 'MMM d');
            if (dailyCounts[dayKey]) {
                dailyCounts[dayKey].add(r.userId);
            }
        });

        const chartData = Object.entries(dailyCounts).map(([name, userSet]) => ({ name, present: userSet.size }));
        setMonthlyChartData(chartData);
        
        const totalPossibleAttendance = activeMembers * 30;
        const totalActualAttendanceUnique = Object.values(dailyCounts).reduce((acc, daySet) => acc + daySet.size, 0);
        const overallAttendancePercentage = totalPossibleAttendance > 0 ? (totalActualAttendanceUnique / totalPossibleAttendance) * 100 : 0;

        setStats({
            presentToday: presentTodayCount,
            absentToday: absentTodayCount < 0 ? 0 : absentTodayCount,
            overallAttendance: Math.round(overallAttendancePercentage),
            lateToday: 0,
        });

      } catch (error) {
        console.error("Error fetching attendance data:", error);
        toast({ title: "Error", description: "Failed to fetch attendance reports.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchAttendanceData();
  }, [toast]);

  useEffect(() => {
    if (selectedDate) {
      const dailyRecords = allAttendanceRecords.filter(record => 
        isSameDay(record.scanTime, selectedDate)
      );
      dailyRecords.sort((a, b) => a.scanTime.getTime() - b.scanTime.getTime());
      setDailyAttendance(dailyRecords);
    }
  }, [selectedDate, allAttendanceRecords]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Attendance Dashboard</h1>
          <p className="text-muted-foreground">View and manage member attendance.</p>
        </div>
        <Link href="/dashboard/owner" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Dashboard</Button>
        </Link>
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatCard title="Present Today" value={stats.presentToday.toString()} icon={<Users className="h-4 w-4 text-muted-foreground"/>} />
            <StatCard title="Absent Today" value={stats.absentToday.toString()} icon={<UserX className="h-4 w-4 text-muted-foreground"/>} />
            <StatCard title="Late Today" value={stats.lateToday.toString()} icon={<Clock className="h-4 w-4 text-muted-foreground"/>} />
            <StatCard title="Overall Attendance (30d)" value={`${stats.overallAttendance}%`} icon={<BarChart3 className="h-4 w-4 text-muted-foreground"/>} />
      </div>
      
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Monthly Attendance Trend</CardTitle>
                <CardDescription>A chart showing present members over the past 30 days.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyChartData}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} interval={3} />
                        <YAxis stroke="#888888" fontSize={12} />
                        <Tooltip contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                        <Bar dataKey="present" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
        <div className="space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle>Attendance Calendar</CardTitle>
                    <CardDescription>Select a date to view attendance log.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                     <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="rounded-md border"
                        disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                    />
                </CardContent>
            </Card>
        </div>
      </div>
      <Card className="mt-6">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserCheck /> Attendance Log for {selectedDate ? format(selectedDate, 'PPP') : 'Today'}</CardTitle>
            <CardDescription>Showing all members who checked in on the selected date.</CardDescription>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-72">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Member Name</TableHead>
                            <TableHead>Check-in Time</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {dailyAttendance.length > 0 ? (
                            dailyAttendance.map((record, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{record.userName}</TableCell>
                                    <TableCell>{format(record.scanTime, 'p')}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={2} className="h-24 text-center">
                                    No attendance records found for this date.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
