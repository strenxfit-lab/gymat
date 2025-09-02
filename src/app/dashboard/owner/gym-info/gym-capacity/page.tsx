
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, ArrowLeft, Ruler, Users, Clock } from 'lucide-react';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';

const formSchema = z.object({
  gymArea: z.string().optional(),
  maxCapacity: z.string().optional(),
  numTrainers: z.string().optional(),
  numStaff: z.string().optional(),
  openDays: z.array(z.string()).optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function GymCapacityPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [userDocId, setUserDocId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gymArea: '',
      maxCapacity: '',
      numTrainers: '',
      numStaff: '',
      openDays: [],
      openingTime: '',
      closingTime: '',
    },
  });

  useEffect(() => {
    const docId = localStorage.getItem('userDocId');
    if (!docId) {
      toast({ title: "Error", description: "No user session found.", variant: "destructive" });
      router.push('/');
      return;
    }
    setUserDocId(docId);

    const fetchCapacityData = async () => {
        try {
            const detailsRef = doc(db, 'gyms', docId, 'details', 'onboarding');
            const detailsSnap = await getDoc(detailsRef);

            if (detailsSnap.exists()) {
                const data = detailsSnap.data() as FormData;
                form.reset(data);
            }
        } catch(error) {
            console.error("Error fetching capacity data:", error);
            toast({ title: "Error", description: "Could not fetch gym capacity details.", variant: "destructive" });
        } finally {
            setIsFetching(false);
        }
    };
    fetchCapacityData();

  }, [router, toast, form]);

  const onSubmit = async (data: FormData) => {
    if (!userDocId) return;
    setIsLoading(true);

    try {
      const detailsRef = doc(db, 'gyms', userDocId, 'details', 'onboarding');
      await setDoc(detailsRef, data, { merge: true });

      toast({
        title: 'Success!',
        description: 'Gym capacity information has been updated.',
      });
      router.push('/dashboard/owner');
    } catch (error) {
      console.error("Error updating gym capacity info:", error);
      toast({
        title: 'Error',
        description: 'Could not save details. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if(isFetching) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-muted-foreground">Loading Gym Capacity Info...</p>
        </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-2xl mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Ruler className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>Gym Capacity & Setup</CardTitle>
                  <CardDescription>Manage your gym's operational capacity and hours.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="gymArea" render={({ field }) => (<FormItem><FormLabel>Total Gym Area (sq. ft.) 📐</FormLabel><FormControl><Input type="number" placeholder="5000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="maxCapacity" render={({ field }) => (<FormItem><FormLabel>Max Member Capacity 👥</FormLabel><FormControl><Input type="number" placeholder="200" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="numTrainers" render={({ field }) => (<FormItem><FormLabel>Number of Trainers 👨‍🏫</FormLabel><FormControl><Input type="number" placeholder="10" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="numStaff" render={({ field }) => (<FormItem><FormLabel>Number of Staff 👔</FormLabel><FormControl><Input type="number" placeholder="5" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="openDays" render={() => (
                    <FormItem>
                        <FormLabel>Open Days</FormLabel>
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-2 rounded-md border p-4">
                        {daysOfWeek.map((day) => (
                            <FormField key={day} control={form.control} name="openDays" render={({ field }) => (
                                <FormItem key={day} className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl><Checkbox checked={field.value?.includes(day)} onCheckedChange={(checked) => {
                                        return checked ? field.onChange([...(field.value || []), day]) : field.onChange(field.value?.filter((value) => value !== day));
                                    }} /></FormControl>
                                    <FormLabel className="font-normal">{day}</FormLabel>
                                </FormItem>
                                )}
                            />
                        ))}
                        </div>
                        <FormMessage />
                    </FormItem>
                )}/>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="openingTime" render={({ field }) => (<FormItem><FormLabel>Opening Time ⏰</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="closingTime" render={({ field }) => (<FormItem><FormLabel>Closing Time ⏰</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Link href="/dashboard/owner">
                <Button variant="outline" type="button">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Button>
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
