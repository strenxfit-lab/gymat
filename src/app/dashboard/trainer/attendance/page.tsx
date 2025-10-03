
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Loader2, ArrowLeft, BarChart3 } from 'lucide-react';
import { isSameDay, eachDayOfInterval, isWeekend, format } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface AttendanceReport {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    attendancePercentage: number;
}

export default function TrainerAttendancePage() {
    const [attendanceDates, setAttendanceDates] = useState<Date[]>([]);
    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState<AttendanceReport | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const fetchAttendance = async () => {
            const trainerId = localStorage.getItem('trainerId');
            if (!trainerId) {
                toast({ title: "Error", description: "Session invalid. Please log in again.", variant: "destructive" });
                router.push('/');
                return;
            }

            try {
                const attendanceRef = collection(db, 'attendance');
                const q = query(attendanceRef, where("userId", "==", trainerId));
                const querySnapshot = await getDocs(q);
                const dates = querySnapshot.docs.map(doc => (doc.data().scanTime as Timestamp).toDate());
                setAttendanceDates(dates);
            } catch (error) {
                console.error("Error fetching attendance: ", error);
                toast({ title: "Error", description: "Could not fetch attendance data.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchAttendance();
    }, [router, toast]);

    const handleGenerateReport = () => {
        if (!dateRange || !dateRange.from || !dateRange.to) {
            toast({ title: "Invalid Date Range", description: "Please select a start and end date for the report.", variant: "destructive" });
            return;
        }

        const interval = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
        const totalDays = interval.filter(day => !isWeekend(day)).length; // Considering only weekdays
        let presentDays = 0;

        interval.forEach(day => {
            if (!isWeekend(day) && attendanceDates.some(attDate => isSameDay(day, attDate))) {
                presentDays++;
            }
        });

        const absentDays = totalDays - presentDays;
        const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

        setReport({
            totalDays,
            presentDays,
            absentDays,
            attendancePercentage,
        });
    };
    
    if (loading) {
        return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">My Attendance</h1>
                    <p className="text-muted-foreground">View your check-in history and generate reports.</p>
                </div>
                <Link href="/dashboard/trainer" passHref>
                    <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Dashboard</Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Attendance Calendar</CardTitle>
                        <CardDescription>Days you were present are highlighted.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Calendar
                            mode="multiple"
                            selected={attendanceDates}
                            modifiersClassNames={{ selected: "bg-primary text-primary-foreground" }}
                            className="rounded-md border"
                        />
                    </CardContent>
                </Card>
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Generate Report</CardTitle>
                            <CardDescription>Select a date range to generate an attendance summary.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <DateRangePicker date={dateRange} setDate={setDateRange} />
                            <Button onClick={handleGenerateReport}>Generate Report</Button>
                        </CardContent>
                    </Card>

                    {report && (
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><BarChart3/> Attendance Report</CardTitle>
                                <CardDescription>
                                    Summary from {dateRange?.from ? format(dateRange.from, "PPP") : ''} to {dateRange?.to ? format(dateRange.to, "PPP") : ''}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
                                    <p className="text-sm text-muted-foreground">Total Days (Weekdays)</p>
                                    <p className="text-2xl font-bold">{report.totalDays}</p>
                                </div>
                                <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
                                    <p className="text-sm text-muted-foreground">Present Days</p>
                                    <p className="text-2xl font-bold text-green-500">{report.presentDays}</p>
                                </div>
                                <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
                                    <p className="text-sm text-muted-foreground">Absent Days</p>
                                    <p className="text-2xl font-bold text-red-500">{report.absentDays}</p>
                                </div>
                                 <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
                                    <p className="text-sm text-muted-foreground">Attendance %</p>
                                    <p className="text-2xl font-bold text-primary">{report.attendancePercentage}%</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
