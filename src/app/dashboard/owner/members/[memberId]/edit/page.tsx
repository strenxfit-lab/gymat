
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, Timestamp, getDoc, updateDoc, collection, addDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, User, HeartPulse, ArrowLeft, Star } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';


const formSchema = z.object({
  height: z.string().optional(),
  weight: z.string().optional(),
  medicalConditions: z.string().optional(),
  fitnessGoal: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface MemberData {
    fullName?: string;
    phone?: string;
    email?: string;
    membershipType?: string;
    assignedTrainer?: string;
}

export default function EditMemberPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [memberData, setMemberData] = useState<MemberData>({});
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const memberId = params.memberId as string;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        height: '',
        weight: '',
        medicalConditions: '',
        fitnessGoal: '',
    },
  });

  useEffect(() => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');

    if (!userDocId || !activeBranchId || !memberId) {
      toast({ title: 'Error', description: 'Session, branch, or member ID not found.', variant: 'destructive' });
      router.push('/dashboard/owner/members');
      return;
    }

    const fetchMemberData = async () => {
      try {
        const memberRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', memberId);
        const memberSnap = await getDoc(memberRef);

        if (memberSnap.exists()) {
          const data = memberSnap.data();
          form.reset({
            height: data.height || '',
            weight: data.weight || '',
            medicalConditions: data.medicalConditions || '',
            fitnessGoal: data.fitnessGoal || '',
          });
          setMemberData({
            fullName: data.fullName,
            phone: data.phone,
            email: data.email,
            membershipType: data.membershipType,
            assignedTrainer: data.assignedTrainer,
          });
        } else {
          toast({ title: 'Not Found', description: 'Member data could not be found.', variant: 'destructive' });
          router.push('/dashboard/owner/members');
        }
      } catch (error) {
        console.error("Error fetching member:", error);
        toast({ title: 'Error', description: 'Failed to fetch member details.', variant: 'destructive' });
      } finally {
        setIsFetching(false);
      }
    };

    fetchMemberData();
  }, [memberId, router, toast, form]);

  const onSubmit = async (data: FormData) => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId || !memberId) {
      toast({ title: 'Error', description: 'Session or identifiers missing.', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);

    try {
      const memberRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', memberId);
      await updateDoc(memberRef, data);
      toast({ title: 'Success!', description: 'Member health details updated successfully.' });
      router.push(`/dashboard/owner/members/${memberId}`);
    } catch (error) {
      console.error("Error updating member:", error);
      toast({ title: 'Error', description: 'Could not update member. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRatingSubmit = async () => {
    if (rating === 0 || !memberData.assignedTrainer) return;
    setIsSubmittingRating(true);

    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId) return;

    try {
        const trainerRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers', memberData.assignedTrainer);
        
        await runTransaction(db, async (transaction) => {
            const trainerDoc = await transaction.get(trainerRef);
            if (!trainerDoc.exists()) {
                throw "Trainer not found!";
            }
            const trainerData = trainerDoc.data();
            const currentRatings = trainerData.ratings || { totalStars: 0, ratingCount: 0 };
            
            const newTotalStars = currentRatings.totalStars + rating;
            const newRatingCount = currentRatings.ratingCount + 1;
            const newAverageRating = newTotalStars / newRatingCount;

            transaction.update(trainerRef, {
                ratings: {
                    totalStars: newTotalStars,
                    ratingCount: newRatingCount,
                    averageRating: newAverageRating,
                }
            });
        });

        toast({ title: 'Rating Submitted!', description: 'Thank you for your feedback.' });
        setRating(0);
    } catch (error) {
        console.error("Error submitting rating: ", error);
        toast({ title: 'Error', description: 'Could not submit rating. Please try again.', variant: 'destructive' });
    } finally {
        setIsSubmittingRating(false);
    }
  }

  if (isFetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading member details...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle>Edit Member Profile</CardTitle>
                <CardDescription>Update health, fitness, and trainer rating for {memberData.fullName}.</CardDescription>
            </CardHeader>
            
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-6">
                    <div className="space-y-4 rounded-md border bg-muted/50 p-4">
                        <h3 className="font-semibold flex items-center gap-2"><User /> Member Details (Read-Only)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <p><strong>Phone:</strong> {memberData.phone}</p>
                            <p><strong>Email:</strong> {memberData.email || 'N/A'}</p>
                            <p><strong>Membership:</strong> {memberData.membershipType}</p>
                        </div>
                    </div>
                    
                    <Separator />

                    <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2"><HeartPulse /> Health & Fitness (Editable)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="height" render={({ field }) => ( <FormItem><FormLabel>Height (cm)</FormLabel><FormControl><Input placeholder="175" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="weight" render={({ field }) => ( <FormItem><FormLabel>Weight (kg)</FormLabel><FormControl><Input placeholder="70" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="fitnessGoal" render={({ field }) => (
                                    <FormItem className="md:col-span-2"><FormLabel>Fitness Goal</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select goal" /></SelectTrigger></FormControl>
                                        <SelectContent><SelectItem value="weight-loss">Weight Loss</SelectItem><SelectItem value="muscle-gain">Muscle Gain</SelectItem><SelectItem value="general-fitness">General Fitness</SelectItem><SelectItem value="strength">Strength</SelectItem></SelectContent>
                                    </Select><FormMessage />
                                    </FormItem>
                            )} />
                            <FormField control={form.control} name="medicalConditions" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Medical Conditions</FormLabel><FormControl><Textarea placeholder="e.g., Asthma, previous injuries..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                     <Link href={`/dashboard/owner/members/${memberId}`} passHref>
                        <Button type="button" variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Cancel</Button>
                    </Link>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Save Changes'}
                    </Button>
                </CardFooter>
            </form>
            </Form>

            {memberData.assignedTrainer && (
                <>
                <Separator className="my-4"/>
                <CardContent>
                    <div className="space-y-4">
                        <h3 className="font-semibold">Rate Your Trainer</h3>
                        <div className="flex items-center gap-2">
                            {[...Array(5)].map((_, index) => {
                                const starValue = index + 1;
                                return (
                                    <Star
                                        key={starValue}
                                        className={cn(
                                            "h-8 w-8 cursor-pointer transition-colors",
                                            starValue <= (hoverRating || rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                                        )}
                                        onClick={() => setRating(starValue)}
                                        onMouseEnter={() => setHoverRating(starValue)}
                                        onMouseLeave={() => setHoverRating(0)}
                                    />
                                );
                            })}
                        </div>
                        <Button onClick={handleRatingSubmit} disabled={isSubmittingRating || rating === 0}>
                            {isSubmittingRating ? <Loader2 className="animate-spin" /> : "Submit Rating"}
                        </Button>
                    </div>
                </CardContent>
                </>
            )}

        </Card>
    </div>
  );
}

    