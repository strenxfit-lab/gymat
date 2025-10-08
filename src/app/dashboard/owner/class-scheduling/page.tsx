
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, getDocs, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PlusCircle, ArrowLeft, MoreHorizontal, Calendar, Clock, Users, Edit, Trash } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


const classSchema = z.object({
  className: z.string().min(1, 'Class name is required.'),
  trainerId: z.string().min(1, 'Please select a trainer.'),
  date: z.string().min(1, 'Date is required.'),
  time: z.string().min(1, 'Time is required.'),
  capacity: z.coerce.number().min(1, 'Capacity must be at least 1.'),
  location: z.string().min(1, 'Location is required.'),
});

interface Class extends z.infer<typeof classSchema> {
  id: string;
  trainerName: string;
  booked: number;
}

interface Trainer {
  id: string;
  name: string;
}

export default function ClassSchedulingPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof classSchema>>({
    resolver: zodResolver(classSchema),
    defaultValues: { className: '', trainerId: '', date: '', time: '', capacity: 10, location: '' },
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
        // Fetch trainers first
        const trainersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers');
        const trainersSnapshot = await getDocs(trainersCollection);
        const trainersList = trainersSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().fullName }));
        setTrainers(trainersList);
        
        // Fetch classes
        const classesCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'classes');
        const classesSnapshot = await getDocs(classesCollection);

        const classesListPromises = classesSnapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const trainer = trainersList.find(t => t.id === data.trainerId);
            const classDateTime = (data.dateTime as Timestamp).toDate();

            const bookingsCollection = collection(docSnap.ref, 'bookings');
            const bookingsSnapshot = await getDocs(bookingsCollection);
            
            return {
                id: docSnap.id,
                className: data.className,
                trainerId: data.trainerId,
                trainerName: trainer?.name || 'Unknown',
                date: classDateTime.toISOString().split('T')[0], // YYYY-MM-DD
                time: classDateTime.toTimeString().substring(0,5), // HH:MM
                capacity: data.capacity,
                location: data.location,
                booked: bookingsSnapshot.size,
            };
        });

        const classesList = await Promise.all(classesListPromises);
        setClasses(classesList);

    } catch (error) {
        console.error("Error fetching data:", error);
        toast({ title: "Error", description: "Failed to fetch schedule data.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllData();
  }, [toast]);

  const onAddClass = async (values: z.infer<typeof classSchema>) => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId) return;

    try {
      const dateTime = new Date(`${values.date}T${values.time}`);
      const classesCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'classes');
      
      await addDoc(classesCollection, {
        className: values.className,
        trainerId: values.trainerId,
        capacity: values.capacity,
        location: values.location,
        dateTime: Timestamp.fromDate(dateTime),
        createdAt: Timestamp.now(),
      });

      toast({ title: 'Success!', description: 'New class has been scheduled.' });
      setIsDialogOpen(false);
      form.reset();
      await fetchAllData();
    } catch (error) {
      console.error("Error adding class:", error);
      toast({ title: 'Error', description: 'Could not schedule class. Please try again.', variant: 'destructive' });
    }
  };
  
  const onDeleteClass = async (classId: string) => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId) return;
    
    try {
        const classRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'classes', classId);
        await deleteDoc(classRef);
        toast({ title: "Class Deleted", description: "The class has been removed from the schedule."});
        await fetchAllData();
    } catch (error) {
        console.error("Error deleting class:", error);
        toast({ title: "Error", description: "Could not delete class.", variant: "destructive"});
    }
  };


  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Class Schedule</h1>
          <p className="text-muted-foreground">Manage your upcoming group classes and workshops.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Schedule New Class
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Schedule a New Class</DialogTitle>
              <DialogDescription>Fill in the details for the new class session.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onAddClass)} className="space-y-4 py-4">
                <FormField control={form.control} name="className" render={({ field }) => ( <FormItem><FormLabel>Class Name</FormLabel><FormControl><Input placeholder="e.g., Morning Yoga" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="trainerId" render={({ field }) => (
                  <FormItem><FormLabel>Assign Trainer</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a trainer" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {trainers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="date" render={({ field }) => ( <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="time" render={({ field }) => ( <FormItem><FormLabel>Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="capacity" render={({ field }) => ( <FormItem><FormLabel>Capacity</FormLabel><FormControl><Input type="number" placeholder="20" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="location" render={({ field }) => ( <FormItem><FormLabel>Room/Studio</FormLabel><FormControl><Input placeholder="Main Studio" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Add Class'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Classes</CardTitle>
          <CardDescription>A list of all scheduled classes for your branch.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class Name</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Trainer</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Booked/Capacity</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.length > 0 ? (
                classes.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium">{cls.className}</TableCell>
                    <TableCell>{new Date(cls.date + 'T' + cls.time).toLocaleString([], { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                    <TableCell>{cls.trainerName}</TableCell>
                    <TableCell>{cls.location}</TableCell>
                    <TableCell>{cls.booked} / {cls.capacity}</TableCell>
                    <TableCell className="text-right">
                       <AlertDialog>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem><Edit className="mr-2 h-4 w-4"/> Edit Class</DropdownMenuItem>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive"><Trash className="mr-2 h-4 w-4"/> Delete Class</DropdownMenuItem>
                              </AlertDialogTrigger>
                            </DropdownMenuContent>
                          </DropdownMenu>
                           <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the class and all associated booking data.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDeleteClass(cls.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No classes scheduled yet.
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
