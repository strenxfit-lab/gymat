
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, Timestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Utensils } from 'lucide-react';
import { format } from 'date-fns';

interface DietPlan {
  id: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  snacks?: string;
  sentAt: Date;
}

const DietPlanItem = ({ label, value }: { label: string; value: string | undefined }) => (
    <div>
        <h4 className="font-semibold text-md mb-1">{label}</h4>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{value || 'N/A'}</p>
    </div>
);

export default function DietPlanPage() {
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDietPlans = async () => {
      setLoading(true);
      const userDocId = localStorage.getItem('userDocId');
      const activeBranchId = localStorage.getItem('activeBranch');
      const memberId = localStorage.getItem('memberId');

      if (!userDocId || !activeBranchId || !memberId) {
        toast({ title: "Error", description: "Session invalid. Please log in again.", variant: "destructive" });
        setLoading(false);
        return;
      }
      
      try {
        const dietPlansCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', memberId, 'dietPlans');
        const q = query(dietPlansCollection, orderBy('sentAt', 'desc'));
        const dietPlansSnapshot = await getDocs(q);

        const plansList = dietPlansSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            sentAt: (data.sentAt as Timestamp).toDate(),
          } as DietPlan;
        });
        setDietPlans(plansList);
      } catch (error) {
        console.error("Error fetching diet plans:", error);
        toast({ title: "Error", description: "Failed to fetch diet plans.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    
    fetchDietPlans();
  }, [toast]);
  

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
        <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-3xl font-bold">My Diet Plans</h1>
                <p className="text-muted-foreground">Here are the diet plans shared by your trainer.</p>
            </div>
            <Link href="/dashboard/member" passHref>
                <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Button>
            </Link>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Diet History</CardTitle>
                <CardDescription>Click on a date to view the diet plan for that day.</CardDescription>
            </CardHeader>
            <CardContent>
                {dietPlans.length > 0 ? (
                    <Accordion type="single" collapsible defaultValue={dietPlans[0]?.id} className="w-full">
                        {dietPlans.map(plan => (
                            <AccordionItem value={plan.id} key={plan.id}>
                                <AccordionTrigger>
                                    <div className="flex items-center gap-3">
                                        <Utensils className="h-5 w-5 text-primary"/>
                                        <span className="font-semibold">Diet Plan for {format(plan.sentAt, 'PPP')}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                                        <DietPlanItem label="Breakfast" value={plan.breakfast} />
                                        <DietPlanItem label="Lunch" value={plan.lunch} />
                                        <DietPlanItem label="Dinner" value={plan.dinner} />
                                        {plan.snacks && <DietPlanItem label="Snacks" value={plan.snacks} />}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <div className="text-center py-16 text-muted-foreground">
                        <Utensils className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-4">Your trainer has not sent any diet plans yet.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
