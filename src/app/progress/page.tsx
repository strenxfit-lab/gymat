
"use client";

import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Download, Flame, BarChart3, Dumbbell } from 'lucide-react';
import { differenceInDays, format, startOfDay, isSameDay, subDays } from 'date-fns';
import { workouts, type Muscle } from '@/lib/workouts';
import { FrontBody } from '@/components/ui/front-body';
import { BackBody } from '@/components/ui/back-body';
import { analyzeWorkoutHistory, type WorkoutHistory } from '@/ai/flows/workout-analysis-flow';


interface CommunityProfile {
    photoUrl?: string;
    followers?: string[];
    following?: string[];
}

interface WorkoutLog {
    workoutId: string;
    muscles: Muscle[];
    completedAt: any;
}

type MuscleColor = '#FF4B4B' | '#FFA500' | '#808080';

type MuscleColors = {
    [key in Muscle]?: MuscleColor;
};

interface TopWorkout {
    name: string;
    count: number;
}

export default function ProgressPage() {
    const [profile, setProfile] = useState<CommunityProfile | null>(null);
    const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
    const [totalWorkouts, setTotalWorkouts] = useState(0);
    const [username, setUsername] = useState<string | null>(null);
    const [muscleColors, setMuscleColors] = useState<MuscleColors>({});
    const [loading, setLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [streak, setStreak] = useState(0);
    const [topWorkouts, setTopWorkouts] = useState<TopWorkout[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        const loggedInUsername = localStorage.getItem('communityUsername');
        if (!loggedInUsername) {
            setLoading(false);
            return;
        }
        setUsername(loggedInUsername);
    
        const profileRef = doc(db, 'userCommunity', loggedInUsername);
        
        const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setProfile({
                    photoUrl: data.photoUrl,
                    followers: data.followers || [],
                    following: data.following || [],
                });

                const workoutLogRef = collection(profileRef, 'workoutLog');
                const q = query(workoutLogRef, orderBy('completedAt', 'desc'));

                const unsubscribeLogs = onSnapshot(q, (logSnap) => {
                    const logs = logSnap.docs.map(d => {
                        const data = d.data();
                        if (data.completedAt) {
                            return data as WorkoutLog;
                        }
                        return null;
                    }).filter(Boolean) as WorkoutLog[];
                    
                    setWorkoutLogs(logs);
                    setTotalWorkouts(logs.length);
                    
                    // --- Streak Calculation ---
                    let currentStreak = 0;
                    if (logs.length > 0) {
                        const uniqueDays = [...new Set(logs.map(log => startOfDay(log.completedAt.toDate()).getTime()))];
                        uniqueDays.sort((a,b) => b-a);
                        
                        const today = startOfDay(new Date());
                        const yesterday = startOfDay(subDays(new Date(), 1));

                        if(uniqueDays[0] === today.getTime() || uniqueDays[0] === yesterday.getTime()){
                            currentStreak = 1;
                            for (let i = 1; i < uniqueDays.length; i++) {
                                const dayDiff = differenceInDays(new Date(uniqueDays[i-1]), new Date(uniqueDays[i]));
                                if (dayDiff === 1) {
                                    currentStreak++;
                                } else {
                                    break;
                                }
                            }
                        }
                    }
                    setStreak(currentStreak);

                    // --- Top 3 Workouts ---
                    const workoutCounts = logs.reduce((acc, log) => {
                        const workoutName = workouts.find(w => w.id === log.workoutId)?.name || 'Unknown';
                        acc[workoutName] = (acc[workoutName] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>);

                    const sortedWorkouts = Object.entries(workoutCounts)
                        .map(([name, count]) => ({ name, count }))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 3);
                    setTopWorkouts(sortedWorkouts);

                    // --- Heatmap Logic ---
                    const lastWorkoutDates: { [key in Muscle]?: Date } = {};
                    logs.forEach(log => {
                        if (log.completedAt) { 
                            log.muscles.forEach(muscle => {
                                if (!lastWorkoutDates[muscle]) {
                                    lastWorkoutDates[muscle] = log.completedAt.toDate();
                                }
                            });
                        }
                    });

                    const colors: MuscleColors = {};
                    Object.keys(lastWorkoutDates).forEach(m => {
                        const muscle = m as Muscle;
                        const lastDate = lastWorkoutDates[muscle];
                        if (lastDate) {
                            const daysAgo = differenceInDays(today, lastDate);
                            if (daysAgo <= 1) {
                                colors[muscle] = '#FF4B4B'; // Red
                            } else if (daysAgo <= 3) {
                                colors[muscle] = '#FFA500'; // Orange
                            } else {
                                colors[muscle] = '#808080'; // Grey
                            }
                        }
                    });
                    setMuscleColors(colors);
                    setLoading(false);
                });

                return () => unsubscribeLogs();
            } else {
                setLoading(false);
            }
        });

        return () => unsubscribeProfile();

    }, [toast]);

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
        const log = workoutLogs.find(log => log.workoutId === workoutId);
        return log && log.completedAt ? format(log.completedAt.toDate(), 'PPP') : 'Not completed yet';
    };

    return (
        <div className="bg-[#0F0F0F] text-white min-h-screen font-body">
            <div className="container mx-auto p-4">
                <h1 className="text-2xl font-bold mb-6">My Progress</h1>

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

                 <Card className="bg-[#1A1A1A] border-[#2A2A2A] text-white mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BarChart3/> Top 3 Workouts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {topWorkouts.map((workout, index) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                                <span>{index + 1}. {workout.name}</span>
                                <span className="font-semibold">{workout.count} times</span>
                            </div>
                        ))}
                         {topWorkouts.length === 0 && <p className="text-sm text-gray-400">Log some workouts to see your top ones!</p>}
                    </CardContent>
                </Card>


                <Tabs defaultValue="heatmap" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
                        <TabsTrigger value="heatmap" className="data-[state=active]:bg-accent-red data-[state=active]:text-white rounded-lg">Personal Heatmap</TabsTrigger>
                        <TabsTrigger value="workouts" className="data-[state=active]:bg-accent-red data-[state=active]:text-white rounded-lg">Workouts</TabsTrigger>
                    </TabsList>
                    <TabsContent value="heatmap" className="mt-6">
                        <Card className="bg-transparent border-none">
                            <CardContent className="p-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="text-center">
                                        <h3 className="font-semibold mb-4">Front</h3>
                                        <FrontBody muscleColors={muscleColors} />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="font-semibold mb-4">Back</h3>
                                        <BackBody muscleColors={muscleColors} />
                                    </div>
                                </div>
                                 <div className="flex justify-center gap-4 mt-6 text-xs">
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#FF4B4B]"></div>Trained 1 day ago</div>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#FFA500]"></div>Trained 2-3 days ago</div>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#808080]"></div>Trained 4+ days ago</div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="workouts" className="mt-6">
                        <div className="space-y-4">
                            {workouts.map(workout => (
                                <Card key={workout.id} className="bg-[#1A1A1A] border-[#2A2A2A] text-white">
                                    <CardContent className="p-4 flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold">{workout.name}</h3>
                                            <p className="text-xs text-gray-400">Last completed: {getLastCompletedDate(workout.id)}</p>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            variant="outline"
                                            className="bg-transparent border-accent-red text-accent-red hover:bg-accent-red hover:text-white"
                                            onClick={() => handleMarkAsCompleted(workout.id)}
                                        >
                                            Mark as Completed
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>

                <footer className="text-center mt-12 text-gray-500 font-semibold">
                    Stay Strong with StrenxFit💪
                </footer>
            </div>
        </div>
    );
}
