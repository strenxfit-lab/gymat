
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, Timestamp, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Sparkles, User, BarChart, Clock } from 'lucide-react';
import { analyzeSessions, SessionAnalysis, SessionData } from '@/ai/flows/session-analysis-flow';

interface PastClass {
  id: string;
  className: string;
  trainerName: string;
  dateTime: Date;
  booked: number;
  capacity: number;
}

interface Trainer {
  id: string;
  name: string;
}

const InsightsDisplay = ({ analysis }: { analysis: SessionAnalysis }) => (
    <Card className="mt-6 bg-secondary/50">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/> AI Performance Insights</CardTitle>
            <CardDescription>Here is an analysis of your past sessions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2"><User /> Top Performing Trainers</h3>
                <p className="text-sm text-muted-foreground">{analysis.topTrainer.analysis}</p>
            </div>
             <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2"><BarChart /> Most Popular Classes</h3>
                <p className="text-sm text-muted-foreground">{analysis.popularClass.analysis}</p>
            </div>
             <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2"><Clock /> Optimal Session Timings</h3>
                <p className="text-sm text-muted-foreground">{analysis.peakTimes.analysis}</p>
            </div>
        </CardContent>
    </Card>
);

export default function SessionTrackingPage() {
  const [pastClasses, setPastClasses] = useState<PastClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<SessionAnalysis | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPastClasses = async () => {
        setLoading(true);
        const userDocId = localStorage.getItem('userDocId');
        const activeBranchId = localStorage.getItem('activeBranch');

        if (!userDocId || !activeBranchId) {
            toast({ title: "Error", description: "Branch not selected.", variant: "destructive" });
            setLoading(false);
            return;
        }
        try {
            const trainersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers');
            const trainersSnapshot = await getDocs(trainersCollection);
            const trainersList = trainersSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().fullName }));

            const classesCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'classes');
            const q = query(classesCollection, where("dateTime", "<", new Date()));
            const classesSnapshot = await getDocs(q);

            const classesListPromises = classesSnapshot.docs.map(async (docSnap) => {
                const data = docSnap.data();
                const trainer = trainersList.find(t => t.id === data.trainerId);
                const bookingsCollection = collection(docSnap.ref, 'bookings');
                const bookingsSnapshot = await getDocs(bookingsCollection);

                return {
                    id: docSnap.id,
                    className: data.className,
                    trainerName: trainer?.name || 'Unknown',
                    dateTime: (data.dateTime as Timestamp).toDate(),
                    booked: bookingsSnapshot.size,
                    capacity: data.capacity,
                };
            });
            const resolvedClasses = await Promise.all(classesListPromises);
            resolvedClasses.sort((a,b) => b.dateTime.getTime() - a.dateTime.getTime()); // Sort by most recent
            setPastClasses(resolvedClasses);

        } catch (error) {
            console.error("Error fetching past classes:", error);
            toast({ title: "Error", description: "Failed to fetch past classes.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    fetchPastClasses();
  }, [toast]);

  const handleAnalysis = async () => {
    if (pastClasses.length === 0) {
        toast({ title: "Not enough data", description: "There are no past classes to analyze."});
        return;
    }
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
        const sessionData: SessionData[] = pastClasses.map(c => ({
            className: c.className,
            trainerName: c.trainerName,
            timeOfDay: c.dateTime.toTimeString().split(' ')[0].substring(0,5), // "HH:MM"
            dayOfWeek: c.dateTime.toLocaleString('en-US', { weekday: 'long' }),
            memberCount: c.booked
        }));

        const result = await analyzeSessions({ sessions: sessionData });
        setAnalysisResult(result);
        toast({ title: "Analysis Complete!", description: "AI-powered insights have been generated."});
    } catch (error) {
        console.error("Error analyzing sessions:", error);
        toast({ title: "Analysis Failed", description: "Could not generate insights. Please try again.", variant: "destructive" });
    } finally {
        setIsAnalyzing(false);
    }
  };
  
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Session Tracking & Analytics</h1>
          <p className="text-muted-foreground">Review past class performance and generate insights.</p>
        </div>
        <Link href="/dashboard/owner" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Dashboard</Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Past Class History</CardTitle>
                <CardDescription>A log of all completed classes.</CardDescription>
            </div>
            <Button onClick={handleAnalysis} disabled={isAnalyzing}>
                {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>}
                Analyze Performance
            </Button>
        </CardHeader>
        <CardContent>
            {analysisResult && <InsightsDisplay analysis={analysisResult} />}

            <div className="mt-4 border rounded-md">
                <div className="relative w-full overflow-auto max-h-[500px]">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Class Name</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Trainer</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Attendance</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                             {pastClasses.length > 0 ? (
                                pastClasses.map(cls => (
                                    <tr key={cls.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <td className="p-4 align-middle font-medium">{cls.className}</td>
                                        <td className="p-4 align-middle text-muted-foreground">{cls.dateTime.toLocaleString()}</td>
                                        <td className="p-4 align-middle">{cls.trainerName}</td>
                                        <td className="p-4 align-middle">{cls.booked} / {cls.capacity}</td>
                                    </tr>
                                ))
                             ) : (
                                <tr>
                                    <td colSpan={4} className="p-4 text-center text-muted-foreground h-24">No past classes found.</td>
                                </tr>
                             )}
                        </tbody>
                    </table>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
