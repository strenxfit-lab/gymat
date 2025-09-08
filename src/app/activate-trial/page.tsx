
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { KeyRound, Loader2, ArrowLeft } from 'lucide-react';
import { collection, query, where, getDocs, writeBatch, serverTimestamp, Timestamp, doc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';

const formSchema = z.object({
  trialKey: z.string().min(8, { message: 'Trial key must be at least 8 characters long.' }),
});

export default function ActivateTrialPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      trialKey: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    
    try {
        const trialKeysRef = collection(db, 'trialKeys');
        const q = query(trialKeysRef, where("key", "==", values.trialKey));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            toast({ title: "Invalid Key", description: "The trial key you entered does not exist.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        const trialDoc = querySnapshot.docs[0];
        const trialData = trialDoc.data();

        if (trialData.activatedAt) {
            toast({ title: "Key Already Used", description: "This trial key has already been activated.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        // Create a new gym document for the trial user
        const newGymRef = doc(collection(db, 'gyms'));

        // Update the trial key and the new gym doc in a batch
        const batch = writeBatch(db);
        
        const activationTime = new Date();
        const expirationTime = new Date(activationTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

        batch.update(trialDoc.ref, {
            activatedAt: serverTimestamp(),
            expiresAt: Timestamp.fromDate(expirationTime),
            gymId: newGymRef.id,
        });

        batch.set(newGymRef, {
            name: "My Trial Gym",
            email: `trial-${newGymRef.id}@example.com`,
            role: "owner",
            isTrial: true,
            createdAt: serverTimestamp(),
            trialKey: values.trialKey
        });

        await batch.commit();

        // Set local storage to log the user in
        localStorage.setItem('userDocId', newGymRef.id);
        localStorage.setItem('userRole', 'owner');
        
        toast({
          title: 'Trial Activated!',
          description: 'Welcome! Your trial has been successfully activated.',
        });
        router.push('/dashboard/owner');

    } catch (error) {
        console.error("Error activating trial key:", error);
        toast({
            title: 'Activation Failed',
            description: 'An unexpected error occurred. Please try again.',
            variant: 'destructive',
        });
        setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Activate Trial Key</CardTitle>
                <CardDescription>
                    Enter the trial key you received to activate your trial period.
                </CardDescription>
            </CardHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4 pt-4">
                    <FormField
                    control={form.control}
                    name="trialKey"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Trial Key</FormLabel>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <FormControl>
                            <Input placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" {...field} className="pl-10" />
                            </FormControl>
                        </div>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </CardContent>
                <CardFooter className="flex-col gap-4">
                    <Button type="submit" disabled={isLoading} className="w-full">
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Activate Key & Go to Dashboard'}
                    </Button>
                    <Link href="/" passHref>
                        <Button variant="link" className="text-muted-foreground">
                            <ArrowLeft className="mr-2 h-4 w-4"/>
                            Back to Login
                        </Button>
                    </Link>
                </CardFooter>
            </form>
            </Form>
      </Card>
    </div>
  );
}
