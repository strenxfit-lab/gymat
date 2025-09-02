
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
import { Loader2, ArrowLeft, BarChart3, IndianRupee, Users } from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  primaryGoal: z.string().optional(),
  expectedMembers: z.string().optional(),
  expectedIncome: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function GoalsAndInsightsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [userDocId, setUserDocId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      primaryGoal: '',
      expectedMembers: '',
      expectedIncome: '',
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

    const fetchGoalsData = async () => {
        try {
            const detailsRef = doc(db, 'gyms', docId, 'details', 'onboarding');
            const detailsSnap = await getDoc(detailsRef);

            if (detailsSnap.exists()) {
                const data = detailsSnap.data();
                form.reset({
                  primaryGoal: data.primaryGoal || '',
                  expectedMembers: data.expectedMembers || '',
                  expectedIncome: data.expectedIncome || '',
                });
            }
        } catch(error) {
            console.error("Error fetching goals data:", error);
            toast({ title: "Error", description: "Could not fetch goals and insights.", variant: "destructive" });
        } finally {
            setIsFetching(false);
        }
    };
    fetchGoalsData();

  }, [router, toast, form]);

  const onSubmit = async (data: FormData) => {
    if (!userDocId) return;
    setIsLoading(true);

    try {
      const detailsRef = doc(db, 'gyms', userDocId, 'details', 'onboarding');
      await setDoc(detailsRef, data, { merge: true });

      toast({
        title: 'Success!',
        description: 'Your goals have been updated.',
      });
      router.push('/dashboard/owner');
    } catch (error) {
      console.error("Error updating goals info:", error);
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
            <p className="mt-2 text-muted-foreground">Loading Goals & Insights...</p>
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
                <BarChart3 className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>Goals &amp; Insights</CardTitle>
                  <CardDescription>Set your business objectives to track progress.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <FormField control={form.control} name="primaryGoal" render={({ field }) => (
                    <FormItem><FormLabel>What is your Gym’s Primary Goal?</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a goal" /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="increase-members">Increase Members</SelectItem>
                            <SelectItem value="manage-trainers">Manage Trainers</SelectItem>
                            <SelectItem value="track-payments">Track Payments</SelectItem>
                            <SelectItem value="reports-analytics">Reports & Analytics</SelectItem>
                        </SelectContent>
                        </Select>
                    </FormItem>
                )} />
                <FormField control={form.control} name="expectedMembers" render={({ field }) => (
                    <FormItem>
                        <FormLabel>How many members do you expect in next 3 months?</FormLabel>
                        <FormControl><Input type="number" placeholder="50" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="expectedIncome" render={({ field }) => (
                    <FormItem>
                        <FormLabel>How much income do you expect in next 3 months?</FormLabel>
                        <FormControl><Input type="number" placeholder="100000" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
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
