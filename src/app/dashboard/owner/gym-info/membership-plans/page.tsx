"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, ArrowLeft, Wallet, Plus, Trash } from 'lucide-react';
import Link from 'next/link';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const planSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  price: z.string().min(1, 'Price is required'),
});

const formSchema = z.object({
  hasPlans: z.string().optional(),
  plans: z.array(planSchema).optional(),
  monthlyFee: z.string().optional(),
  freeTrial: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function MembershipPlansPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [userDocId, setUserDocId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hasPlans: '',
      plans: [{ name: '', price: '' }],
      monthlyFee: '',
      freeTrial: '',
    },
  });
  
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "plans"
  });

  useEffect(() => {
    const docId = localStorage.getItem('userDocId');
    if (!docId) {
      toast({ title: "Error", description: "No user session found.", variant: "destructive" });
      router.push('/');
      return;
    }
    setUserDocId(docId);

    const fetchPlansData = async () => {
        try {
            const detailsRef = doc(db, 'gyms', docId, 'details', 'onboarding');
            const detailsSnap = await getDoc(detailsRef);

            if (detailsSnap.exists()) {
                const data = detailsSnap.data() as Partial<FormData>;
                form.reset(data);
                if (data.plans && data.plans.length > 0) {
                  replace(data.plans);
                }
            }
        } catch(error) {
            console.error("Error fetching plans data:", error);
            toast({ title: "Error", description: "Could not fetch membership plans.", variant: "destructive" });
        } finally {
            setIsFetching(false);
        }
    };
    fetchPlansData();

  }, [router, toast, form, replace]);

  const onSubmit = async (data: FormData) => {
    if (!userDocId) return;
    setIsLoading(true);

    try {
      const detailsRef = doc(db, 'gyms', userDocId, 'details', 'onboarding');
      await setDoc(detailsRef, data, { merge: true });

      toast({
        title: 'Success!',
        description: 'Membership plans have been updated.',
      });
      router.push('/dashboard/owner');
    } catch (error) {
      console.error("Error updating plans info:", error);
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
            <p className="mt-2 text-muted-foreground">Loading Membership Plans...</p>
        </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-2xl mx-auto">
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Wallet className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>Membership &amp; Plans</CardTitle>
                  <CardDescription>Define your membership structure and pricing.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
               <FormField control={form.control} name="hasPlans" render={({ field }) => (
                  <FormItem className="space-y-3"><FormLabel>Do you already have membership plans?</FormLabel>
                      <FormControl>
                          <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                              <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                          </RadioGroup>
                      </FormControl>
                        <FormMessage />
                  </FormItem>
              )} />

              {form.watch('hasPlans') === 'yes' && (
                  <div>
                      <FormLabel>Your Plans</FormLabel>
                      {fields.map((item, index) => (
                          <div key={item.id} className="flex gap-2 mb-2 items-center">
                              <FormField control={form.control} name={`plans.${index}.name`} render={({ field }) => ( <FormItem className="flex-grow"><FormControl><Input placeholder="e.g., Monthly" {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={form.control} name={`plans.${index}.price`} render={({ field }) => ( <FormItem className="w-32"><FormControl><Input type="number" placeholder="e.g., 500" {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash className="h-4 w-4" /></Button>
                          </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => append({name: '', price: ''})}><Plus className="mr-2 h-4 w-4"/>Add Plan</Button>
                  </div>
              )}

              {form.watch('hasPlans') === 'no' && (
                  <div className="space-y-4">
                    <FormField control={form.control} name="monthlyFee" render={({ field }) => ( <FormItem><FormLabel>What is your base monthly fee?</FormLabel><FormControl><Input type="number" placeholder="1500" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    {form.watch('monthlyFee') && (
                      <Card className="bg-muted/50">
                          <CardHeader><CardTitle className="text-base">Suggested Plans</CardTitle></CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            <p><strong>Monthly:</strong> ₹{Number(form.getValues('monthlyFee') || 0).toLocaleString()}</p>
                            <p><strong>Quarterly:</strong> ₹{(Number(form.getValues('monthlyFee') || 0) * 3).toLocaleString()}</p>
                            <p><strong>Yearly:</strong> ₹{(Number(form.getValues('monthlyFee') || 0) * 12).toLocaleString()}</p>
                          </CardContent>
                          <CardFooter className="flex gap-2">
                            <Button type="button" size="sm">Confirm &amp; Use</Button>
                            <Button type="button" variant="outline" size="sm">Edit</Button>
                            <Button type="button" variant="ghost" size="sm">Cancel</Button>
                          </CardFooter>
                      </Card>
                    )}
                  </div>
              )}

              <FormField control={form.control} name="freeTrial" render={({ field }) => (
                  <FormItem className="space-y-3"><FormLabel>Offer a Free Trial Option?</FormLabel>
                      <FormControl>
                          <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                              <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                          </RadioGroup>
                      </FormControl>
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
        </FormProvider>
      </Card>
    </div>
  );
}
