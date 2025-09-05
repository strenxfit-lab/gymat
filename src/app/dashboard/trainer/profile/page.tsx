
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, User, Briefcase, Wallet, Calendar, Mail, Phone, Clock, Edit, Star, HeartPulse, Dumbbell } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


const formSchema = z.object({
  shiftTiming: z.string().nonempty({ message: 'Please select a shift.' }),
});

type FormData = z.infer<typeof formSchema>;

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
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { shiftTiming: '' },
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
        form.setValue('shiftTiming', data.shiftTiming);
        
        // Fetch assigned members
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
  }, [router, toast, form]);

  const onSubmit = async (data: FormData) => {
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
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardContent>
                            {isEditing ? (
                                <FormField
                                    control={form.control}
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
                                <DetailItem label="Current Shift" value={form.getValues('shiftTiming')} />
                            )}
                        </CardContent>
                        {isEditing && (
                            <CardFooter className="justify-end gap-2">
                                <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Save Shift'}
                                </Button>
                            </CardFooter>
                        )}
                    </form>
                </Form>
            </Card>

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
                                <TableHead>Height/Weight</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {assignedMembers.length > 0 ? (
                            assignedMembers.map((member) => (
                            <TableRow key={member.id}>
                                <TableCell className="font-medium">{member.fullName}</TableCell>
                                <TableCell>{member.fitnessGoal || 'N/A'}</TableCell>
                                <TableCell>{member.height || 'N/A'}cm / {member.weight || 'N/A'}kg</TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">
                                No members have assigned you as their trainer yet.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
