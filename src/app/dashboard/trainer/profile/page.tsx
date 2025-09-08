
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, Timestamp, collection, query, where, getDocs, addDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, User, Briefcase, Wallet, Calendar, Mail, Phone, Clock, Edit, Star, HeartPulse, Dumbbell, Notebook, Utensils, Users } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';


const shiftFormSchema = z.object({
  shiftTiming: z.string().nonempty({ message: 'Please select a shift.' }),
});
type ShiftFormData = z.infer<typeof shiftFormSchema>;

const notesFormSchema = z.object({
  note: z.string().min(1, 'Note cannot be empty.'),
});
type NotesFormData = z.infer<typeof notesFormSchema>;

const dietFormSchema = z.object({
    breakfast: z.string().min(1, 'Breakfast details are required.'),
    lunch: z.string().min(1, 'Lunch details are required.'),
    dinner: z.string().min(1, 'Dinner details are required.'),
    snacks: z.string().optional(),
});
type DietFormData = z.infer<typeof dietFormSchema>;


interface TrainerDetails {
  fullName: string;
  gender: string;
  dob: string;
  phone: string;
  email: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  designation: string;
  specialization?: string;
  experience?: string;
  joiningDate: string;
  certifications?: string;
  salaryType: string;
  salaryRate: string;
  averageRating?: number;
  ratingCount?: number;
}

interface AssignedMember {
    id: string;
    fullName: string;
    dob: string;
    height?: string;
    weight?: string;
    fitnessGoal?: string;
}

interface PrivateNote {
    id: string;
    note: string;
    createdAt: Date;
}

interface DietPlan {
    id: string;
    sentAt: Date;
    breakfast: string;
    lunch: string;
    dinner: string;
    snacks?: string;
}


const DetailItem = ({ label, value }: { label: string; value: string | undefined }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="font-semibold">{value || 'N/A'}</p>
    </div>
);

export default function TrainerProfilePage() {
  const [trainer, setTrainer] = useState<TrainerDetails | null>(null);
  const [assignedMembers, setAssignedMembers] = useState<AssignedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [isDietDialogOpen, setIsDietDialogOpen] = useState(false);
  const [selectedMemberForNotes, setSelectedMemberForNotes] = useState<AssignedMember | null>(null);
  const [selectedMemberForDiet, setSelectedMemberForDiet] = useState<AssignedMember | null>(null);
  const [memberNotes, setMemberNotes] = useState<PrivateNote[]>([]);
  const [dietHistory, setDietHistory] = useState<DietPlan[]>([]);
  const [isFetchingNotes, setIsFetchingNotes] = useState(false);
  const [isFetchingDiet, setIsFetchingDiet] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const shiftForm = useForm<ShiftFormData>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: { shiftTiming: '' },
  });
  
  const notesForm = useForm<NotesFormData>({
    resolver: zodResolver(notesFormSchema),
    defaultValues: { note: '' },
  });
  
  const dietForm = useForm<DietFormData>({
    resolver: zodResolver(dietFormSchema),
    defaultValues: { breakfast: '', lunch: '', dinner: '', snacks: '' },
  });


  useEffect(() => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    const trainerId = localStorage.getItem('trainerId');

    if (!userDocId || !activeBranchId || !trainerId) {
      toast({ title: 'Error', description: 'Session data not found.', variant: 'destructive' });
      router.push('/dashboard/trainer');
      return;
    }

    const fetchTrainerData = async () => {
      try {
        const trainerRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers', trainerId);
        const trainerSnap = await getDoc(trainerRef);

        if (!trainerSnap.exists()) {
          toast({ title: 'Error', description: 'Trainer not found.', variant: 'destructive' });
          router.push('/dashboard/trainer');
          return;
        }
        
        const data = trainerSnap.data();
        setTrainer({
            fullName: data.fullName,
            gender: data.gender,
            dob: (data.dob as Timestamp)?.toDate().toLocaleDateString(),
            phone: data.phone,
            email: data.email,
            address: data.address,
            emergencyContactName: data.emergencyContactName,
            emergencyContactNumber: data.emergencyContactNumber,
            designation: data.designation,
            specialization: data.specialization,
            experience: data.experience ? `${data.experience} years` : undefined,
            joiningDate: (data.joiningDate as Timestamp)?.toDate().toLocaleDateString(),
            certifications: data.certifications,
            salaryType: data.salaryType,
            salaryRate: data.salaryRate,
            averageRating: data.ratings?.averageRating,
            ratingCount: data.ratings?.ratingCount,
        });
        shiftForm.setValue('shiftTiming', data.shiftTiming);
        
        const membersRef = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'members');
        const q = query(membersRef, where('assignedTrainer', '==', trainerId));
        const membersSnap = await getDocs(q);
        const membersList = membersSnap.docs.map(doc => {
            const memberData = doc.data();
            return {
                id: doc.id,
                fullName: memberData.fullName,
                dob: (memberData.dob as Timestamp)?.toDate().toLocaleDateString() || 'N/A',
                height: memberData.height,
                weight: memberData.weight,
                fitnessGoal: memberData.fitnessGoal
            }
        });
        setAssignedMembers(membersList);

      } catch (error) {
        console.error("Error fetching trainer data:", error);
        toast({ title: 'Error', description: 'Failed to fetch trainer details.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchTrainerData();
  }, [router, toast, shiftForm]);

  const onShiftSubmit = async (data: ShiftFormData) => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    const trainerId = localStorage.getItem('trainerId');
    if (!userDocId || !activeBranchId || !trainerId) return;

    try {
        const trainerRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers', trainerId);
        await updateDoc(trainerRef, { shiftTiming: data.shiftTiming });
        toast({ title: "Success!", description: "Your shift has been updated." });
        setIsEditing(false);
    } catch (error) {
        console.error("Error updating shift:", error);
        toast({ title: "Error", description: "Could not update your shift timing.", variant: "destructive" });
    }
  }

  const handleOpenNotesDialog = async (member: AssignedMember) => {
    setSelectedMemberForNotes(member);
    setIsNotesDialogOpen(true);
    setIsFetchingNotes(true);
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    const trainerId = localStorage.getItem('trainerId');
    if (!userDocId || !activeBranchId || !trainerId) return;

    try {
        const notesCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers', trainerId, 'privateNotes');
        const q = query(notesCollection, where('memberId', '==', member.id), orderBy('createdAt', 'desc'));
        const notesSnap = await getDocs(q);
        const notesList = notesSnap.docs.map(d => ({
            id: d.id,
            note: d.data().note,
            createdAt: (d.data().createdAt as Timestamp).toDate(),
        }));
        setMemberNotes(notesList);
    } catch(e) {
        console.error("Error fetching notes: ", e);
        toast({ title: "Error", description: "Could not fetch notes.", variant: "destructive"});
    } finally {
        setIsFetchingNotes(false);
    }
  }

  const handleOpenDietDialog = async (member: AssignedMember) => {
    setSelectedMemberForDiet(member);
    setIsDietDialogOpen(true);
    setIsFetchingDiet(true);
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId) return;

    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const dietPlansCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', member.id, 'dietPlans');
        const q = query(dietPlansCollection, where('sentAt', '>=', Timestamp.fromDate(sevenDaysAgo)), orderBy('sentAt', 'desc'));
        const dietPlansSnap = await getDocs(q);
        const plansList = dietPlansSnap.docs.map(d => ({
            id: d.id,
            sentAt: (d.data().sentAt as Timestamp).toDate(),
            breakfast: d.data().breakfast,
            lunch: d.data().lunch,
            dinner: d.data().dinner,
            snacks: d.data().snacks,
        }));
        setDietHistory(plansList);
    } catch (e) {
        console.error("Error fetching diet history: ", e);
        toast({ title: "Error", description: "Could not fetch diet history.", variant: "destructive" });
    } finally {
        setIsFetchingDiet(false);
    }
  }


  const onNoteSubmit = async (data: NotesFormData) => {
    if (!selectedMemberForNotes) return;
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    const trainerId = localStorage.getItem('trainerId');
    if (!userDocId || !activeBranchId || !trainerId) return;

    try {
        const notesCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers', trainerId, 'privateNotes');
        await addDoc(notesCollection, {
            memberId: selectedMemberForNotes.id,
            note: data.note,
            createdAt: Timestamp.now(),
        });
        toast({ title: "Note Saved!", description: "Your private note has been saved."});
        notesForm.reset();
        await handleOpenNotesDialog(selectedMemberForNotes); // Refresh notes
    } catch(e) {
         console.error("Error saving note: ", e);
         toast({ title: "Error", description: "Could not save your note.", variant: "destructive"});
    }
  }

  const onDietSubmit = async (data: DietFormData) => {
    if (!selectedMemberForDiet) return;
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    const trainerId = localStorage.getItem('trainerId');
    if (!userDocId || !activeBranchId || !trainerId) return;

    try {
        const dietCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', selectedMemberForDiet.id, 'dietPlans');
        await addDoc(dietCollection, {
            ...data,
            sentByTrainerId: trainerId,
            sentAt: Timestamp.now(),
        });
        toast({ title: "Diet Plan Sent!", description: `A new diet plan has been sent to ${selectedMemberForDiet.fullName}.`});
        dietForm.reset();
        setIsDietDialogOpen(false);
    } catch (e) {
        console.error("Error sending diet plan: ", e);
        toast({ title: "Error", description: "Could not send the diet plan.", variant: "destructive"});
    }
  };


  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!trainer) {
    return <div className="flex min-h-screen items-center justify-center bg-background">Trainer not found.</div>;
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{trainer.fullName}</h1>
          <p className="text-muted-foreground">My Profile</p>
        </div>
        <Link href="/dashboard/trainer" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Dashboard</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User /> Personal Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <DetailItem label="Gender" value={trainer.gender} />
                    <DetailItem label="Date of Birth" value={trainer.dob} />
                    <DetailItem label="Phone" value={trainer.phone} />
                    <DetailItem label="Email" value={trainer.email} />
                    <DetailItem label="Address" value={trainer.address} />
                    <Separator/>
                    <DetailItem label="Emergency Contact Name" value={trainer.emergencyContactName} />
                    <DetailItem label="Emergency Contact Number" value={trainer.emergencyContactNumber} />
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Briefcase /> Professional Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <DetailItem label="Designation" value={trainer.designation} />
                    <DetailItem label="Specialization" value={trainer.specialization} />
                    <DetailItem label="Experience" value={trainer.experience} />
                    <DetailItem label="Joining Date" value={trainer.joiningDate} />
                     <div className="col-span-2">
                        <p className="text-sm font-medium text-muted-foreground">Rating</p>
                        <div className="flex items-center gap-2 font-semibold">
                            {trainer.averageRating ? (
                                <>
                                    <Star className="h-5 w-5 text-yellow-400 fill-yellow-400"/>
                                    <span>{trainer.averageRating.toFixed(1)} / 5</span>
                                    <span className="text-xs text-muted-foreground">({trainer.ratingCount} ratings)</span>
                                </>
                            ) : (
                                <span>No ratings yet</span>
                            )}
                        </div>
                    </div>
                    <div className="col-span-2"><DetailItem label="Certifications" value={trainer.certifications} /></div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Wallet /> Financial Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <DetailItem label="Salary Type" value={trainer.salaryType} />
                    <DetailItem label="Salary / Pay Rate" value={`₹${trainer.salaryRate}`} />
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2"><Clock /> Shift Timing</CardTitle>
                        {!isEditing && <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}><Edit className="mr-2 h-4 w-4"/>Change</Button>}
                    </div>
                </CardHeader>
                <Form {...shiftForm}>
                    <form onSubmit={shiftForm.handleSubmit(onShiftSubmit)}>
                        <CardContent>
                            {isEditing ? (
                                <FormField
                                    control={shiftForm.control}
                                    name="shiftTiming"
                                    render={({ field }) => (
                                        <FormItem><FormLabel>Update Your Shift</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger></FormControl>
                                            <SelectContent><SelectItem value="morning">Morning</SelectItem><SelectItem value="evening">Evening</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent>
                                        </Select><FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ) : (
                                <DetailItem label="Current Shift" value={shiftForm.getValues('shiftTiming')} />
                            )}
                        </CardContent>
                        {isEditing && (
                            <CardFooter className="justify-end gap-2">
                                <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                                <Button type="submit" disabled={shiftForm.formState.isSubmitting}>
                                    {shiftForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Save Shift'}
                                </Button>
                            </CardFooter>
                        )}
                    </form>
                </Form>
            </Card>

            <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
            <Dialog open={isDietDialogOpen} onOpenChange={setIsDietDialogOpen}>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users /> My Students</CardTitle>
                    <CardDescription>Members who have assigned you as their trainer.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Goal</TableHead>
                                <TableHead>H/W</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {assignedMembers.length > 0 ? (
                            assignedMembers.map((member) => (
                            <TableRow key={member.id}>
                                <TableCell className="font-medium">{member.fullName}</TableCell>
                                <TableCell>{member.fitnessGoal || 'N/A'}</TableCell>
                                <TableCell>{member.height || 'N/A'}cm / {member.weight || 'N/A'}kg</TableCell>
                                <TableCell className="flex gap-2">
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" onClick={() => handleOpenNotesDialog(member)}>
                                            <Notebook className="mr-2 h-4 w-4"/> Notes
                                        </Button>
                                    </DialogTrigger>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" onClick={() => handleOpenDietDialog(member)}>
                                            <Utensils className="mr-2 h-4 w-4" /> Diet
                                        </Button>
                                    </DialogTrigger>
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                No members have assigned you as their trainer yet.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            
            {/* Notes Dialog */}
            <DialogContent className="max-w-2xl">
                 <DialogHeader>
                    <DialogTitle>Private Notes for {selectedMemberForNotes?.fullName}</DialogTitle>
                    <DialogDescription>These notes are only visible to you.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-4">
                        <h4 className="font-semibold">Add a New Note</h4>
                        <Form {...notesForm}>
                            <form onSubmit={notesForm.handleSubmit(onNoteSubmit)} className="space-y-4">
                                <FormField
                                    control={notesForm.control}
                                    name="note"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormControl>
                                            <Textarea placeholder="e.g., 'Focused on form correction for squats today...'" {...field} className="min-h-[150px]"/>
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" disabled={notesForm.formState.isSubmitting}>
                                     {notesForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Save Note'}
                                </Button>
                            </form>
                        </Form>
                    </div>
                    <div className="space-y-4">
                        <h4 className="font-semibold">Past Notes</h4>
                        <div className="max-h-64 overflow-y-auto space-y-3 pr-2 border-l pl-4">
                           {isFetchingNotes ? <Loader2 className="animate-spin"/> : (
                             memberNotes.length > 0 ? memberNotes.map(note => (
                                <div key={note.id} className="text-sm bg-muted/50 p-3 rounded-md">
                                    <p className="text-xs text-muted-foreground mb-1">{note.createdAt.toLocaleString()}</p>
                                    <p>{note.note}</p>
                                </div>
                             )) : <p className="text-sm text-muted-foreground">No notes for this member yet.</p>
                           )}
                        </div>
                    </div>
                </div>
            </DialogContent>
            </Dialog>

            {/* Diet Dialog */}
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Send Diet Plan to {selectedMemberForDiet?.fullName}</DialogTitle>
                    <DialogDescription>Create a diet plan for your student. They will be notified.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-4">
                         <h4 className="font-semibold">New Diet Plan</h4>
                        <Form {...dietForm}>
                            <form onSubmit={dietForm.handleSubmit(onDietSubmit)} className="space-y-4">
                                <FormField control={dietForm.control} name="breakfast" render={({ field }) => (<FormItem><FormLabel>Breakfast</FormLabel><FormControl><Textarea placeholder="e.g., Oats with fruits and nuts" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={dietForm.control} name="lunch" render={({ field }) => (<FormItem><FormLabel>Lunch</FormLabel><FormControl><Textarea placeholder="e.g., Grilled chicken with brown rice and salad" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={dietForm.control} name="dinner" render={({ field }) => (<FormItem><FormLabel>Dinner</FormLabel><FormControl><Textarea placeholder="e.g., Paneer stir-fry with vegetables" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={dietForm.control} name="snacks" render={({ field }) => (<FormItem><FormLabel>Snacks (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Greek yogurt, a handful of almonds" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsDietDialogOpen(false)}>Cancel</Button>
                                    <Button type="submit" disabled={dietForm.formState.isSubmitting}>
                                        {dietForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Send Diet Plan'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </div>
                    <div className="space-y-4">
                         <h4 className="font-semibold">Recent History (Last 7 Days)</h4>
                         <div className="max-h-96 overflow-y-auto space-y-3 pr-2 border-l pl-4">
                            {isFetchingDiet ? <Loader2 className="animate-spin" /> : (
                                dietHistory.length > 0 ? dietHistory.map(plan => (
                                    <div key={plan.id} className="text-sm bg-muted/50 p-3 rounded-md">
                                        <p className="font-semibold mb-2">Sent on: {plan.sentAt.toLocaleDateString()}</p>
                                        <div className="space-y-2">
                                            <p><strong className="font-medium">B:</strong> {plan.breakfast}</p>
                                            <p><strong className="font-medium">L:</strong> {plan.lunch}</p>
                                            <p><strong className="font-medium">D:</strong> {plan.dinner}</p>
                                            {plan.snacks && <p><strong className="font-medium">S:</strong> {plan.snacks}</p>}
                                        </div>
                                    </div>
                                )) : <p className="text-sm text-muted-foreground">No diet plans sent in the last 7 days.</p>
                            )}
                         </div>
                    </div>
                </div>
            </DialogContent>
            </Dialog>
        </div>
      </div>
    </div>
  );
}

    