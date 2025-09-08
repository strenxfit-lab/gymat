
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from 'date-fns';
import { doc, Timestamp, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, User, Briefcase, Wallet, ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  gender: z.string().nonempty({ message: 'Please select a gender.' }),
  dob: z.string().nonempty({ message: 'Date of birth is required.' }),
  phone: z.string().length(10, { message: 'Phone number must be 10 digits.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactNumber: z.string().optional(),
  designation: z.string().nonempty({ message: 'Please select a designation.' }),
  specialization: z.string().optional(),
  experience: z.string().optional(),
  certifications: z.string().optional(),
  joiningDate: z.string().nonempty({ message: 'Joining date is required.' }),
  shiftTiming: z.string().nonempty({ message: 'Please select a shift.' }),
  salaryType: z.string().nonempty({ message: 'Please select a salary type.' }),
  salaryRate: z.string().min(1, { message: 'Please enter salary/pay rate.' }),
  bankDetails: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function EditTrainerPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const trainerId = params.trainerId as string;

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
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');

    if (!userDocId || !activeBranchId || !trainerId) {
      toast({ title: 'Error', description: 'Session, branch, or trainer ID not found.', variant: 'destructive' });
      router.push('/dashboard/owner/members');
      return;
    }

    const fetchData = async () => {
      try {
        const trainerRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers', trainerId);
        const trainerSnap = await getDoc(trainerRef);

        if (trainerSnap.exists()) {
          const data = trainerSnap.data();
          form.reset({
            fullName: data.fullName || '',
            gender: data.gender || '',
            dob: data.dob ? format((data.dob as Timestamp).toDate(), 'yyyy-MM-dd') : '',
            phone: data.phone || '',
            email: data.email || '',
            address: data.address || '',
            emergencyContactName: data.emergencyContactName || '',
            emergencyContactNumber: data.emergencyContactNumber || '',
            designation: data.designation || '',
            specialization: data.specialization || '',
            experience: data.experience || '',
            certifications: data.certifications || '',
            joiningDate: data.joiningDate ? format((data.joiningDate as Timestamp).toDate(), 'yyyy-MM-dd') : '',
            shiftTiming: data.shiftTiming || '',
            salaryType: data.salaryType || '',
            salaryRate: data.salaryRate || '',
            bankDetails: data.bankDetails || '',
          });
        } else {
          toast({ title: 'Not Found', description: 'Trainer data could not be found.', variant: 'destructive' });
          router.push('/dashboard/owner/members');
        }
      } catch (error) {
        console.error("Error fetching trainer data:", error);
        toast({ title: 'Error', description: 'Failed to fetch trainer details.', variant: 'destructive' });
      } finally {
        setIsFetching(false);
      }
    };

    fetchData();
  }, [trainerId, router, toast, form]);

  const onSubmit = async (data: FormData) => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId || !trainerId) {
      toast({ title: 'Error', description: 'Session or identifiers missing.', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);

    try {
      const trainerRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers', trainerId);
      
      const updatedData = {
          ...data,
          dob: data.dob ? Timestamp.fromDate(parseISO(data.dob)) : null,
          joiningDate: data.joiningDate ? Timestamp.fromDate(parseISO(data.joiningDate)) : null,
      };

      await updateDoc(trainerRef, updatedData);
      toast({ title: 'Success!', description: "Trainer's profile updated successfully." });
      router.push(`/dashboard/owner/trainers/${trainerId}`);
    } catch (error) {
      console.error("Error updating trainer:", error);
      toast({ title: 'Error', description: 'Could not update trainer. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading trainer details...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-3xl">
            <CardHeader>
                <CardTitle>Edit Trainer Profile</CardTitle>
                <CardDescription>Update profile information for {form.getValues('fullName')}.</CardDescription>
            </CardHeader>
            
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
                    <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2"><User /> Personal Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="fullName" render={({ field }) => ( <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="dob" render={({ field }) => ( <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="address" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="emergencyContactName" render={({ field }) => ( <FormItem><FormLabel>Emergency Contact</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="emergencyContactNumber" render={({ field }) => ( <FormItem><FormLabel>Emergency Contact No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                         <h3 className="font-semibold flex items-center gap-2"><Briefcase /> Professional Details</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField control={form.control} name="designation" render={({ field }) => ( <FormItem><FormLabel>Designation</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="trainer">Trainer</SelectItem><SelectItem value="yoga-instructor">Yoga Instructor</SelectItem><SelectItem value="zumba-instructor">Zumba Instructor</SelectItem><SelectItem value="crossfit-coach">CrossFit Coach</SelectItem><SelectItem value="coach">Coach</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="specialization" render={({ field }) => ( <FormItem><FormLabel>Specialization</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                             <FormField control={form.control} name="experience" render={({ field }) => ( <FormItem><FormLabel>Experience (Years)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                             <FormField control={form.control} name="joiningDate" render={({ field }) => ( <FormItem><FormLabel>Joining Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="shiftTiming" render={({ field }) => ( <FormItem><FormLabel>Shift</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="morning">Morning</SelectItem><SelectItem value="evening">Evening</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                             <FormField control={form.control} name="certifications" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Certifications</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                         </div>
                    </div>
                    
                    <Separator />

                    <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2"><Wallet /> Financial Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="salaryType" render={({ field }) => ( <FormItem><FormLabel>Salary Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="fixed">Fixed</SelectItem><SelectItem value="commission">Commission Based</SelectItem><SelectItem value="hourly">Hourly</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="salaryRate" render={({ field }) => ( <FormItem><FormLabel>Salary/Pay Rate</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="bankDetails" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Bank Details</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                     <Link href={`/dashboard/owner/trainers/${trainerId}`} passHref>
                        <Button type="button" variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Cancel</Button>
                    </Link>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Save All Changes'}
                    </Button>
                </CardFooter>
            </form>
            </Form>
        </Card>
    </div>
  );
}
