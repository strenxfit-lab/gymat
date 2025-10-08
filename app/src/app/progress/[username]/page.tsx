
"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, onSnapshot, collection, query, orderBy, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Sparkles, Download, Flame, Dumbbell, Ruler, Star, ArrowLeft } from 'lucide-react';
import { startOfDay, format, differenceInDays } from 'date-fns';
import { workouts, type Muscle } from '@/lib/workouts';
import { analyzeWorkoutHistory, type WorkoutHistory } from '@/ai/flows/workout-analysis-flow';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Link from 'next/link';

interface CommunityProfile {
    photoUrl?: string;
    followers?: string[];
    following?: string[];
}

interface WorkoutLog {
    type: 'workout';
    workoutId: string;
    muscles: Muscle[];
    completedAt: any;
}

interface MeasurementLog {
    type: 'measurement';
    weight?: number;
    chest?: number;
    waist?: number;
    arms?: number;
    thighs?: number;
    completedAt: any;
}

type TimelineItem = (WorkoutLog | MeasurementLog) & { id: string };

interface TopWorkout {
    name: string;
    count: number;
}

export default function UserProgressPage() {
    const params = useParams();
    const username = params.username as string;

    const [profile, setProfile] = useState<CommunityProfile | null>(null);
    const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
    const [totalWorkouts, setTotalWorkouts] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [streak, setStreak] = useState(0);
    const [topWorkouts, setTopWorkouts] = useState<TopWorkout[]>([]);
    const { toast } = useToast();
    
    const loggedInUsername = typeof window !== 'undefined' ? localStorage.getItem('communityUsername') : null;
    const isOwnProfile = loggedInUsername === username;


    useEffect(() => {
        if (!username) {
            setLoading(false);
            return;
        }
    
        const profileRef = doc(db, 'userCommunity', username);
        
        const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setProfile({
                    photoUrl: data.photoUrl,
                    followers: data.followers || [],
                    following: data.following || [],
                });

                const workoutLogRef = collection(profileRef, 'workoutLog');
                const measurementsLogRef = collection(profileRef, 'measurements');

                const workoutQuery = query(workoutLogRef, orderBy('completedAt', 'desc'));
                const measurementsQuery = query(measurementsLogRef, orderBy('completedAt', 'desc'));

                const unsubscribeWorkouts = onSnapshot(workoutQuery, (workoutSnap) => {
                    const workoutLogs = workoutSnap.docs.map(d => ({ id: d.id, type: 'workout', ...d.data() } as TimelineItem));
                    
                    onSnapshot(measurementsQuery, (measurementsSnap) => {
                        const measurementLogs = measurementsSnap.docs.map(d => ({ id: d.id, type: 'measurement', ...d.data() } as TimelineItem));
                        
                        const combined = [...workoutLogs, ...measurementLogs];
                        combined.sort((a,b) => b.completedAt.toDate().getTime() - a.completedAt.toDate().getTime());
                        
                        setTimelineItems(combined);
                        setTotalWorkouts(workoutLogs.length);
                        setLoading(false);

                        // Calculations
                        const logsForCalcs = workoutLogs.filter(log => log.completedAt);
                        calculateStreak(logsForCalcs);
                        calculateTopWorkouts(logsForCalcs);
                    });
                });

                return () => unsubscribeWorkouts();
            } else {
                setLoading(false);
                toast({ title: "Profile Not Found", description: "This user's progress profile could not be loaded."});
            }
        });

        return () => unsubscribeProfile();

    }, [username, toast]);

    const calculateStreak = (logs: TimelineItem[]) => {
        if (logs.length === 0) {
            setStreak(0);
            return;
        }
        
        const uniqueDays = [...new Set(logs.map(log => startOfDay(log.completedAt.toDate()).toISOString()))];
        uniqueDays.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

        let currentStreak = 0;
        let today = startOfDay(new Date());

        if (uniqueDays.includes(today.toISOString())) {
            currentStreak = 1;
        }

        for (let i = 0; i < uniqueDays.length - 1; i++) {
            const currentDay = new Date(uniqueDays[i]);
            const nextDay = new Date(uniqueDays[i+1]);
            
            if (differenceInDays(currentDay, nextDay) === 1) {
                currentStreak++;
            } else {
                break;
            }
        }
        setStreak(currentStreak);
    }
    
    const calculateTopWorkouts = (logs: TimelineItem[]) => {
        const workoutCounts: { [key: string]: number } = {};
        logs.forEach(log => {
            if (log.type === 'workout') {
                workoutCounts[log.workoutId] = (workoutCounts[log.workoutId] || 0) + 1;
            }
        });

        const sortedWorkouts = Object.entries(workoutCounts)
            .map(([id, count]) => ({
                name: workouts.find(w => w.id === id)?.name || 'Unknown',
                count
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
            
        setTopWorkouts(sortedWorkouts);
    };

    const handleMarkAsCompleted = async (workoutId: string) => {
        if (!username) return;

        const workout = workouts.find(w => w.id === workoutId);
        if (!workout) return;

        try {
            const profileRef = doc(db, 'userCommunity', username);
            const workoutLogRef = collection(profileRef, 'workoutLog');

            const startOfToday = startOfDay(new Date());
            const q = query(
                workoutLogRef, 
                where('workoutId', '==', workoutId),
                where('completedAt', '>=', startOfToday)
            );
            
            const todaysLog = await getDocs(q);

            if (!todaysLog.empty) {
                toast({
                    title: 'Already Logged',
                    description: 'This workout has already been logged today.',
                    variant: 'destructive',
                });
                return;
            }

            await addDoc(workoutLogRef, {
                workoutId,
                muscles: workout.muscles,
                completedAt: serverTimestamp(),
            });
            toast({
                title: 'Workout Completed!',
                description: `Great job finishing the ${workout.name} workout.`,
            });
        } catch (error) {
            console.error("Error marking workout as completed:", error);
            toast({ title: 'Error', description: 'Could not save workout completion.', variant: 'destructive' });
        }
    };
    
    const handleAnalysis = async () => {
        const workoutLogs = timelineItems.filter(item => item.type === 'workout') as WorkoutLog[];
        if (workoutLogs.length < 3) {
            toast({ title: "Not enough data", description: "Complete at least 3 workouts to get an analysis.", variant: "destructive" });
            return;
        }
        setIsAnalyzing(true);
        setAnalysisResult(null);

        try {
            const history: WorkoutHistory[] = workoutLogs.map(log => ({
                workoutName: workouts.find(w => w.id === log.workoutId)?.name || 'Unknown Workout',
                musclesTrained: log.muscles,
                date: log.completedAt.toDate().toISOString().split('T')[0],
            }));
            
            const result = await analyzeWorkoutHistory({ history });
            setAnalysisResult(result);
            toast({ title: "Analysis Complete!", description: "Here are your personalized insights." });
        } catch (error) {
             console.error("Error analyzing workout history:", error);
             toast({ title: "Analysis Failed", description: "Could not generate insights.", variant: "destructive" });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getLastCompletedDate = (workoutId: string) => {
        const log = timelineItems.find(log => log.type === 'workout' && log.workoutId === workoutId);
        return log && log.completedAt ? new Date(log.completedAt.toDate()).toLocaleDateString() : 'Not completed yet';
    };

    const renderTimelineItem = (item: TimelineItem) => {
        if (item.type === 'workout') {
            const workout = workouts.find(w => w.id === item.workoutId);
            return (
                <div className="flex flex-col">
                    <p className="font-semibold">{workout?.name || 'Workout'}</p>
                    <p className="text-sm text-gray-400 capitalize">
                        {workout?.muscles.join(', ').replace(/_/g, ' ')}
                    </p>
                </div>
            );
        }
        if (item.type === 'measurement') {
            const details = Object.entries(item)
                .filter(([key, value]) => key !== 'type' && key !== 'completedAt' && key !== 'id' && value)
                .map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`)
                .join(' | ');
            return (
                <div className="flex flex-col">
                     <p className="font-semibold">Body Measurements</p>
                     <p className="text-sm text-gray-400">{details}</p>
                </div>
            );
        }
        return null;
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0F0F0F]">
                <Loader2 className="h-8 w-8 animate-spin text-accent-red" />
            </div>
        );
    }

    return (
        <div className="bg-[#0F0F0F] text-white min-h-screen font-body">
            <div className="container mx-auto p-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">My Progress</h1>
                    {!isOwnProfile && 
                        <Link href="/dashboard/trainer" passHref>
                            <Button variant="outline" className="bg-transparent border-gray-600 hover:bg-gray-800">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back
                            </Button>
                        </Link>
                    }
                </div>

                <Card className="bg-[#1A1A1A] border-[#2A2A2A] text-white mb-6">
                    <CardContent className="flex items-center gap-4 p-4">
                        <Avatar className="h-16 w-16 border-2 border-accent-red">
                            <AvatarImage src={profile?.photoUrl} />
                            <AvatarFallback>{username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="font-bold text-lg">{username}</p>
                            <div className="flex gap-4 text-sm text-gray-400 mt-1">
                                <span><span className="font-bold text-white">{totalWorkouts}</span> Workouts</span>
                                <span><span className="font-bold text-white">{profile?.followers?.length || 0}</span> Followers</span>
                                <span><span className="font-bold text-white">{profile?.following?.length || 0}</span> Following</span>
                            </div>
                        </div>
                         <div className="flex items-center gap-2">
                            <Flame className="h-6 w-6 text-accent-red" />
                            <span className="font-bold text-2xl">{streak}</span>
                        </div>
                    </CardContent>
                </Card>
                
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <Button onClick={handleAnalysis} disabled={isAnalyzing} className="w-full bg-accent-red hover:bg-accent-red/90 text-lg py-6">
                        {isAnalyzing ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Sparkles className="mr-2 h-5 w-5"/>}
                        Analyze My Performance
                    </Button>
                     <Button disabled className="w-full bg-gray-700 hover:bg-gray-600 text-lg py-6">
                        <Download className="mr-2 h-5 w-5"/>
                        Download Progress Report (PDF)
                    </Button>
                </div>

                {analysisResult && (
                    <Card className="bg-[#1A1A1A] border-[#2A2A2A] text-white mb-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Sparkles className="text-accent-red"/> AI-Powered Insights</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-300">{analysisResult}</p>
                        </CardContent>
                    </Card>
                )}

                <Tabs defaultValue="timeline">
                    <TabsList className="grid w-full grid-cols-2 bg-[#1A1A1A] border-[#2A2A2A] mb-4">
                        <TabsTrigger value="timeline">Timeline</TabsTrigger>
                        <TabsTrigger value="workouts">Workouts</TabsTrigger>
                    </TabsList>
                    <TabsContent value="timeline">
                        <Card className="bg-[#1A1A1A] border-[#2A2A2A] text-white">
                            <CardHeader>
                                <CardTitle>Progress Timeline</CardTitle>
                                <CardDescription>Your fitness journey at a glance.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {timelineItems.length > 0 ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col items-center">
                                                <Star className="h-6 w-6 text-yellow-400 fill-yellow-400"/>
                                                <div className="w-px h-8 bg-gray-600"></div>
                                            </div>
                                            <p className="font-bold text-lg">First Workout Logged! 🎉</p>
                                        </div>
                                        <Accordion type="single" collapsible>
                                            {timelineItems.map(item => (
                                                <AccordionItem value={item.id} key={item.id} className="border-gray-700">
                                                    <AccordionTrigger className="hover:no-underline">
                                                        <div className="flex items-center gap-4">
                                                             <div className="flex flex-col items-center">
                                                                <div className="w-px h-8 bg-gray-600"></div>
                                                                <div className="h-4 w-4 rounded-full bg-accent-red"></div>
                                                                <div className="w-px h-8 bg-gray-600"></div>
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-base">{format(item.completedAt.toDate(), 'MMMM d, yyyy')}</p>
                                                                <div className="text-left text-sm text-gray-400">
                                                                     {item.type === 'workout' && <Dumbbell className="inline-block mr-2 h-4 w-4"/>}
                                                                     {item.type === 'measurement' && <Ruler className="inline-block mr-2 h-4 w-4"/>}
                                                                     {item.type === 'workout' ? 'Workout' : 'Measurements'} Logged
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="pl-12">
                                                        {renderTimelineItem(item)}
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    </div>
                                ) : (
                                    <p className="text-center text-gray-400 py-8">Log a workout or measurement to start your timeline!</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="workouts">
                        <Card className="bg-[#1A1A1A] border-[#2A2A2A] text-white">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Dumbbell /> Workout Log</CardTitle>
                                {isOwnProfile ? (
                                    <CardDescription>Log your completed workouts here.</CardDescription>
                                ) : (
                                    <CardDescription>Workouts completed by {username}.</CardDescription>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {workouts.map(workout => (
                                    <Card key={workout.id} className="bg-[#2A2A2A] border-[#3A3A3A] text-white">
                                        <CardContent className="p-4 flex justify-between items-center">
                                            <div>
                                                <h3 className="font-bold">{workout.name}</h3>
                                                <p className="text-xs text-gray-400">Last completed: {getLastCompletedDate(workout.id)}</p>
                                            </div>
                                            {isOwnProfile && (
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    className="bg-transparent border-accent-red text-accent-red hover:bg-accent-red hover:text-white"
                                                    onClick={() => handleMarkAsCompleted(workout.id)}
                                                >
                                                    Mark as Completed
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
                

                <footer className="text-center mt-12 text-gray-500 font-semibold">
                    Stay Strong with StrenxFit💪
                </footer>
            </div>
        </div>
    );
}

    