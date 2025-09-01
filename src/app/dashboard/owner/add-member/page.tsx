
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDays, format } from 'date-fns';
import { Loader2, User, Calendar as CalendarIcon, Dumbbell, HeartPulse, ChevronLeft, ChevronRight } from 'lucide-react';
import { collection, addDoc, getDocs, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

const formSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  gender: z.string().nonempty({ message: 'Please select a gender.' }),
  dob: z.date({ required_error: 'Date of birth is required.' }),
  phone: z.string().length(10, { message: 'Phone number must be 10 digits.' }),
  email: z.string().email().optional().or(z.literal('')),
  
  membershipType: z.string().nonempty({ message: 'Please select a membership type.' }),
  startDate: z.date({ required_error: 'Start date is required.' }),
  endDate: z.date({ required_error: 'End date is required.' }),
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
    { id: 2, title: 'Membership Details', icon: <Dumbbell />, fields: ['membershipType', 'startDate', 'endDate', 'assignedTrainer', 'plan'] },
    { id: 3, title: 'Health & Fitness', icon: <HeartPulse />, fields: ['height', 'weight', 'medicalConditions', 'fitnessGoal'] },
];

export default function AddMemberPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      gender: '',
      phone: '',
      email: '',
      membershipType: '',
      startDate: new Date(),
      endDate: addDays(new Date(), 30),
      assignedTrainer: '',
      plan: '',
      height: '',
      weight: '',
      medicalConditions: '',
      fitnessGoal: '',
    },
  });

  useEffect(() => {
    const fetchTrainers = async () => {
      const userDocId = localStorage.getItem('userDocId');
      if (!userDocId) return;
      
      const trainersCollection = collection(db, 'gyms', userDocId, 'trainers');
      const trainersSnapshot = await getDocs(trainersCollection);
      const trainersList = trainersSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().fullName }));
      setTrainers(trainersList);
    };

    fetchTrainers();
  }, []);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'membershipType' || name === 'startDate') {
        const { membershipType, startDate } = value;
        if (membershipType && startDate) {
          let endDate = new Date(startDate);
          switch (membershipType) {
            case 'monthly': endDate = addDays(endDate, 30); break;
            case 'quarterly': endDate = addDays(endDate, 90); break;
            case 'half-yearly': endDate = addDays(endDate, 180); break;
            case 'yearly': endDate = addDays(endDate, 365); break;
            case 'trial': endDate = addDays(endDate, 7); break;
          }
          form.setValue('endDate', endDate);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleNext = async () => {
    const fieldsToValidate = steps[currentStep - 1].fields;
    const result = await form.trigger(fieldsToValidate);
    if(result) {
        setCurrentStep((prev) => Math.min(prev + 1, steps.length));
    }
  }
  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const onSubmit = async (data: FormData) => {
    const userDocId = localStorage.getItem('userDocId');
    if (!userDocId) {
      toast({ title: 'Error', description: 'Gym owner session not found.', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);

    try {
      const membersCollection = collection(db, 'gyms', userDocId, 'members');
      await addDoc(membersCollection, {
        ...data,
        dob: Timestamp.fromDate(data.dob),
        startDate: Timestamp.fromDate(data.startDate),
        endDate: Timestamp.fromDate(data.endDate),
        createdAt: Timestamp.now(),
      });

      toast({
        title: 'Member Added!',
        description: `${data.fullName} has been successfully registered.`,
      });
      router.push('/dashboard/owner');
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

  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <Progress value={progress} className="mb-4" />
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {steps[currentStep - 1].icon}
                    </div>
                    <div>
                        <CardTitle>{steps[currentStep - 1].title}</CardTitle>
                        <CardDescription>Step {currentStep} of {steps.length}</CardDescription>
                    </div>
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
                    <FormField control={form.control} name="dob" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Date of Birth</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                            </PopoverContent>
                        </Popover><FormMessage />
                        </FormItem>
                    )} />
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
                        <FormField control={form.control} name="startDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Start Date</FormLabel><FormControl><Input type="date" value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} onChange={e => field.onChange(new Date(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="endDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>End Date</FormLabel><FormControl><Input type="date" value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} onChange={e => field.onChange(new Date(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
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
