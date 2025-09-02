
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
import { Loader2, ArrowLeft, Dumbbell } from 'lucide-react';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  facilities: z.array(z.string()).optional(),
  otherFacilities: z.string().optional(),
  numMachines: z.string().optional(),
  keyBrands: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const facilitiesList = ["Cardio", "Strength", "CrossFit", "Zumba", "Steam", "Shower", "Locker"];

export default function FacilitiesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [userDocId, setUserDocId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      facilities: [],
      otherFacilities: '',
      numMachines: '',
      keyBrands: '',
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

    const fetchFacilitiesData = async () => {
        try {
            const detailsRef = doc(db, 'gyms', docId, 'details', 'onboarding');
            const detailsSnap = await getDoc(detailsRef);

            if (detailsSnap.exists()) {
                const data = detailsSnap.data() as FormData;
                form.reset(data);
            }
        } catch(error) {
            console.error("Error fetching facilities data:", error);
            toast({ title: "Error", description: "Could not fetch facilities details.", variant: "destructive" });
        } finally {
            setIsFetching(false);
        }
    };
    fetchFacilitiesData();

  }, [router, toast, form]);

  const onSubmit = async (data: FormData) => {
    if (!userDocId) return;
    setIsLoading(true);

    try {
      const detailsRef = doc(db, 'gyms', userDocId, 'details', 'onboarding');
      await setDoc(detailsRef, data, { merge: true });

      toast({
        title: 'Success!',
        description: 'Facilities information has been updated.',
      });
      router.push('/dashboard/owner');
    } catch (error) {
      console.error("Error updating facilities info:", error);
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
            <p className="mt-2 text-muted-foreground">Loading Facilities Info...</p>
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
                  <CardTitle>Facilities &amp; Machines</CardTitle>
                  <CardDescription>Detail the equipment and amenities your gym offers.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <FormField control={form.control} name="facilities" render={() => (
                    <FormItem>
                        <FormLabel>Facilities Provided</FormLabel>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 rounded-md border p-4">
                        {facilitiesList.map((item) => (
                            <FormField key={item} control={form.control} name="facilities" render={({ field }) => (
                                <FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => {
                                        return checked ? field.onChange([...(field.value || []), item]) : field.onChange(field.value?.filter((value) => value !== item));
                                    }} /></FormControl>
                                    <FormLabel className="font-normal">{item}</FormLabel>
                                </FormItem>
                                )}
                            />
                        ))}
                        </div>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="otherFacilities" render={({ field }) => (<FormItem><FormLabel>Other Facilities</FormLabel><FormControl><Textarea placeholder="e.g., Juice Bar, Physiotherapy, etc." {...field} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="numMachines" render={({ field }) => (<FormItem><FormLabel>Number of Machines (approx.)</FormLabel><FormControl><Input type="number" placeholder="50" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="keyBrands" render={({ field }) => (<FormItem><FormLabel>Key Equipment Brands (optional)</FormLabel><FormControl><Input placeholder="e.g., StrenxFit" {...field} /></FormControl><FormMessage /></FormItem>)} />
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
