
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
import { Loader2, ArrowLeft, Dumbbell, Upload } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const formSchema = z.object({
  gymName: z.string().min(1, 'Gym Name is required.'),
  gymLogo: z.string().optional(),
  gymAddress: z.string().optional(),
  cityStatePin: z.string().optional(),
  contactNumber: z.string().length(10, { message: "Contact number must be 10 digits." }),
  gymEmail: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  gymStartDate: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function BasicGymInfoPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [userDocId, setUserDocId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gymName: '',
      gymLogo: '',
      gymAddress: '',
      cityStatePin: '',
      contactNumber: '',
      gymEmail: '',
      gymStartDate: '',
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

    const fetchGymData = async () => {
        try {
            const detailsRef = doc(db, 'gyms', docId, 'details', 'onboarding');
            const detailsSnap = await getDoc(detailsRef);

            if (detailsSnap.exists()) {
                const data = detailsSnap.data() as FormData;
                form.reset(data);
                if (data.gymLogo) {
                    setImagePreview(data.gymLogo);
                }
            } else {
                 const gymRef = doc(db, 'gyms', docId);
                 const gymSnap = await getDoc(gymRef);
                 if(gymSnap.exists()) {
                     const gymData = gymSnap.data();
                     form.setValue('gymName', gymData.name || '');
                     form.setValue('gymAddress', gymData.location || '');
                     form.setValue('contactNumber', gymData.contactNumber || '');
                     form.setValue('gymEmail', gymData.email || '');
                 }
            }
        } catch(error) {
            console.error("Error fetching gym data:", error);
            toast({ title: "Error", description: "Could not fetch gym details.", variant: "destructive" });
        } finally {
            setIsFetching(false);
        }
    };
    fetchGymData();

  }, [router, toast, form]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        form.setValue('gymLogo', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!userDocId) return;
    setIsLoading(true);

    try {
      const detailsRef = doc(db, 'gyms', userDocId, 'details', 'onboarding');
      await setDoc(detailsRef, data, { merge: true });

      const userRef = doc(db, 'gyms', userDocId);
      await updateDoc(userRef, {
        name: data.gymName,
        location: data.gymAddress,
        contactNumber: data.contactNumber,
        email: data.gymEmail,
      });

      toast({
        title: 'Success!',
        description: 'Gym information has been updated.',
      });
      router.push('/dashboard/owner');
    } catch (error) {
      console.error("Error updating gym info:", error);
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
            <p className="mt-2 text-muted-foreground">Loading Gym Info...</p>
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
                <Dumbbell className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>Basic Gym Information</CardTitle>
                  <CardDescription>View and update your gym's core details.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="relative h-24 w-24 rounded-full border border-dashed flex items-center justify-center bg-muted">
                  {imagePreview ? (
                    <Image src={imagePreview} alt="Gym Logo" layout="fill" className="rounded-full object-cover" />
                  ) : (
                    <Dumbbell className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <FormField
                  control={form.control}
                  name="gymLogo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="logo-upload" className={cn(
                          buttonVariants({ variant: "outline" }),
                          "cursor-pointer"
                      )}>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Logo / Photo
                      </FormLabel>
                      <FormControl>
                        <Input id="logo-upload" type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="gymName" render={({ field }) => (<FormItem><FormLabel>Gym Name 🏋️</FormLabel><FormControl><Input placeholder="Strenxfit Gym" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="gymAddress" render={({ field }) => (<FormItem><FormLabel>Gym Address 📍</FormLabel><FormControl><Input placeholder="123 Fitness Ave" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="cityStatePin" render={({ field }) => (<FormItem><FormLabel>City, State, PIN</FormLabel><FormControl><Input placeholder="Metropolis, NY, 10001" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="contactNumber" render={({ field }) => (<FormItem><FormLabel>Contact Number 📞</FormLabel><FormControl><Input placeholder="9876543210" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="gymEmail" render={({ field }) => (<FormItem><FormLabel>Email Address 📧</FormLabel><FormControl><Input type="email" placeholder="contact@strenxfit.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="gymStartDate" render={({ field }) => (<FormItem><FormLabel>Gym Start Date 📅</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
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
