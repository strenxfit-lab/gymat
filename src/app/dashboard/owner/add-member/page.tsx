
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDays, format } from 'date-fns';
import { Loader2, User, Calendar as CalendarIcon, Dumbbell, HeartPulse, ChevronLeft, ChevronRight, Building, KeyRound, ClipboardCopy } from 'lucide-react';
import { collection, addDoc, getDocs, doc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';

const formSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  phone: z.string().length(10, { message: 'Phone number must be 10 digits.' }),
  gender: z.string().optional(),
  dob: z.date().optional(),
  email: z.string().email().optional().or(z.literal('')),
  
  membershipType: z.string().optional(),
  startDate: z.date().optional(),
  totalFee: z.string().optional(),
  assignedTrainer: z.string().optional(),
  plan: z.string().optional(),

  height: z.string().optional(),
  weight: z.string().optional(),
  medicalConditions: z.string().optional(),
  fitnessGoal: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;
type FieldName = keyof FormData;

interface Trainer {
  id: string;
  name: string;
}

const steps: { id: number; title: string; icon: JSX.Element; fields: FieldName[] }[] = [
    { id: 1, title: 'Basic Information', icon: <User />, fields: ['fullName', 'gender', 'dob', 'phone', 'email'] },
    { id: 2, title: 'Membership Details', icon: <Dumbbell />, fields: ['membershipType', 'startDate', 'totalFee', 'assignedTrainer', 'plan'] },
    { id: 3, title: 'Health & Fitness', icon: <HeartPulse />, fields: ['height', 'weight', 'medicalConditions', 'fitnessGoal'] },
];

function NoBranchDialog() {
    const router = useRouter();
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <AlertDialog open={true}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>No Branch Found</AlertDialogTitle>
                    <AlertDialogDescription>
                    You need to create a branch before you can add a new member. Please go to the branch management page to add your first branch.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Link href="/dashboard/owner" passHref>
                        <Button variant="outline">Go to Dashboard</Button>
                    </Link>
                    <Button onClick={() => router.push('/dashboard/owner/multi-branch')}>Create Branch</Button>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

export default function AddMemberPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState<{ id: string; name: string; loginId?: string; password?: string; } | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [activeBranchName, setActiveBranchName] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      gender: '',
      phone: '',
      email: '',
      membershipType: '',
      totalFee: '',
      assignedTrainer: '',
      plan: '',
      height: '',
      weight: '',
      medicalConditions: '',
      fitnessGoal: '',
    },
  });

  useEffect(() => {
    setIsMounted(true);
    const branchId = localStorage.getItem('activeBranch');
    setActiveBranchId(branchId);
    
    if (branchId) {
        const userDocId = localStorage.getItem('userDocId');
        if (!userDocId) return;
        const branchRef = doc(db, 'gyms', userDocId, 'branches', branchId);
        getDoc(branchRef).then(docSnap => {
            if (docSnap.exists()) {
                setActiveBranchName(docSnap.data().name);
            }
        });
    }

  }, []);
  
  useEffect(() => {
    const fetchTrainers = async () => {
      const userDocId = localStorage.getItem('userDocId');
      if (!userDocId || !activeBranchId) return;
      
      const trainersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers');
      const trainersSnapshot = await getDocs(trainersCollection);
      const trainersList = trainersSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().fullName }));
      setTrainers(trainersList);
    };
    if (activeBranchId) {
        fetchTrainers();
    }
  }, [activeBranchId]);


  const handleNext = async () => {
    const fieldsToValidate = steps[currentStep - 1].fields;
    const result = await form.trigger(fieldsToValidate as FieldName[]);
    if(result) {
        setCurrentStep((prev) => Math.min(prev + 1, steps.length));
    }
  }
  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const onSubmit = async (data: FormData) => {
    const userDocId = localStorage.getItem('userDocId');
    if (!userDocId || !activeBranchId) {
      toast({ title: 'Error', description: 'Gym owner session or branch not found.', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);

    try {
      const membersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'members');
      
      let endDate;
      const { membershipType, startDate } = data;
      if (membershipType && startDate) {
        let date = new Date(startDate);
        switch (membershipType) {
          case 'monthly': endDate = addDays(date, 30); break;
          case 'quarterly': endDate = addDays(date, 90); break;
          case 'half-yearly': endDate = addDays(date, 180); break;
          case 'yearly': endDate = addDays(date, 365); break;
          case 'trial': endDate = addDays(date, 7); break;
          default: endDate = addDays(date, 30);
        }
      }
      
      const loginId = `${data.fullName.toLowerCase().replace(/\s/g, '')}${Math.floor(1000 + Math.random() * 9000)}`;
      const password = Math.random().toString(36).slice(-8);

      const memberData: any = {
        ...data,
        totalFee: data.totalFee ? parseFloat(data.totalFee) : 0,
        dob: data.dob ? Timestamp.fromDate(data.dob) : null,
        startDate: data.startDate ? Timestamp.fromDate(data.startDate) : null,
        endDate: endDate ? Timestamp.fromDate(endDate) : null,
        createdAt: Timestamp.now(),
        loginId: loginId,
        password: password,
        role: 'member',
        passwordChanged: false
      };

      if (data.membershipType === 'trial') {
        memberData.isTrial = true;
      }

      const newDocRef = await addDoc(membersCollection, memberData);

      setNewMember({ id: newDocRef.id, name: data.fullName, loginId, password });
      setIsDialogOpen(true);

    } catch (error) {
      console.error("Error adding member:", error);
      toast({
        title: 'Error',
        description: 'Could not add member. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard/owner');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Credentials copied to clipboard.' });
  }

  const progress = (currentStep / steps.length) * 100;
  
  if (!isMounted) {
    return null; // Or a loading spinner
  }

  if (!activeBranchId) {
    return <NoBranchDialog />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Member Added Successfully!</AlertDialogTitle>
            <AlertDialogDescription>
              Login credentials for {newMember?.name} have been created.
            </AlertDialogDescription>
          </AlertDialogHeader>
            <div className="space-y-4 my-4">
                <div className="space-y-2">
                    <Label htmlFor="loginId">Login ID</Label>
                    <div className="flex items-center gap-2">
                        <Input id="loginId" value={newMember?.loginId || ''} readOnly />
                         <Button variant="outline" size="icon" onClick={() => copyToClipboard(newMember?.loginId || '')}><ClipboardCopy className="h-4 w-4" /></Button>
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                     <div className="flex items-center gap-2">
                        <Input id="password" value={newMember?.password || ''} readOnly />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(newMember?.password || '')}><ClipboardCopy className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={handleGoToDashboard}>Done</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

        <Card className="w-full max-w-2xl">
            <CardHeader>
                <Progress value={progress} className="mb-4" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          {steps[currentStep - 1].icon}
                      </div>
                      <div>
                          <CardTitle>{steps[currentStep - 1].title}</CardTitle>
                          <CardDescription>Step {currentStep} of {steps.length}</CardDescription>
                      </div>
                  </div>
                  {activeBranchName && <div className="text-sm font-medium text-muted-foreground">Branch: {activeBranchName}</div>}
                </div>
            </CardHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4 min-h-[350px]">
                
                {currentStep === 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <FormField control={form.control} name="fullName" render={({ field }) => ( <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="gender" render={({ field }) => (
                        <FormItem><FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                            <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                        </Select><FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="dob" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} onChange={e => field.onChange(new Date(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="9876543210" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="email" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Email (Optional)</FormLabel><FormControl><Input type="email" placeholder="john.doe@example.com" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                )}
                {currentStep === 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        <FormField control={form.control} name="membershipType" render={({ field }) => (
                            <FormItem><FormLabel>Membership Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                                <SelectContent><SelectItem value="trial">Trial</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="half-yearly">Half-Yearly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent>
                            </Select><FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="totalFee" render={({ field }) => ( <FormItem><FormLabel>Total Fee (₹)</FormLabel><FormControl><Input type="number" placeholder="1500" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="startDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Start Date</FormLabel><FormControl><Input type="date" value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} onChange={e => field.onChange(new Date(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                        
                        <FormField control={form.control} name="assignedTrainer" render={({ field }) => (
                            <FormItem><FormLabel>Assigned Trainer (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select trainer" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {trainers.map(trainer => <SelectItem key={trainer.id} value={trainer.id}>{trainer.name}</SelectItem>)}
                                    {trainers.length === 0 && <p className="p-2 text-sm text-muted-foreground">No trainers found</p>}
                                </SelectContent>
                            </Select><FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="plan" render={({ field }) => (
                            <FormItem className="md:col-span-2"><FormLabel>Plan/Package (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger></FormControl>
                                <SelectContent><SelectItem value="gym">Gym</SelectItem><SelectItem value="personal-training">Personal Training</SelectItem><SelectItem value="weight-loss">Weight Loss</SelectItem><SelectItem value="bodybuilding">Bodybuilding</SelectItem></SelectContent>
                            </Select><FormMessage />
                            </FormItem>
                        )} />
                    </div>
                )}
                {currentStep === 3 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <FormField control={form.control} name="height" render={({ field }) => ( <FormItem><FormLabel>Height (cm)</FormLabel><FormControl><Input placeholder="175" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="weight" render={({ field }) => ( <FormItem><FormLabel>Weight (kg)</FormLabel><FormControl><Input placeholder="70" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="fitnessGoal" render={({ field }) => (
                            <FormItem className="md:col-span-2"><FormLabel>Fitness Goal (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select goal" /></SelectTrigger></FormControl>
                                <SelectContent><SelectItem value="weight-loss">Weight Loss</SelectItem><SelectItem value="muscle-gain">Muscle Gain</SelectItem><SelectItem value="general-fitness">General Fitness</SelectItem><SelectItem value="strength">Strength</SelectItem></SelectContent>
                            </Select><FormMessage />
                            </FormItem>
                    )} />
                    <FormField control={form.control} name="medicalConditions" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Medical Conditions (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Asthma, previous injuries..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                )}
                </CardContent>
                <CardFooter>
                    <div className="w-full flex justify-between">
                        {currentStep > 1 ? (
                             <Button type="button" variant="outline" onClick={handleBack}><ChevronLeft className="mr-2 h-4 w-4" /> Back</Button>
                        ) : (
                            <Link href="/dashboard/owner" passHref>
                                <Button type="button" variant="outline">Cancel</Button>
                            </Link>
                        )}
                        
                        <div className="flex-grow"></div>

                        {currentStep < steps.length && <Button type="button" onClick={handleNext}>Next <ChevronRight className="ml-2 h-4 w-4" /></Button>}
                        {currentStep === steps.length && (
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin" /> : 'Add Member'}
                            </Button>
                        )}
                    </div>
                </CardFooter>
            </form>
            </Form>
        </Card>
    </div>
  );
}

    
