
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft, Ruler } from 'lucide-react';

const measurementSchema = z.object({
  weight: z.coerce.number().positive('Weight must be positive.').optional(),
  chest: z.coerce.number().positive('Chest measurement must be positive.').optional(),
  waist: z.coerce.number().positive('Waist measurement must be positive.').optional(),
  arms: z.coerce.number().positive('Arm measurement must be positive.').optional(),
  thighs: z.coerce.number().positive('Thigh measurement must be positive.').optional(),
}).refine(data => Object.values(data).some(v => v !== undefined && v > 0), {
    message: "Please enter at least one measurement.",
    path: ["weight"],
});

type FormData = z.infer<typeof measurementSchema>;

export default function LogMeasurementsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<FormData>({
    resolver: zodResolver(measurementSchema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    const username = localStorage.getItem('communityUsername');
    if (!username) {
        toast({ title: "Error", description: "You must have a community profile to log measurements.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    
    // Filter out undefined/empty values
    const measurementsToLog = Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined && value > 0)
    );

    try {
        const userCommunityRef = doc(db, 'userCommunity', username);
        const measurementsCollection = collection(userCommunityRef, 'measurements');
        
        await addDoc(measurementsCollection, {
            ...measurementsToLog,
            completedAt: serverTimestamp(),
        });
        
        toast({
            title: 'Measurements Logged!',
            description: 'Your progress has been saved.',
        });
        router.push('/progress');
        
    } catch (error) {
        console.error("Error logging measurements:", error);
        toast({ title: 'Error', description: 'Could not save your measurements.', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-lg mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Ruler/> Log Body Measurements</CardTitle>
              <CardDescription>Enter your current measurements to track your progress over time. Only fill what you have measured.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="weight" render={({ field }) => ( <FormItem><FormLabel>Weight (kg)</FormLabel><FormControl><Input type="number" placeholder="70" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="chest" render={({ field }) => ( <FormItem><FormLabel>Chest (inches)</FormLabel><FormControl><Input type="number" placeholder="40" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="waist" render={({ field }) => ( <FormItem><FormLabel>Waist (inches)</FormLabel><FormControl><Input type="number" placeholder="32" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="arms" render={({ field }) => ( <FormItem><FormLabel>Arms (inches)</FormLabel><FormControl><Input type="number" placeholder="15" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="thighs" render={({ field }) => ( <FormItem><FormLabel>Thighs (inches)</FormLabel><FormControl><Input type="number" placeholder="22" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Link href="/dashboard/member" passHref>
                    <Button variant="outline" type="button"><ArrowLeft className="mr-2 h-4 w-4"/> Cancel</Button>
                </Link>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : 'Log Measurements'}
                </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
