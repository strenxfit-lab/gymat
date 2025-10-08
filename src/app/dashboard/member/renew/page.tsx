
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, doc, getDoc, addDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Shield, IndianRupee } from 'lucide-react';
import { addDays } from 'date-fns';

interface MembershipPlan {
  name: string;
  price: string;
}

declare global {
    interface Window {
        Razorpay: any;
    }
}

export default function MemberRenewPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPaymentFor, setProcessingPaymentFor] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchPlans = async () => {
      const userDocId = localStorage.getItem('userDocId');
      if (!userDocId) {
        toast({ title: "Error", description: "Gym session not found.", variant: "destructive" });
        setLoading(false);
        return;
      }
      try {
        const detailsRef = doc(db, 'gyms', userDocId, 'details', 'onboarding');
        const detailsSnap = await getDoc(detailsRef);
        if (detailsSnap.exists() && detailsSnap.data().plans) {
          setPlans(detailsSnap.data().plans);
        }
      } catch (error) {
        console.error("Error fetching subscription plans:", error);
        toast({ title: "Error", description: "Could not load subscription plans.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, [toast]);
  
  const handlePayment = async (plan: MembershipPlan) => {
    setProcessingPaymentFor(plan.name);
    const userDocId = localStorage.getItem('userDocId');
    const memberId = localStorage.getItem('memberId');
    const activeBranchId = localStorage.getItem('activeBranch');

    if(!userDocId || !memberId || !activeBranchId) {
        toast({title: "Error", description: "Session invalid."});
        setProcessingPaymentFor(null);
        return;
    }

    const memberRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', memberId);
    const memberSnap = await getDoc(memberRef);

    if(!memberSnap.exists()) {
         toast({title: "Error", description: "Member not found."});
         setProcessingPaymentFor(null);
         return;
    }
    const memberData = memberSnap.data();

    const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: parseFloat(plan.price) * 100,
        currency: "INR",
        name: "Strenx Enterprises",
        description: `Membership Renewal: ${plan.name}`,
        handler: async (response: any) => {
            try {
                let currentEndDate = memberData.endDate ? (memberData.endDate as Timestamp).toDate() : new Date();
                if (currentEndDate < new Date()) {
                    currentEndDate = new Date();
                }

                let newEndDate;
                switch (plan.name.toLowerCase()) {
                    case 'monthly': newEndDate = addDays(currentEndDate, 30); break;
                    case 'quarterly': newEndDate = addDays(currentEndDate, 90); break;
                    case 'half-yearly': newEndDate = addDays(currentEndDate, 180); break;
                    case 'yearly': newEndDate = addDays(currentEndDate, 365); break;
                    case 'trial': newEndDate = addDays(currentEndDate, 7); break;
                    default: newEndDate = addDays(currentEndDate, 30);
                }

                const paymentDate = new Date();

                const paymentsCollection = collection(memberRef, 'payments');
                await addDoc(paymentsCollection, {
                    amountPaid: parseFloat(plan.price),
                    paymentDate: Timestamp.fromDate(paymentDate),
                    paymentMode: 'Razorpay',
                    nextDueDate: Timestamp.fromDate(newEndDate),
                    balanceDue: 0,
                    transactionId: response.razorpay_payment_id,
                });

                await updateDoc(memberRef, {
                    endDate: Timestamp.fromDate(newEndDate),
                    lastPaymentDate: Timestamp.fromDate(paymentDate),
                    membershipType: plan.name,
                });
                
                toast({ title: "Payment Successful!", description: "Your membership has been renewed."});
                router.push('/dashboard/member/payment-history');

            } catch (error) {
                console.error("Error processing successful payment:", error);
                toast({ title: "Update Failed", description: "Payment was successful, but updating your profile failed. Please contact support.", variant: 'destructive'});
                 setProcessingPaymentFor(null);
            }
        },
        prefill: {
            name: memberData.fullName,
            email: memberData.email,
            contact: memberData.phone,
        },
        theme: {
            color: "#6366f1",
        },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response: any){
        console.error(response);
        toast({title: "Payment Failed", description: response.error.description, variant: "destructive"});
        setProcessingPaymentFor(null);
    });
    rzp.open();
  }


  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Renew Your Membership</h1>
          <p className="text-muted-foreground">Choose a plan to continue your fitness journey.</p>
        </div>
        <Link href="/dashboard/member" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.length > 0 ? (
          plans.map((plan, index) => (
            <Card key={index} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                    <Shield className="h-8 w-8 text-primary"/>
                    <div>
                        <CardTitle>{plan.name}</CardTitle>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                <p className="text-4xl font-bold flex items-center">
                  <IndianRupee className="h-7 w-7 mr-1"/>
                  {parseInt(plan.price).toLocaleString()}
                </p>
              </CardContent>
              <CardFooter>
                 <Button className="w-full" onClick={() => handlePayment(plan)} disabled={!!processingPaymentFor}>
                    {processingPaymentFor === plan.name ? <Loader2 className="animate-spin" /> : 'Choose Plan & Pay'}
                 </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <p className="col-span-full text-center text-muted-foreground py-10">
            No membership plans found. Please contact the gym administration.
          </p>
        )}
      </div>
    </div>
  );
}
