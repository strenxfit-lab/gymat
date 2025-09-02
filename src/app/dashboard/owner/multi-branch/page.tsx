
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, PlusCircle, Building, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Branch {
  name: string;
}

const addBranchSchema = z.object({
  name: z.string().min(1, 'Branch name is required.'),
});

export default function MultiBranchPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userDocId, setUserDocId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof addBranchSchema>>({
    resolver: zodResolver(addBranchSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    const docId = localStorage.getItem('userDocId');
    if (!docId) {
      toast({ title: "Error", description: "No user session found.", variant: "destructive" });
      router.push('/');
      return;
    }
    setUserDocId(docId);
    
    const fetchBranches = async (docId: string) => {
        try {
            const detailsRef = doc(db, 'gyms', docId, 'details', 'onboarding');
            const detailsSnap = await getDoc(detailsRef);
            let allBranches: Branch[] = [];
            if (detailsSnap.exists()) {
                const data = detailsSnap.data();
                if(data.gymName) {
                    allBranches.push({ name: data.gymName });
                }
                if(data.branches) {
                    allBranches = [...allBranches, ...data.branches];
                }
            }
            setBranches(allBranches);
        } catch (error) {
            console.error("Error fetching branches:", error);
            toast({ title: "Error", description: "Could not fetch branch information.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    fetchBranches(docId);
  }, [router, toast]);

  const onAddBranch = async (values: z.infer<typeof addBranchSchema>) => {
    if (!userDocId) return;

    const newBranch = { name: values.name };
    // We only add the new branch, not the main one which is derived from gymName
    const additionalBranches = branches.slice(1);
    const updatedBranches = [...additionalBranches, newBranch];

    try {
      const detailsRef = doc(db, 'gyms', userDocId, 'details', 'onboarding');
      await updateDoc(detailsRef, { branches: updatedBranches });
      setBranches([branches[0], ...updatedBranches]);
      toast({ title: 'Success!', description: 'New branch has been added.' });
      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error adding branch:", error);
      toast({ title: 'Error', description: 'Could not add branch. Please try again.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Loading Branches...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Multi-branch Management</CardTitle>
                <CardDescription>View and manage your gym locations.</CardDescription>
            </div>
             <Link href="/dashboard/owner" passHref>
                <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4"/>
                    Back
                </Button>
            </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {branches.map((branch, index) => (
              <div key={index} className="flex items-center gap-4 rounded-md border p-4">
                <Building className="h-6 w-6 text-primary" />
                <p className="font-medium">{branch.name}</p>
              </div>
            ))}
            {branches.length === 0 && (
              <p className="text-muted-foreground text-center py-8">No branches found. Add your first one!</p>
            )}
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mt-6 w-full">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Branch
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a New Branch</DialogTitle>
                <DialogDescription>Enter the name of your new gym location.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onAddBranch)} className="space-y-4 py-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Downtown Branch" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Add Branch'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
