
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, getDocs, Timestamp, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PlusCircle, ArrowLeft, MoreHorizontal, Edit, Trash, Eye, User, Phone, Mail } from 'lucide-react';
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

interface BookedMember {
  id: string;
  name: string;
}
interface Class extends z.infer<typeof classSchema> {
  id: string;
  trainerName: string;
  booked: number;
  bookedMembers: BookedMember[];
}

interface Trainer {
  id: string;
  name: string;
}

interface LimitDialogInfo {
    members?: number;
    trainers?: number;
    payments?: number;
    equipment?: number;
    classes?: number;
    expenses?: number;
    inventory?: number;
    maintenance?: number;
    offers?: number;
    usageLogs?: number;
}

const ViewBookingsDialog = ({ members }: { members: BookedMember[] }) => (
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Booked Members</DialogTitle>
      <DialogDescription>
        Here is the list of members who have booked this class.
      </DialogDescription>
    </DialogHeader>
    <div className="max-h-80 overflow-y-auto">
        <ul className="space-y-3 py-4">
            {members.length > 0 ? members.map(member => (
                <li key={member.id} className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{member.name}</span>
                </li>
            )) : (
                <p className="text-muted-foreground text-center">No members have booked this class yet.</p>
            )}
        </ul>
    </div>
  </DialogContent>
);

function LimitReachedDialog({ isOpen, onOpenChange, limits }: { isOpen: boolean; onOpenChange: (open: boolean) => void, limits: LimitDialogInfo }) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>You've reached the limit of your trial account</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 pt-2">
            {limits.members !== undefined && <p>Members ({limits.members}/3)</p>}
            {limits.trainers !== undefined && <p>Trainers ({limits.trainers}/2)</p>}
            {limits.payments !== undefined && <p>Payments ({limits.payments}/5 per member)</p>}
            {limits.equipment !== undefined && <p>Equipment ({limits.equipment}/1)</p>}
            {limits.classes !== undefined && <p>Classes ({limits.classes}/1)</p>}
            {limits.expenses !== undefined && <p>Expenses ({limits.expenses}/2)</p>}
            {limits.inventory !== undefined && <p>Inventory ({limits.inventory}/1)</p>}
            {limits.maintenance !== undefined && <p>Maintenance ({limits.maintenance}/1)</p>}
            {limits.offers !== undefined && <p>Offers ({limits.offers}/1)</p>}
            {limits.usageLogs !== undefined && <p>Usage Logs ({limits.usageLogs}/1)</p>}
            <p className="font-semibold pt-2">Upgrade to a full Account to continue managing without restrictions.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col space-y-2">
            <p className="font-bold text-center">Contact Strenxfit Support</p>
            <a href="https://wa.me/917988487892" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 p-3 rounded-md hover:bg-accent transition-colors">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <span>+91 79884 87892</span>
            </a>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


export default function ClassSchedulingPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [isTrial, setIsTrial] = useState(false);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [limitInfo, setLimitInfo] = useState<LimitDialogInfo>({});
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

    const gymRef = doc(db, 'gyms', userDocId);
    const gymSnap = await getDoc(gymRef);
    if (gymSnap.exists() && gymSnap.data().isTrial) {
        setIsTrial(true);
    }
    
    try {
        const trainersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers');
        const trainersSnapshot = await getDocs(trainersCollection);
        const trainersList = trainersSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().fullName }));
        setTrainers(trainersList);
        
        const classesCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'classes');
        const classesSnapshot = await getDocs(classesCollection);

        const classesListPromises = classesSnapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const trainer = trainersList.find(t => t.id === data.trainerId);
            const classDateTime = (data.dateTime as Timestamp).toDate();

            const bookingsCollection = collection(docSnap.ref, 'bookings');
            const bookingsSnapshot = await getDocs(bookingsCollection);

            const bookedMembersPromises = bookingsSnapshot.docs.map(async bookingDoc => {
                const memberRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', bookingDoc.id);
                const memberSnap = await getDoc(memberRef);
                if(memberSnap.exists()){
                    return { id: memberSnap.id, name: memberSnap.data().fullName };
                }
                return null;
            });
            const bookedMembers = (await Promise.all(bookedMembersPromises)).filter(m => m !== null) as BookedMember[];
            
            return {
                id: docSnap.id,
                className: data.className,
                trainerId: data.trainerId,
                trainerName: trainer?.name || 'Unknown',
                date: classDateTime.toISOString().split('T')[0],
                time: classDateTime.toTimeString().substring(0,5),
                capacity: data.capacity,
                location: data.location,
                booked: bookingsSnapshot.size,
                bookedMembers,
            };
        });

        const classesList = await Promise.all(classesListPromises);
        classesList.sort((a,b) => new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime());
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
  
  useEffect(() => {
    if (editingClass) {
        form.reset(editingClass);
        setIsFormDialogOpen(true);
    } else {
        form.reset({ className: '', trainerId: '', date: '', time: '', capacity: 10, location: '' });
    }
  }, [editingClass, form]);


  const handleFormDialogStateChange = (open: boolean) => {
      setIsFormDialogOpen(open);
      if (!open) {
          setEditingClass(null);
      }
  }

  const handleFormSubmit = async (values: z.infer<typeof classSchema>) => {
    if (editingClass) {
        await onUpdateClass(values);
    } else {
        await onAddClass(values);
    }
  };

  const onAddClass = async (values: z.infer<typeof classSchema>) => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId) return;

    if (isTrial) {
        if (classes.length >= 1) {
            setLimitInfo({ classes: classes.length });
            setLimitDialogOpen(true);
            return;
        }
    }

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
      handleFormDialogStateChange(false);
      await fetchAllData();
    } catch (error) {
      console.error("Error adding class:", error);
      toast({ title: 'Error', description: 'Could not schedule class. Please try again.', variant: 'destructive' });
    }
  };

  const onUpdateClass = async (values: z.infer<typeof classSchema>) => {
      if (!editingClass) return;
      const userDocId = localStorage.getItem('userDocId');
      const activeBranchId = localStorage.getItem('activeBranch');
      if (!userDocId || !activeBranchId) return;

      try {
        const dateTime = new Date(`${values.date}T${values.time}`);
        const classRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'classes', editingClass.id);

        await updateDoc(classRef, {
            className: values.className,
            trainerId: values.trainerId,
            capacity: values.capacity,
            location: values.location,
            dateTime: Timestamp.fromDate(dateTime),
        });
        
        toast({ title: 'Success!', description: 'Class details have been updated.' });
        handleFormDialogStateChange(false);
        await fetchAllData();

      } catch (error) {
          console.error("Error updating class:", error);
          toast({ title: 'Error', description: 'Could not update class.', variant: 'destructive'});
      }
  }
  
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
      <LimitReachedDialog isOpen={limitDialogOpen} onOpenChange={setLimitDialogOpen} limits={limitInfo} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Class Schedule</h1>
          <p className="text-muted-foreground">Manage your upcoming group classes and workshops.</p>
        </div>
        <Dialog open={isFormDialogOpen} onOpenChange={handleFormDialogStateChange}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Schedule New Class
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingClass ? 'Edit Class' : 'Schedule a New Class'}</DialogTitle>
              <DialogDescription>{editingClass ? 'Update the details for this class session.' : 'Fill in the details for the new class session.'}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="className" render={({ field }) => ( <FormItem><FormLabel>Class Name</FormLabel><FormControl><Input placeholder="e.g., Morning Yoga" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="trainerId" render={({ field }) => (
                  <FormItem><FormLabel>Assign Trainer</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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
                  <Button type="button" variant="outline" onClick={() => handleFormDialogStateChange(false)}>Cancel</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : (editingClass ? 'Save Changes' : 'Add Class')}
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
                <TableHead>Bookings</TableHead>
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
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                           <Button variant="ghost" size="sm" className="flex gap-2">
                            {cls.booked} / {cls.capacity}
                            <Eye className="h-4 w-4" />
                           </Button>
                        </DialogTrigger>
                        <ViewBookingsDialog members={cls.bookedMembers} />
                      </Dialog>
                    </TableCell>
                    <TableCell className="text-right">
                       <AlertDialog>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setEditingClass(cls)}><Edit className="mr-2 h-4 w-4"/> Edit Class</DropdownMenuItem>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash className="mr-2 h-4 w-4"/> Delete Class</DropdownMenuItem>
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
                                <AlertDialogAction onClick={() => onDeleteClass(cls.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
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

    