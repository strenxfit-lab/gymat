
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, Timestamp, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, CheckCircle, Wrench } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

type TaskStatus = 'Pending' | 'Resolved' | 'Completed';

interface MaintenanceTask {
    id: string;
    equipmentName: string;
    taskDescription: string;
    dueDate: string;
    notes?: string;
    status: TaskStatus;
}

const getStatusVariant = (status: TaskStatus) => {
    switch (status) {
        case 'Pending': return 'secondary';
        case 'Resolved': return 'default';
        case 'Completed': return 'destructive';
        default: return 'outline';
    }
}

export default function TrainerMaintenancePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const { toast } = useToast();

  const fetchTasks = async () => {
    setIsLoading(true);
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    const trainerId = localStorage.getItem('trainerId');

    if (!userDocId || !activeBranchId || !trainerId) {
        toast({ title: 'Error', description: 'Session invalid.', variant: 'destructive' });
        setIsLoading(false);
        return;
    }

    try {
        const maintenanceCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'maintenance');
        const q = query(maintenanceCollection, where('assignedTo', '==', trainerId));
        const tasksSnap = await getDocs(q);
        const tasksList = tasksSnap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                equipmentName: data.equipmentName,
                taskDescription: data.taskDescription,
                dueDate: format((data.dueDate as Timestamp).toDate(), 'PPP'),
                notes: data.notes,
                status: data.status,
            } as MaintenanceTask
        });
        tasksList.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        setTasks(tasksList);
    } catch (error) {
        console.error("Error fetching tasks:", error);
        toast({ title: "Error", description: "Could not fetch assigned tasks.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [toast]);
  
  const handleResolveTask = async (taskId: string) => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId) return;

    try {
        const taskRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'maintenance', taskId);
        await updateDoc(taskRef, { status: 'Resolved' });
        toast({ title: 'Task Resolved!', description: 'The task has been marked as resolved and is pending owner approval.'});
        await fetchTasks();
    } catch (error) {
        console.error("Error resolving task:", error);
        toast({ title: 'Error', description: 'Could not update task. Please try again.', variant: 'destructive' });
    }
  }
  
  const upcomingTasks = tasks.filter(t => t.status === 'Pending' || t.status === 'Resolved');
  const pastTasks = tasks.filter(t => t.status === 'Completed');

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
        <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-3xl font-bold">My Maintenance Tasks</h1>
                <p className="text-muted-foreground">View and manage your assigned maintenance jobs.</p>
            </div>
            <Link href="/dashboard/trainer" passHref>
                <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Button>
            </Link>
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upcoming">Upcoming Tasks</TabsTrigger>
                <TabsTrigger value="history">Past Tasks</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming">
                <Card>
                    <CardHeader>
                        <CardTitle>Upcoming & Pending Tasks</CardTitle>
                        <CardDescription>These are the tasks that require your attention.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {upcomingTasks.length > 0 ? upcomingTasks.map(task => (
                            <div key={task.id} className="p-4 border rounded-md">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">{task.equipmentName}</p>
                                        <p className="text-sm">{task.taskDescription}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Due: {task.dueDate}</p>
                                    </div>
                                     <Badge variant={getStatusVariant(task.status)}>{task.status}</Badge>
                                </div>
                                {task.notes && <p className="text-sm mt-2 p-2 bg-muted rounded-md">Notes: {task.notes}</p>}
                                {task.status === 'Pending' && (
                                    <div className="flex justify-end mt-2">
                                        <Button size="sm" onClick={() => handleResolveTask(task.id)}>
                                            <CheckCircle className="mr-2 h-4 w-4"/>
                                            Mark as Resolved
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )) : (
                            <div className="text-center py-10 text-muted-foreground">
                                <Wrench className="mx-auto h-12 w-12 text-muted-foreground" />
                                <p className="mt-4">You have no upcoming maintenance tasks. Good job!</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="history">
                 <Card>
                    <CardHeader>
                        <CardTitle>Completed Task History</CardTitle>
                        <CardDescription>A log of your previously completed maintenance tasks.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {pastTasks.length > 0 ? pastTasks.map(task => (
                             <div key={task.id} className="p-4 border rounded-md bg-muted/30">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">{task.equipmentName}</p>
                                        <p className="text-sm text-muted-foreground">{task.taskDescription}</p>
                                         <p className="text-xs text-muted-foreground mt-1">Completed on: {task.dueDate}</p>
                                    </div>
                                    <Badge variant="destructive">Completed</Badge>
                                </div>
                            </div>
                        )) : (
                             <div className="text-center py-10 text-muted-foreground">
                                <p>You have not completed any tasks yet.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}
