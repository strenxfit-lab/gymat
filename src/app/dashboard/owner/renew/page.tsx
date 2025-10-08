
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Shield, Check, IndianRupee, Phone, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

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
  const { toast } = useToast();

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

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Dialog>
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Renew or Upgrade Your Plan</h1>
          <p className="text-muted-foreground">Choose the best plan that fits your gym's needs.</p>
        </div>
        <Link href="/dashboard/owner" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.length > 0 ? (
          plans.map(plan => (
            <Card key={plan.id} className="flex flex-col relative">
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
                        <li key={index} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary"/>
                            <span>{benefit}</span>
                        </li>
                    ))}
                </ul>
              </CardContent>
              <CardContent>
                 <DialogTrigger asChild>
                    <Button className="w-full">Choose Plan</Button>
                </DialogTrigger>
              </CardContent>
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
        <DialogTitle>Contact Support to Finalize</DialogTitle>
        <DialogDescription>
            Please contact our support team to complete your subscription process.
        </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4 py-4">
            <a href="mailto:strenxfit@gmail.com" className="flex items-center gap-3 p-3 rounded-md hover:bg-accent transition-colors">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span>strenxfit@gmail.com</span>
            </a>
            <a href="https://wa.me/917988487892" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 p-3 rounded-md hover:bg-accent transition-colors">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <span>+91 79884 87892</span>
            </a>
        </div>
    </DialogContent>
    </Dialog>
  );
}
