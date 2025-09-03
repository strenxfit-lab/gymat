
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, getDocs, Timestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PlusCircle, ArrowLeft, MoreHorizontal, Edit, Trash, CheckCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const maintenanceSchema = z.object({
  equipmentId: z.string().min(1, 'Please select equipment.'),
  taskDescription: z.string().min(1, 'Task description is required.'),
  dueDate: z.string().min(1, 'Due date is required.'),
  assignedTo: z.string().min(1, 'Please assign to a staff member.'),
  status: z.enum(['Pending', 'Completed']),
  notes: z.string().optional(),
});

interface Equipment {
  id: string;
  name: string;
}

interface Trainer {
  id: string;
  name: string;
}

interface MaintenanceTask extends z.infer<typeof maintenanceSchema> {
  id: string;
  equipmentName?: string;
  assignedToName?: string;
}

const getStatusVariant = (status: 'Pending' | 'Completed') => {
    return status === 'Completed' ? 'default' : 'secondary';
}


export default function MaintenanceSchedulePage() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [trainerList, setTrainerList] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof maintenanceSchema>>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: { equipmentId: '', taskDescription: '', dueDate: '', assignedTo: '', status: 'Pending', notes: '' },
  });
  
  const fetchAllData = async () => {
    setLoading(true);
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');

    if (!userDocId || !activeBranchId) {
      toast({ title: "Error", description: "Branch not selected.", variant: "destructive" });
      setLoading(false);
      return;
    }
    try {
        const equipmentCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'equipment');
        const equipmentSnapshot = await getDocs(equipmentCollection);
        const eqList = equipmentSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        setEquipmentList(eqList);
        
        const trainersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers');
        const trainersSnapshot = await getDocs(trainersCollection);
        const trList = trainersSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().fullName }));
        setTrainerList(trList);
        
        const maintenanceCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'maintenance');
        const maintenanceSnapshot = await getDocs(maintenanceCollection);
        const taskList = maintenanceSnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                dueDate: (data.dueDate as Timestamp).toDate().toISOString().split('T')[0],
                equipmentName: eqList.find(e => e.id === data.equipmentId)?.name || 'Unknown',
                assignedToName: trList.find(t => t.id === data.assignedTo)?.name || 'Unknown',
            } as MaintenanceTask;
        });
        taskList.sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        setTasks(taskList);
    } catch (error) {
        console.error("Error fetching data:", error);
        toast({ title: "Error", description: "Failed to fetch maintenance data.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllData();
  }, [toast]);
  
  useEffect(() => {
    if (editingTask) {
        form.reset(editingTask);
        setIsFormDialogOpen(true);
    } else {
        form.reset({ equipmentId: '', taskDescription: '', dueDate: '', assignedTo: '', status: 'Pending', notes: '' });
    }
  }, [editingTask, form]);


  const handleFormDialogStateChange = (open: boolean) => {
      setIsFormDialogOpen(open);
      if (!open) {
          setEditingTask(null);
      }
  }

  const handleFormSubmit = async (values: z.infer<typeof maintenanceSchema>) => {
    if (editingTask) {
        await onUpdateTask(values);
    } else {
        await onAddTask(values);
    }
  };

  const onAddTask = async (values: z.infer<typeof maintenanceSchema>) => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId) return;

    try {
      const maintenanceCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'maintenance');
      
      await addDoc(maintenanceCollection, {
        ...values,
        dueDate: Timestamp.fromDate(new Date(values.dueDate)),
        createdAt: Timestamp.now(),
      });

      toast({ title: 'Success!', description: 'New maintenance task has been scheduled.' });
      handleFormDialogStateChange(false);
      await fetchAllData();
    } catch (error) {
      console.error("Error adding task:", error);
      toast({ title: 'Error', description: 'Could not schedule task. Please try again.', variant: 'destructive' });
    }
  };

  const onUpdateTask = async (values: z.infer<typeof maintenanceSchema>) => {
      if (!editingTask) return;
      const userDocId = localStorage.getItem('userDocId');
      const activeBranchId = localStorage.getItem('activeBranch');
      if (!userDocId || !activeBranchId) return;

      try {
        const taskRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'maintenance', editingTask.id);

        await updateDoc(taskRef, {
            ...values,
            dueDate: Timestamp.fromDate(new Date(values.dueDate)),
        });
        
        toast({ title: 'Success!', description: 'Task details have been updated.' });
        handleFormDialogStateChange(false);
        await fetchAllData();
      } catch (error) {
          console.error("Error updating task:", error);
          toast({ title: 'Error', description: 'Could not update task.', variant: 'destructive'});
      }
  }
  
  const onDeleteTask = async (taskId: string) => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId) return;
    
    try {
        const taskRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'maintenance', taskId);
        await deleteDoc(taskRef);
        toast({ title: "Task Deleted", description: "The task has been removed from the schedule."});
        await fetchAllData();
    } catch (error) {
        console.error("Error deleting task:", error);
        toast({ title: "Error", description: "Could not delete task.", variant: "destructive"});
    }
  };

  const onCompleteTask = async (task: MaintenanceTask) => {
    if (!task) return;
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId) return;
    
    try {
        const taskRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'maintenance', task.id);
        await updateDoc(taskRef, { status: 'Completed' });
        toast({ title: "Task Completed!", description: "The task has been marked as complete."});
        await fetchAllData();
    } catch (error) {
        console.error("Error completing task:", error);
        toast({ title: "Error", description: "Could not update task status.", variant: "destructive"});
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Maintenance Schedule</h1>
          <p className="text-muted-foreground">Schedule, assign, and track all equipment maintenance tasks.</p>
        </div>
         <div className="flex items-center gap-2">
            <Link href="/dashboard/owner/equipment-maintenance" passHref>
                <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back</Button>
            </Link>
            <Dialog open={isFormDialogOpen} onOpenChange={handleFormDialogStateChange}>
            <DialogTrigger asChild>
                <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Schedule New Task
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                <DialogTitle>{editingTask ? 'Edit Task' : 'Schedule New Maintenance Task'}</DialogTitle>
                <DialogDescription>{editingTask ? 'Update the details for this maintenance task.' : 'Fill in the details to add a new task to the schedule.'}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
                    <FormField control={form.control} name="equipmentId" render={({ field }) => (
                        <FormItem><FormLabel>Equipment</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select equipment" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {equipmentList.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                                </SelectContent>
                            </Select><FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="taskDescription" render={({ field }) => ( <FormItem><FormLabel>Task Description</FormLabel><FormControl><Textarea placeholder="e.g., Clean and sanitize treadmill belts" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="dueDate" render={({ field }) => ( <FormItem><FormLabel>Due Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="assignedTo" render={({ field }) => (
                        <FormItem><FormLabel>Assign To</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {trainerList.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                </SelectContent>
                            </Select><FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Use specific cleaning solution" {...field} /></FormControl><FormMessage /></FormItem> )} />

                    <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => handleFormDialogStateChange(false)}>Cancel</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : (editingTask ? 'Save Changes' : 'Schedule Task')}
                    </Button>
                    </DialogFooter>
                </form>
                </Form>
            </DialogContent>
            </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Tasks</CardTitle>
          <CardDescription>A list of all upcoming and completed maintenance tasks.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.equipmentName}</TableCell>
                    <TableCell>{task.taskDescription}</TableCell>
                    <TableCell>{format(new Date(task.dueDate), 'PPP')}</TableCell>
                    <TableCell>{task.assignedToName}</TableCell>
                    <TableCell><Badge variant={getStatusVariant(task.status)}>{task.status}</Badge></TableCell>
                    <TableCell className="text-right">
                       <AlertDialog>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {task.status === 'Pending' && <DropdownMenuItem onSelect={() => onCompleteTask(task)}><CheckCircle className="mr-2 h-4 w-4"/>Mark as Complete</DropdownMenuItem>}
                                <DropdownMenuItem onSelect={() => setEditingTask(task)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                </AlertDialogTrigger>
                            </DropdownMenuContent>
                          </DropdownMenu>
                           <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete this maintenance task.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDeleteTask(task.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No maintenance tasks scheduled yet.
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
