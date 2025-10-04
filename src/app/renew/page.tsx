
"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Shield, Check, IndianRupee } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { addMonths, addYears } from 'date-fns';

declare global {
    interface Window {
        Razorpay: any;
    }
}

interface SubscriptionPlan {
  id: string;
  name: string;
  duration: string;
  price: number;
  Benefits: string[];
}

const bestSellingPlanIds = ["6 Month Plan", "3 Month Plan Multi", "1 Year Plan Multi", "1 Year Plan"];

export default function RenewPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPaymentFor, setProcessingPaymentFor] = useState<string | null>(null);
  const [gymId, setGymId] = useState<string | null>(null);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const idFromParams = searchParams.get('gymId');
    const idFromStorage = localStorage.getItem('userDocId');
    setGymId(idFromParams || idFromStorage);
  }, [searchParams]);

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
      } catch (error) {
        console.error("Error fetching subscription plans:", error);
        toast({ title: "Error", description: "Could not load subscription plans.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, [toast]);

  const handlePayment = async (plan: SubscriptionPlan) => {
    if (!gymId) {
        toast({ title: "Error", description: "Gym ID not found. Please log in again.", variant: "destructive" });
        return;
    }
    setProcessingPaymentFor(plan.id);
    
    const gymRef = doc(db, 'gyms', gymId);
    const gymSnap = await getDoc(gymRef);
    if (!gymSnap.exists()) {
        toast({ title: "Error", description: "Gym details not found.", variant: "destructive"});
        setProcessingPaymentFor(null);
        return;
    }
    const gymData = gymSnap.data();

    const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: plan.price * 100,
        currency: "INR",
        name: "Strenx Enterprises",
        description: `Subscription: ${plan.name}`,
        handler: async (response: any) => {
            try {
                let currentExpiry = (gymData.expiry_at?.toDate() > new Date()) ? gymData.expiry_at.toDate() : new Date();
                let newExpiryDate;

                if (plan.name.toLowerCase().includes('month')) {
                    const months = parseInt(plan.name.split(" ")[0]);
                    newExpiryDate = addMonths(currentExpiry, months);
                } else if (plan.name.toLowerCase().includes('year')) {
                     const years = parseInt(plan.name.split(" ")[0]);
                    newExpiryDate = addYears(currentExpiry, years);
                } else {
                    newExpiryDate = addMonths(currentExpiry, 1); // Default
                }
                
                await updateDoc(gymRef, {
                    expiry_at: newExpiryDate,
                    membershipType: plan.name,
                    price: plan.price,
                    isTrial: false, // Ensure trial is deactivated
                });

                const paymentsRef = collection(db, 'platform_payments');
                await addDoc(paymentsRef, {
                    gymId: gymId,
                    gymName: gymData.name,
                    planName: plan.name,
                    amount: plan.price,
                    transactionId: response.razorpay_payment_id,
                    paymentDate: serverTimestamp(),
                });

                toast({ title: "Payment Successful!", description: "Your subscription has been renewed."});
                router.push('/dashboard/owner');
            } catch (error) {
                 console.error("Error updating subscription:", error);
                 toast({ title: "Update Failed", description: "Payment was successful, but updating your profile failed. Please contact support.", variant: 'destructive'});
            } finally {
                setProcessingPaymentFor(null);
            }
        },
        prefill: {
            name: gymData.ownerName || gymData.name,
            email: gymData.email,
            contact: gymData.contactNumber,
        },
        theme: {
            color: "#6366f1",
        },
    };
    
    if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response: any){
            console.error(response);
            toast({title: "Payment Failed", description: response.error.description, variant: "destructive"});
            setProcessingPaymentFor(null);
        });
        rzp.open();
    } else {
        toast({ title: "Error", description: "Payment gateway is not available.", variant: "destructive" });
        setProcessingPaymentFor(null);
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="bg-background min-h-screen">
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-sm px-4 md:px-8">
        <h1 className="text-xl font-bold">Renew Subscription</h1>
        <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/dashboard/owner" passHref>
                <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Button>
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
                <Button className="w-full" onClick={() => handlePayment(plan)} disabled={!!processingPaymentFor}>
                  {processingPaymentFor === plan.id ? <Loader2 className="animate-spin" /> : 'Choose Plan & Pay'}
                </Button>
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
    </div>
  );
}
