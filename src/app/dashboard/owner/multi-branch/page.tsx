
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, collection, addDoc, getDocs } from 'firebase/firestore';
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
import { Loader2, PlusCircle, Building, ArrowLeft, Phone, Mail } from 'lucide-react';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


interface Branch {
  id: string;
  name: string;
}

interface LimitDialogInfo {
    members?: number;
    trainers?: number;
    payments?: number;
    equipment?: number;
    classes?: number;
    expenses?: number;
    inventory?: number;
    maintenance?: number;
    offers?: number;
    usageLogs?: number;
    branches?: number;
}

const addBranchSchema = z.object({
  name: z.string().min(1, 'Branch name is required.'),
});

function LimitReachedDialog({ isOpen, onOpenChange, limits, isMultiBranchError = false }: { isOpen: boolean; onOpenChange: (open: boolean) => void, limits: LimitDialogInfo, isMultiBranchError?: boolean }) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isMultiBranchError ? "Multi-Branch Feature Not Enabled" : "You've reached the limit of your trial account"}</AlertDialogTitle>
          <AlertDialogDescription>
            {isMultiBranchError
              ? "Your current plan only supports one branch. To add more locations, please upgrade your plan."
              : "Upgrade to a full Account to continue managing without restrictions."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {!isMultiBranchError && (
            <div className="text-sm text-muted-foreground space-y-2">
                {limits.branches !== undefined && <p>Branches ({limits.branches}/1)</p>}
                {limits.members !== undefined && <p>Members ({limits.members}/3)</p>}
                {limits.trainers !== undefined && <p>Trainers ({limits.trainers}/2)</p>}
                {limits.payments !== undefined && <p>Payments ({limits.payments}/5 per member)</p>}
                {limits.equipment !== undefined && <p>Equipment ({limits.equipment}/1)</p>}
                {limits.classes !== undefined && <p>Classes ({limits.classes}/1)</p>}
                {limits.expenses !== undefined && <p>Expenses ({limits.expenses}/2)</p>}
                {limits.inventory !== undefined && <p>Inventory ({limits.inventory}/1)</p>}
                {limits.maintenance !== undefined && <p>Maintenance ({limits.maintenance}/1)</p>}
                {limits.offers !== undefined && <p>Offers ({limits.offers}/1)</p>}
                {limits.usageLogs !== undefined && <p>Usage Logs ({limits.usageLogs}/1)</p>}
            </div>
        )}

        <div className="flex flex-col space-y-2 pt-2">
            <p className="font-bold text-center">Contact Strenxfit Support</p>
            <a href="https://wa.me/917988487892" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 p-3 rounded-md hover:bg-accent transition-colors">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <span>+91 79884 87892</span>
            </a>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function MultiBranchPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userDocId, setUserDocId] = useState<string | null>(null);
  const [isTrial, setIsTrial] = useState(false);
  const [hasMultiBranch, setHasMultiBranch] = useState(false);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [isMultiBranchLimitError, setIsMultiBranchLimitError] = useState(false);
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
            const gymRef = doc(db, 'gyms', docId);
            const gymSnap = await getDoc(gymRef);
            if(gymSnap.exists()){
                const gymData = gymSnap.data();
                setIsTrial(gymData.isTrial || false);
                setHasMultiBranch(gymData.multiBranch || false);
            }

            const branchesCollection = collection(db, 'gyms', docId, 'branches');
            const branchesSnapshot = await getDocs(branchesCollection);
            const allBranches = branchesSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));

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
    
    if ((isTrial || !hasMultiBranch) && branches.length >= 1) {
        setIsMultiBranchLimitError(!hasMultiBranch && !isTrial);
        setLimitDialogOpen(true);
        return;
    }

    const newBranch = { name: values.name };
    
    try {
      const branchesCollection = collection(db, 'gyms', userDocId, 'branches');
      const docRef = await addDoc(branchesCollection, newBranch);
      setBranches([...branches, { id: docRef.id, name: values.name }]);
      toast({ title: 'Success!', description: 'New branch has been added.' });
      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error adding branch:", error);
      toast({ title: 'Error', description: 'Could not add branch. Please try again.', variant: 'destructive' });
    }
  };

  const handleBranchClick = (branchId: string) => {
    localStorage.setItem('activeBranch', branchId);
    router.push('/dashboard/owner');
  }

  const handleAddBranchClick = () => {
    if ((isTrial || !hasMultiBranch) && branches.length >= 1) {
        setIsMultiBranchLimitError(!hasMultiBranch && !isTrial);
        setLimitDialogOpen(true);
    } else {
        setIsDialogOpen(true);
    }
  }

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
        <LimitReachedDialog 
            isOpen={limitDialogOpen} 
            onOpenChange={setLimitDialogOpen} 
            limits={{ branches: branches.length }}
            isMultiBranchError={isMultiBranchLimitError}
        />
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Multi-branch Management</CardTitle>
                <CardDescription>Select a branch to manage or add a new one.</CardDescription>
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
            {branches.map((branch) => (
              <button 
                key={branch.id} 
                onClick={() => handleBranchClick(branch.id)}
                className="w-full flex items-center gap-4 rounded-md border p-4 text-left hover:bg-accent transition-colors"
              >
                <Building className="h-6 w-6 text-primary" />
                <p className="font-medium">{branch.name}</p>
              </button>
            ))}
            {branches.length === 0 && (
              <p className="text-muted-foreground text-center py-8">No branches found. Add your first one!</p>
            )}
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Button className="mt-6 w-full" onClick={handleAddBranchClick}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Branch
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a New Branch</DialogTitle>
                <DialogDescription>Enter the name of your new gym location.</DialogDescription>
              </DialogHeader>
               <div className="py-4">
                <h4 className="text-sm font-medium mb-2">Current Branches:</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                    {branches.map((branch) => (
                        <div key={branch.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building className="h-4 w-4" />
                            <span>{branch.name}</span>
                        </div>
                    ))}
                </div>
              </div>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onAddBranch)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Branch Name</FormLabel>
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
