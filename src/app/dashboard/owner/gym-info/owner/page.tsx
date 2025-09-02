
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, ArrowLeft, User } from 'lucide-react';
import Link from 'next/link';

const formSchema = z.object({
  ownerName: z.string().min(1, 'Owner Name is required.'),
  ownerMobile: z.string().length(10, { message: "Mobile number must be 10 digits." }),
  ownerEmail: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  ownerAlternateContact: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function OwnerInfoPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [userDocId, setUserDocId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ownerName: '',
      ownerMobile: '',
      ownerEmail: '',
      ownerAlternateContact: '',
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

    const fetchOwnerData = async () => {
        try {
            const detailsRef = doc(db, 'gyms', docId, 'details', 'onboarding');
            const detailsSnap = await getDoc(detailsRef);

            if (detailsSnap.exists()) {
                const data = detailsSnap.data() as FormData;
                form.reset(data);
            }
        } catch(error) {
            console.error("Error fetching owner data:", error);
            toast({ title: "Error", description: "Could not fetch owner details.", variant: "destructive" });
        } finally {
            setIsFetching(false);
        }
    };
    fetchOwnerData();

  }, [router, toast, form]);

  const onSubmit = async (data: FormData) => {
    if (!userDocId) return;
    setIsLoading(true);

    try {
      const detailsRef = doc(db, 'gyms', userDocId, 'details', 'onboarding');
      await setDoc(detailsRef, data, { merge: true });

      toast({
        title: 'Success!',
        description: 'Owner information has been updated.',
      });
      router.push('/dashboard/owner');
    } catch (error) {
      console.error("Error updating owner info:", error);
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
            <p className="mt-2 text-muted-foreground">Loading Owner Info...</p>
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
                <User className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>Owner Information</CardTitle>
                  <CardDescription>View and update your personal contact details.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="ownerName" render={({ field }) => (<FormItem><FormLabel>Owner Full Name 👤</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="ownerMobile" render={({ field }) => (<FormItem><FormLabel>Mobile Number 📱</FormLabel><FormControl><Input placeholder="9876543210" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="ownerEmail" render={({ field }) => (<FormItem><FormLabel>Email Address 📧</FormLabel><FormControl><Input type="email" placeholder="owner@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="ownerAlternateContact" render={({ field }) => (<FormItem><FormLabel>Alternate Contact (optional)</FormLabel><FormControl><Input placeholder="Alternate number or contact" {...field} /></FormControl><FormMessage /></FormItem>)} />
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
