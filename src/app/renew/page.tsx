
"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Shield, Check, IndianRupee, Phone, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';

interface SubscriptionPlan {
  id: string;
  name: string;
  duration: string;
  price: number;
  Benefits: string[];
}

const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
  phone: z.string().length(10, "Phone must be 10 digits."),
  gymName: z.string().min(1, "Gym name is required."),
});
type ContactFormData = z.infer<typeof contactFormSchema>;

const bestSellingPlanIds = ["6 Month Plan", "3 Month Plan Multi", "1 Year Plan Multi", "1 Year Plan"];

export default function RenewPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const gymId = searchParams.get('gymId');

  const contactForm = useForm<ContactFormData>({
      resolver: zodResolver(contactFormSchema),
      defaultValues: { name: '', phone: '', gymName: ''}
  });

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const plansCollection = collection(db, 'subscription');
        const plansSnapshot = await getDocs(plansCollection);
        const plansList = plansSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as SubscriptionPlan));
        setPlans(plansList);

        if (gymId) {
            const gymRef = doc(db, 'gyms', gymId);
            const gymSnap = await getDoc(gymRef);
            if (gymSnap.exists()) {
                const gymData = gymSnap.data();
                contactForm.reset({
                    name: gymData.ownerName || '',
                    phone: gymData.contactNumber || '',
                    gymName: gymData.name || '',
                });
            }
        }
      } catch (error) {
        console.error("Error fetching subscription plans:", error);
        toast({ title: "Error", description: "Could not load subscription plans.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, [toast, gymId, contactForm]);
  
  const handleChoosePlan = (plan: SubscriptionPlan) => {
      setSelectedPlan(plan);
      setIsContactDialogOpen(true);
  }

  const onContactSubmit = async (data: ContactFormData) => {
      // In a real scenario, this would trigger a payment flow.
      // Here, we just show a confirmation and link to support.
      toast({
          title: "Request Received!",
          description: "Thank you for your interest. Please contact our support to finalize the payment and activation.",
          duration: 5000,
      });
      setIsContactDialogOpen(false);
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="bg-background min-h-screen">
    <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-sm px-4 md:px-8">
        <h1 className="text-xl font-bold">Renew Subscription</h1>
        <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/" passHref>
                <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Login</Button>
            </Link>
        </div>
    </header>
    <div className="container mx-auto py-10">
      <div className="text-center mb-10">
          <h1 className="text-3xl font-bold">Renew or Upgrade Your Plan</h1>
          <p className="text-muted-foreground mt-2">Choose the best plan that fits your gym's needs.</p>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.length > 0 ? (
          plans.map(plan => (
            <Card key={plan.id} className="flex flex-col relative shadow-md hover:shadow-xl transition-shadow">
              {bestSellingPlanIds.includes(plan.id) && (
                <Badge className="absolute -top-3 right-4">Best Selling</Badge>
              )}
              <CardHeader>
                <div className="flex items-center gap-3">
                    <Shield className="h-8 w-8 text-primary"/>
                    <div>
                        <CardTitle>{plan.name}</CardTitle>
                        <CardDescription>{plan.duration}</CardDescription>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                <p className="text-4xl font-bold flex items-center">
                  <IndianRupee className="h-7 w-7 mr-1"/>
                  {plan.price.toLocaleString()}
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan.Benefits?.map((benefit, index) => (
                        <li key={index} className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-primary mt-1 shrink-0"/>
                            <span>{benefit}</span>
                        </li>
                    ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => handleChoosePlan(plan)}>Choose Plan</Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <p className="col-span-full text-center text-muted-foreground py-10">
            No subscription plans found. Please contact support.
          </p>
        )}
      </div>
    </div>
    <DialogContent>
        <DialogHeader>
            <DialogTitle>Continue with {selectedPlan?.name}</DialogTitle>
            <DialogDescription>
                Please confirm your details. Our team will contact you to complete the payment process.
            </DialogDescription>
        </DialogHeader>
         <Form {...contactForm}>
            <form onSubmit={contactForm.handleSubmit(onContactSubmit)} className="space-y-4 py-4">
                <FormField control={contactForm.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Your Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={contactForm.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={contactForm.control} name="gymName" render={({ field }) => ( <FormItem><FormLabel>Gym Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsContactDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={contactForm.formState.isSubmitting}>
                        {contactForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Continue'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    </DialogContent>
    </Dialog>
    </div>
  );
}
