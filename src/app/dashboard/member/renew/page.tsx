
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Shield, Check, IndianRupee, Phone, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';

interface MembershipPlan {
  name: string;
  price: string;
}

export default function MemberRenewPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactDetails, setContactDetails] = useState({ phone: '', email: '' });
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

        // Fetch gym contact info
        const gymRef = doc(db, 'gyms', userDocId);
        const gymSnap = await getDoc(gymRef);
        if(gymSnap.exists()){
            const gymData = gymSnap.data();
            setContactDetails({ phone: gymData.contactNumber, email: gymData.email });
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

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Dialog>
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Renew Your Membership</h1>
          <p className="text-muted-foreground">Choose a plan and contact the gym to finalize your renewal.</p>
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
                 <DialogTrigger asChild>
                    <Button className="w-full">Choose Plan</Button>
                </DialogTrigger>
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
    
    <DialogContent>
        <DialogHeader>
        <DialogTitle>Contact Gym to Finalize</DialogTitle>
        <DialogDescription>
            Please contact the gym administration to complete your renewal process.
        </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4 py-4">
            {contactDetails.email && (
                <a href={`mailto:${contactDetails.email}`} className="flex items-center gap-3 p-3 rounded-md hover:bg-accent transition-colors">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <span>{contactDetails.email}</span>
                </a>
            )}
             {contactDetails.phone && (
                <a href={`https://wa.me/91${contactDetails.phone}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-md hover:bg-accent transition-colors">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <span>+91 {contactDetails.phone}</span>
                </a>
            )}
        </div>
    </DialogContent>
    </Dialog>
  );
}
