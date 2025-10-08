
"use client";

import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
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
    completedAt: Timestamp;
}

type MuscleColor = '#FF4B4B' | '#FFA500' | '#808080';

type MuscleColors = {
    [key in Muscle]?: MuscleColor;
};

export default function ProgressPage() {
    const [profile, setProfile] = useState<CommunityProfile | null>(null);
    const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
    const [totalWorkouts, setTotalWorkouts] = useState(0);
    const [username, setUsername] = useState<string | null>(null);
    const [muscleColors, setMuscleColors] = useState<MuscleColors>({});
    const [loading, setLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
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
                    const logs = logSnap.docs.map(d => d.data() as WorkoutLog);
                    setWorkoutLogs(logs);
                    setTotalWorkouts(logs.length);
                    
                    const lastWorkoutDates: { [key in Muscle]?: Date } = {};
                    logs.forEach(log => {
                        log.muscles.forEach(muscle => {
                            if (!lastWorkoutDates[muscle]) {
                                lastWorkoutDates[muscle] = log.completedAt.toDate();
                            }
                        });
                    });

                    const today = new Date();
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
        return log ? format(log.completedAt.toDate(), 'PPP') : 'Not completed yet';
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
                    </CardContent>
                </Card>
                
                 <Button onClick={handleAnalysis} disabled={isAnalyzing} className="w-full mb-6 bg-accent-red hover:bg-accent-red/90">
                    {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>}
                    Analyze My Performance
                </Button>

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
            </div>
        </div>
    );
}
