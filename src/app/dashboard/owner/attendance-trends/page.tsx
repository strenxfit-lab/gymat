
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, Timestamp, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, BarChart2, Users, Clock, TrendingUp, TrendingDown, UserX } from 'lucide-react';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, Legend } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { subMonths, startOfMonth, format, getDay, getHours } from 'date-fns';

interface AttendanceRecord {
    userId: string;
    scanTime: Date;
}

interface Member {
    id: string;
    name: string;
}

interface HourlyData {
    hour: string;
    visits: number;
}

interface DailyData {
    day: string;
    visits: number;
}

const StatCard = ({ title, value, change, icon }: { title: string, value: string, change?: string, icon: React.ReactNode }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {change && (
                <p className="text-xs text-muted-foreground">{change}</p>
            )}
        </CardContent>
    </Card>
)

export default function AttendanceTrendsPage() {
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [inactiveMembers, setInactiveMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState({
      today: 0,
      thisMonth: 0,
      lastMonth: 0,
      monthlyChange: 0,
  });
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
        const now = new Date();
        const sixtyDaysAgo = subMonths(now, 2);

        const attendanceQuery = query(collection(db, 'attendance'), where('branchId', '==', activeBranchId), where('scanTime', '>=', Timestamp.fromDate(sixtyDaysAgo)));
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const attendanceRecords: AttendanceRecord[] = attendanceSnapshot.docs.map(doc => ({
            userId: doc.data().userId,
            scanTime: (doc.data().scanTime as Timestamp).toDate(),
        }));
        
        const membersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'members');
        const membersSnapshot = await getDocs(membersCollection);
        const allMembers: Member[] = membersSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().fullName }));


        // --- Process Analytics ---
        const startOfThisMonth = startOfMonth(now);
        const startOfLastMonth = startOfMonth(subMonths(now, 1));
        
        const todayStr = format(now, 'yyyy-MM-dd');
        const todaysVisits = attendanceRecords.filter(r => format(r.scanTime, 'yyyy-MM-dd') === todayStr).length;
        const thisMonthVisits = attendanceRecords.filter(r => r.scanTime >= startOfThisMonth).length;
        const lastMonthVisits = attendanceRecords.filter(r => r.scanTime >= startOfLastMonth && r.scanTime < startOfThisMonth).length;
        const monthlyChange = lastMonthVisits > 0 ? ((thisMonthVisits - lastMonthVisits) / lastMonthVisits) * 100 : (thisMonthVisits > 0 ? 100 : 0);

        setStats({
            today: todaysVisits,
            thisMonth: thisMonthVisits,
            lastMonth: lastMonthVisits,
            monthlyChange: monthlyChange,
        });

        // Daily data for chart
        const dailyCounts: { [key: string]: number } = {};
        for (let i = 1; i <= now.getDate(); i++) {
           dailyCounts[i.toString()] = 0;
        }
        attendanceRecords.filter(r => r.scanTime >= startOfThisMonth).forEach(r => {
            const day = format(r.scanTime, 'd');
            dailyCounts[day]++;
        });
        setDailyData(Object.entries(dailyCounts).map(([day, visits]) => ({ day, visits })));

        // Hourly data for chart
        const hourlyCounts: number[] = Array(24).fill(0);
        attendanceRecords.filter(r => r.scanTime >= startOfThisMonth).forEach(r => {
            const hour = getHours(r.scanTime);
            hourlyCounts[hour]++;
        });
        setHourlyData(hourlyCounts.map((visits, hour) => ({ hour: `${hour}:00`, visits })));

        // Inactive members
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const memberAttendanceCount: { [key: string]: number } = {};
        attendanceRecords.filter(r => r.scanTime >= sevenDaysAgo).forEach(r => {
            memberAttendanceCount[r.userId] = (memberAttendanceCount[r.userId] || 0) + 1;
        });

        const inactive = allMembers.filter(member => (memberAttendanceCount[member.id] || 0) < 2);
        setInactiveMembers(inactive);

      } catch (error) {
        console.error("Error fetching attendance data:", error);
        toast({ title: "Error", description: "Failed to fetch attendance reports.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchAttendanceData();
  }, [toast]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Attendance Trends</h1>
          <p className="text-muted-foreground">Analyze member check-in patterns and behaviors.</p>
        </div>
        <Link href="/dashboard/owner" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Dashboard</Button>
        </Link>
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatCard title="Today's Visits" value={stats.today.toString()} icon={<Users className="h-4 w-4 text-muted-foreground"/>} />
            <StatCard title="This Month's Visits" value={stats.thisMonth.toLocaleString()} icon={<BarChart2 className="h-4 w-4 text-muted-foreground"/>} 
                change={
                    stats.monthlyChange !== 0 ? 
                    `${stats.monthlyChange > 0 ? '+' : ''}${stats.monthlyChange.toFixed(1)}% from last month` : 
                    "No change from last month"
                }
            />
            <StatCard title="Last Month's Visits" value={stats.lastMonth.toLocaleString()} icon={<BarChart2 className="h-4 w-4 text-muted-foreground"/>} />
            <StatCard title="Less Active Members" value={inactiveMembers.length.toString()} icon={<UserX className="h-4 w-4 text-muted-foreground"/>} change="Attended <2 times this week" />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>Daily Visits (This Month)</CardTitle>
                <CardDescription>Total member check-ins for each day of the current month.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyData}>
                        <XAxis dataKey="day" stroke="#888888" fontSize={12} />
                        <YAxis stroke="#888888" fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="visits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
         <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Peak Hour Analysis</CardTitle>
                <CardDescription>Busiest hours based on this month's check-ins.</CardDescription>
            </CardHeader>
            <CardContent>
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={hourlyData} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="hour" stroke="#888888" fontSize={10} width={40}/>
                        <Tooltip />
                        <Bar dataKey="visits" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>

       <Card className="mt-6">
        <CardHeader>
          <CardTitle>Less Active Members</CardTitle>
          <CardDescription>Members who have attended fewer than two times in the past 7 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inactiveMembers.length > 0 ? (
                inactiveMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={1} className="h-24 text-center">
                    All members have been active this week!
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
