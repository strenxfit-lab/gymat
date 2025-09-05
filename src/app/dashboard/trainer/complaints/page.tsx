
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, getDocs, Timestamp, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
  complaint: z.string().min(10, { message: 'Please describe your complaint in at least 10 characters.' }),
});

type FormData = z.infer<typeof formSchema>;

interface Complaint {
    id: string;
    complaint: string;
    status: 'Pending' | 'In Review' | 'Resolved';
    submittedAt: string;
}

const getStatusVariant = (status: Complaint['status']) => {
    switch (status) {
        case 'Pending': return 'secondary';
        case 'In Review': return 'default';
        case 'Resolved': return 'destructive';
        default: return 'outline';
    }
}

export default function TrainerComplaintsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [pastComplaints, setPastComplaints] = useState<Complaint[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { complaint: '' },
  });
  
  const fetchComplaints = async () => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    const trainerId = localStorage.getItem('trainerId');

    if (!userDocId || !activeBranchId || !trainerId) {
        toast({ title: 'Error', description: 'Session invalid.', variant: 'destructive' });
        return;
    }

    try {
        const complaintsCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'complaints');
        const q = query(complaintsCollection, where('authorId', '==', trainerId), orderBy('submittedAt', 'desc'));
        const complaintsSnap = await getDocs(q);
        const complaintsList = complaintsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            submittedAt: (doc.data().submittedAt as Timestamp).toDate().toLocaleString()
        } as Complaint));
        setPastComplaints(complaintsList);
    } catch (error) {
        console.error("Error fetching complaints:", error);
        toast({ title: "Error", description: "Could not fetch past complaints.", variant: "destructive" });
    } finally {
        setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [toast]);


  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    const trainerId = localStorage.getItem('trainerId');
    const trainerName = localStorage.getItem('userName'); // Assuming name is stored

    if (!userDocId || !activeBranchId || !trainerId) {
        toast({ title: 'Error', description: 'Session invalid. Cannot submit complaint.', variant: 'destructive' });
        setIsLoading(false);
        return;
    }

    try {
        const complaintsCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'complaints');
        await addDoc(complaintsCollection, {
            complaint: data.complaint,
            authorId: trainerId,
            authorName: trainerName || "Unknown Trainer",
            authorRole: 'trainer',
            status: 'Pending',
            submittedAt: Timestamp.now(),
        });
        toast({ title: 'Complaint Submitted!', description: 'Thank you for your feedback. We will look into it shortly.'});
        form.reset();
        setIsFetching(true);
        fetchComplaints();
    } catch (error) {
        console.error("Error submitting complaint:", error);
        toast({ title: 'Submission Failed', description: 'An error occurred. Please try again.', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-10">
        <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-3xl font-bold">Complaints & Feedback</h1>
                <p className="text-muted-foreground">Lodge a complaint or view your past submissions.</p>
            </div>
            <Link href="/dashboard/trainer" passHref>
                <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Button>
            </Link>
        </div>

        <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create">Create Complaint</TabsTrigger>
                <TabsTrigger value="history">Past Complaints</TabsTrigger>
            </TabsList>
            <TabsContent value="create">
                <Card>
                    <CardHeader>
                        <CardTitle>Submit a New Complaint</CardTitle>
                        <CardDescription>We value your feedback. Please describe your issue in detail.</CardDescription>
                    </CardHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                            <CardContent>
                                <FormField
                                    control={form.control}
                                    name="complaint"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Your Complaint</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Please tell us what happened..."
                                                className="min-h-[150px]"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                            <CardContent className="flex justify-end">
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                                    Submit Complaint
                                </Button>
                            </CardContent>
                        </form>
                    </Form>
                </Card>
            </TabsContent>
            <TabsContent value="history">
                 <Card>
                    <CardHeader>
                        <CardTitle>Your Complaint History</CardTitle>
                        <CardDescription>Here's a list of your previous submissions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isFetching ? (
                            <div className="flex justify-center items-center h-40">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : pastComplaints.length > 0 ? (
                            <div className="space-y-4 max-h-[500px] overflow-y-auto">
                                {pastComplaints.map(c => (
                                    <div key={c.id} className="p-4 border rounded-md">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-sm text-muted-foreground">{c.submittedAt}</p>
                                            <Badge variant={getStatusVariant(c.status)}>{c.status}</Badge>
                                        </div>
                                        <p className="text-sm">{c.complaint}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div className="text-center py-10 text-muted-foreground">
                                <p>You have not submitted any complaints yet.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}
