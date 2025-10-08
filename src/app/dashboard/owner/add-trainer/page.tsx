
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Loader2, User, Briefcase, Wallet, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Building, KeyRound, ClipboardCopy, LayoutDashboard } from 'lucide-react';
import { collection, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';

const formSchema = z.object({
  // Personal Info
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  gender: z.string().nonempty({ message: 'Please select a gender.' }),
  dob: z.date({ required_error: 'Date of birth is required.' }),
  phone: z.string().length(10, { message: 'Phone number must be 10 digits.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactNumber: z.string().optional(),
  
  // Professional Details
  designation: z.string().nonempty({ message: 'Please select a designation.' }),
  specialization: z.string().optional(),
  experience: z.string().optional(),
  certifications: z.string().optional(),
  joiningDate: z.date({ required_error: 'Joining date is required.' }),
  shiftTiming: z.string().nonempty({ message: 'Please select a shift.' }),

  // Financial Info
  salaryType: z.string().nonempty({ message: 'Please select a salary type.' }),
  salaryRate: z.string().min(1, { message: 'Please enter salary/pay rate.' }),
  bankDetails: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;
type FieldName = keyof FormData;

const steps: { id: number; title: string; icon: JSX.Element; fields: FieldName[] }[] = [
    { id: 1, title: 'Personal Information', icon: <User />, fields: ['fullName', 'gender', 'dob', 'phone', 'email', 'address', 'emergencyContactName', 'emergencyContactNumber'] },
    { id: 2, title: 'Professional Details', icon: <Briefcase />, fields: ['designation', 'specialization', 'experience', 'certifications', 'joiningDate', 'shiftTiming'] },
    { id: 3, title: 'Financial Information', icon: <Wallet />, fields: ['salaryType', 'salaryRate', 'bankDetails'] },
];

interface NewTrainerInfo {
  name: string;
  loginId?: string;
  password?: string;
}

function NoBranchDialog() {
    const router = useRouter();
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <AlertDialog open={true}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>No Branch Found</AlertDialogTitle>
                    <AlertDialogDescription>
                    You need to create a branch before you can add a new trainer. Please go to the branch management page to add your first branch.
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

export default function AddTrainerPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [activeBranchName, setActiveBranchName] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTrainer, setNewTrainer] = useState<NewTrainerInfo | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      gender: '',
      phone: '',
      email: '',
      address: '',
      emergencyContactName: '',
      emergencyContactNumber: '',
      designation: '',
      specialization: '',
      experience: '',
      certifications: '',
      shiftTiming: '',
      salaryType: '',
      salaryRate: '',
      bankDetails: '',
    },
  });

  useEffect(() => {
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
      const trainersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers');
      
      const loginId = data.phone;
      const password = Math.random().toString(36).slice(-8);

      await addDoc(trainersCollection, {
        ...data,
        dob: Timestamp.fromDate(data.dob),
        joiningDate: Timestamp.fromDate(data.joiningDate),
        createdAt: Timestamp.now(),
        loginId: loginId,
        password: password,
        role: 'trainer',
        passwordChanged: false,
      });

      setNewTrainer({ name: data.fullName, loginId, password });
      setIsDialogOpen(true);

    } catch (error) {
      console.error("Error adding trainer:", error);
      toast({
        title: 'Error',
        description: 'Could not add trainer. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Credentials copied to clipboard.' });
  }

  const progress = (currentStep / steps.length) * 100;
  
  if (!activeBranchId && typeof window !== 'undefined' && localStorage.getItem('userDocId')) {
      return <NoBranchDialog />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Trainer Added Successfully!</AlertDialogTitle>
                <AlertDialogDescription>
                Login credentials for {newTrainer?.name} have been created.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 my-4">
                <div className="space-y-2">
                    <Label htmlFor="loginId">Login ID (Phone No.)</Label>
                    <div className="flex items-center gap-2">
                        <Input id="loginId" value={newTrainer?.loginId || ''} readOnly />
                         <Button variant="outline" size="icon" onClick={() => copyToClipboard(newTrainer?.loginId || '')}><ClipboardCopy className="h-4 w-4" /></Button>
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                     <div className="flex items-center gap-2">
                        <Input id="password" value={newTrainer?.password || ''} readOnly />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(newTrainer?.password || '')}><ClipboardCopy className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>
            <AlertDialogFooter>
                <AlertDialogAction onClick={() => router.push('/dashboard/owner')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Go to Dashboard
                </AlertDialogAction>
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
                    <CardContent className="space-y-4 min-h-[380px]">
                    {currentStep === 1 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        <FormField control={form.control} name="fullName" render={({ field }) => ( <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Jane Smith" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="gender" render={({ field }) => (
                            <FormItem><FormLabel>Gender</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                                <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                            </Select><FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="dob" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} onChange={e => field.onChange(e.target.value ? new Date(e.target.value) : undefined)} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="9876543210" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="jane.s@example.com" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="address" render={({ field }) => ( <FormItem><FormLabel>Address (Optional)</FormLabel><FormControl><Input placeholder="123 Wellness Way" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="emergencyContactName" render={({ field }) => ( <FormItem><FormLabel>Emergency Contact Name</FormLabel><FormControl><Input placeholder="John Smith" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="emergencyContactNumber" render={({ field }) => ( <FormItem><FormLabel>Emergency Contact Number</FormLabel><FormControl><Input placeholder="9876543210" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                    )}
                    {currentStep === 2 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                            <FormField control={form.control} name="designation" render={({ field }) => (
                                <FormItem><FormLabel>Designation</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="trainer">Trainer</SelectItem><SelectItem value="yoga-instructor">Yoga Instructor</SelectItem><SelectItem value="zumba-instructor">Zumba Instructor</SelectItem><SelectItem value="crossfit-coach">CrossFit Coach</SelectItem><SelectItem value="coach">Coach</SelectItem></SelectContent>
                                </Select><FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="specialization" render={({ field }) => ( <FormItem><FormLabel>Specialization (Optional)</FormLabel><FormControl><Input placeholder="e.g., Weight Training" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="experience" render={({ field }) => ( <FormItem><FormLabel>Experience (Years, Optional)</FormLabel><FormControl><Input type="number" placeholder="5" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="joiningDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Joining Date</FormLabel><FormControl><Input type="date" value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} onChange={e => field.onChange(e.target.value ? new Date(e.target.value) : undefined)} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="shiftTiming" render={({ field }) => (
                                <FormItem><FormLabel>Shift Timing</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="morning">Morning</SelectItem><SelectItem value="evening">Evening</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent>
                                </Select><FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="certifications" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Certifications (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., ACE Certified, ISSA" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                    )}
                    {currentStep === 3 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        <FormField control={form.control} name="salaryType" render={({ field }) => (
                                <FormItem><FormLabel>Salary Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="fixed">Fixed</SelectItem><SelectItem value="commission">Commission Based</SelectItem><SelectItem value="hourly">Hourly</SelectItem></SelectContent>
                                </Select><FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="salaryRate" render={({ field }) => ( <FormItem><FormLabel>Salary / Pay Rate</FormLabel><FormControl><Input type="number" placeholder="30000" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="bankDetails" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Bank Details (Optional)</FormLabel><FormControl><Textarea placeholder="Bank Name, Account Number, IFSC Code" {...field} /></FormControl><FormMessage /></FormItem> )} />
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
                                    {isLoading ? <Loader2 className="animate-spin" /> : 'Add Trainer'}
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

    
    
