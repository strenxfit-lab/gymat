
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, ArrowLeft, HeartPulse, Briefcase } from 'lucide-react';
import Link from 'next/link';

const formSchema = z.object({
  assignedTrainer: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  medicalConditions: z.string().optional(),
  fitnessGoal: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Trainer {
  id: string;
  name: string;
}

export default function EditMemberProfilePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [fullName, setFullName] = useState<string>('');
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assignedTrainer: '',
      height: '',
      weight: '',
      medicalConditions: '',
      fitnessGoal: '',
    },
  });

  useEffect(() => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    const memberId = localStorage.getItem('memberId');

    if (!userDocId || !activeBranchId || !memberId) {
      toast({ title: 'Error', description: 'Session data not found.', variant: 'destructive' });
      router.push('/dashboard/member');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch trainers
        const trainersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers');
        const trainersSnapshot = await getDocs(trainersCollection);
        const trainersList = trainersSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().fullName }));
        setTrainers(trainersList);

        // Fetch member data
        const memberRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', memberId);
        const memberSnap = await getDoc(memberRef);

        if (memberSnap.exists()) {
          const data = memberSnap.data();
          setFullName(data.fullName);
          form.reset({
            assignedTrainer: data.assignedTrainer || '',
            height: data.height || '',
            weight: data.weight || '',
            medicalConditions: data.medicalConditions || '',
            fitnessGoal: data.fitnessGoal || '',
          });
        } else {
          toast({ title: 'Error', description: 'Member not found.', variant: 'destructive' });
          router.push('/dashboard/member/profile');
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ title: 'Error', description: 'Failed to fetch your details.', variant: 'destructive' });
      } finally {
        setIsFetching(false);
      }
    };

    fetchData();
  }, [router, toast, form]);

  const onSubmit = async (data: FormData) => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    const memberId = localStorage.getItem('memberId');
    if (!userDocId || !activeBranchId || !memberId) return;
    
    setIsLoading(true);

    try {
      const memberRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', memberId);
      
      const dataToUpdate = {
        ...data,
        assignedTrainer: data.assignedTrainer === 'none' ? '' : data.assignedTrainer,
      };
      
      await updateDoc(memberRef, dataToUpdate);

      toast({
        title: 'Success!',
        description: 'Your profile has been updated.',
      });
      router.push('/dashboard/member/profile');
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isFetching) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Edit My Profile</CardTitle>
          <CardDescription>Update your assigned trainer and health information, {fullName}.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2"><Briefcase /> Assigned Trainer</h3>
                 <FormField
                    control={form.control}
                    name="assignedTrainer"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Select a Trainer</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a trainer or select none" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {trainers.map(trainer => (
                                    <SelectItem key={trainer.id} value={trainer.id}>
                                        {trainer.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
              </div>

              <div className="space-y-4">
                 <h3 className="font-semibold flex items-center gap-2"><HeartPulse /> Health &amp; Fitness</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="height" render={({ field }) => ( <FormItem><FormLabel>Height (cm)</FormLabel><FormControl><Input placeholder="175" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="weight" render={({ field }) => ( <FormItem><FormLabel>Weight (kg)</FormLabel><FormControl><Input placeholder="70" {...field} /></FormControl><FormMessage /></FormItem> )} />
                 </div>
                 <FormField control={form.control} name="fitnessGoal" render={({ field }) => (
                    <FormItem><FormLabel>Fitness Goal</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select your primary goal" /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="weight-loss">Weight Loss</SelectItem><SelectItem value="muscle-gain">Muscle Gain</SelectItem><SelectItem value="general-fitness">General Fitness</SelectItem><SelectItem value="strength">Strength</SelectItem></SelectContent>
                    </Select><FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="medicalConditions" render={({ field }) => ( <FormItem><FormLabel>Medical Conditions</FormLabel><FormControl><Textarea placeholder="e.g., Asthma, previous injuries..." {...field} /></FormControl><FormMessage /></FormItem> )} />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Link href="/dashboard/member/profile" passHref>
                <Button variant="outline" type="button"><ArrowLeft className="mr-2 h-4 w-4"/> Cancel</Button>
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
