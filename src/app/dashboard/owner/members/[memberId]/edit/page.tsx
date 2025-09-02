
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDays, format } from 'date-fns';
import { Loader2, User, Dumbbell, HeartPulse, ArrowLeft } from 'lucide-react';
import { doc, Timestamp, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  phone: z.string().length(10, { message: 'Phone number must be 10 digits.' }),
  gender: z.string().optional(),
  dob: z.date().optional(),
  email: z.string().email().optional().or(z.literal('')),
  
  membershipType: z.string().optional(),
  startDate: z.date().optional(),
  totalFee: z.string().optional(),
  plan: z.string().optional(),

  height: z.string().optional(),
  weight: z.string().optional(),
  medicalConditions: z.string().optional(),
  fitnessGoal: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function EditMemberPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const memberId = params.memberId as string;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');

    if (!userDocId || !activeBranchId || !memberId) {
      toast({ title: 'Error', description: 'Session, branch, or member ID not found.', variant: 'destructive' });
      router.push('/dashboard/owner/members');
      return;
    }

    const fetchMemberData = async () => {
      try {
        const memberRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', memberId);
        const memberSnap = await getDoc(memberRef);

        if (memberSnap.exists()) {
          const data = memberSnap.data();
          const defaultValues = {
            ...data,
            dob: data.dob ? (data.dob as Timestamp).toDate() : undefined,
            startDate: data.startDate ? (data.startDate as Timestamp).toDate() : undefined,
            totalFee: data.totalFee?.toString(),
            height: data.height?.toString(),
            weight: data.weight?.toString(),
          };
          form.reset(defaultValues);
        } else {
          toast({ title: 'Not Found', description: 'Member data could not be found.', variant: 'destructive' });
          router.push('/dashboard/owner/members');
        }
      } catch (error) {
        console.error("Error fetching member:", error);
        toast({ title: 'Error', description: 'Failed to fetch member details.', variant: 'destructive' });
      } finally {
        setIsFetching(false);
      }
    };

    fetchMemberData();
  }, [memberId, router, toast, form]);

  const onSubmit = async (data: FormData) => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId || !memberId) {
      toast({ title: 'Error', description: 'Session or identifiers missing.', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);

    try {
      const memberRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', memberId);
      
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
        }
      }
      
      const memberData: any = {
        ...data,
        totalFee: data.totalFee ? parseFloat(data.totalFee) : 0,
        dob: data.dob ? Timestamp.fromDate(data.dob) : null,
        startDate: data.startDate ? Timestamp.fromDate(data.startDate) : null,
        endDate: endDate ? Timestamp.fromDate(endDate) : undefined,
      };

      await updateDoc(memberRef, memberData);

      toast({ title: 'Success!', description: 'Member details updated successfully.' });
      router.push(`/dashboard/owner/members/${memberId}`);
    } catch (error) {
      console.error("Error updating member:", error);
      toast({ title: 'Error', description: 'Could not update member. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading member details...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-3xl">
            <CardHeader>
                <CardTitle>Edit Member Profile</CardTitle>
                <CardDescription>Update the details for {form.getValues('fullName')}.</CardDescription>
            </CardHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-8">
                    {/* Basic Information */}
                    <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2"><User /> Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="fullName" render={({ field }) => ( <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="gender" render={({ field }) => (
                                <FormItem><FormLabel>Gender</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                                </Select><FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="dob" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''} onChange={e => field.onChange(new Date(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="9876543210" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="email" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Email (Optional)</FormLabel><FormControl><Input type="email" placeholder="john.doe@example.com" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                    </div>

                     {/* Membership Details */}
                    <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2"><Dumbbell /> Membership Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="membershipType" render={({ field }) => (
                                <FormItem><FormLabel>Membership Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="trial">Trial</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="half-yearly">Half-Yearly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent>
                                </Select><FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="totalFee" render={({ field }) => ( <FormItem><FormLabel>Total Fee (₹)</FormLabel><FormControl><Input type="number" placeholder="1500" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="startDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Start Date</FormLabel><FormControl><Input type="date" value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''} onChange={e => field.onChange(new Date(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="plan" render={({ field }) => (
                                <FormItem><FormLabel>Plan/Package (Optional)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="gym">Gym</SelectItem><SelectItem value="personal-training">Personal Training</SelectItem><SelectItem value="weight-loss">Weight Loss</SelectItem><SelectItem value="bodybuilding">Bodybuilding</SelectItem></SelectContent>
                                </Select><FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    </div>
                    
                    {/* Health & Fitness */}
                    <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2"><HeartPulse /> Health & Fitness</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="height" render={({ field }) => ( <FormItem><FormLabel>Height (cm)</FormLabel><FormControl><Input placeholder="175" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="weight" render={({ field }) => ( <FormItem><FormLabel>Weight (kg)</FormLabel><FormControl><Input placeholder="70" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="fitnessGoal" render={({ field }) => (
                                    <FormItem className="md:col-span-2"><FormLabel>Fitness Goal (Optional)</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select goal" /></SelectTrigger></FormControl>
                                        <SelectContent><SelectItem value="weight-loss">Weight Loss</SelectItem><SelectItem value="muscle-gain">Muscle Gain</SelectItem><SelectItem value="general-fitness">General Fitness</SelectItem><SelectItem value="strength">Strength</SelectItem></SelectContent>
                                    </Select><FormMessage />
                                    </FormItem>
                            )} />
                            <FormField control={form.control} name="medicalConditions" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Medical Conditions (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Asthma, previous injuries..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                    </div>

                </CardContent>
                <CardFooter className="flex justify-between">
                     <Link href={`/dashboard/owner/members/${memberId}`} passHref>
                        <Button type="button" variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Cancel</Button>
                    </Link>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Save Changes'}
                    </Button>
                </CardFooter>
            </form>
            </Form>
        </Card>
    </div>
  );
}
