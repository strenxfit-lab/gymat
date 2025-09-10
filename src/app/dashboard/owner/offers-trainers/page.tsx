
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, getDocs, Timestamp, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from "@/components/ui/input";
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PlusCircle, ArrowLeft, Edit, Trash, Tags, Calendar, Percent, IndianRupee } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const offerSchema = z.object({
  title: z.string().min(1, 'Offer title is required.'),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required.'),
  endDate: z.string().min(1, 'End date is required.'),
  offerType: z.string().min(1, 'Offer type is required'),
  bonusType: z.enum(['percentage', 'flat'], { required_error: "You need to select a bonus type." }),
  bonusValue: z.coerce.number().min(1, 'Bonus value must be greater than 0.'),
});

interface TrainerOffer extends z.infer<typeof offerSchema> {
  id: string;
}

const getStatus = (startDate: string, endDate: string): { text: 'Active' | 'Upcoming' | 'Expired', variant: 'default' | 'secondary' | 'destructive'} => {
    const now = new Date();
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    if(now < start) return { text: 'Upcoming', variant: 'secondary' };
    if(now > end) return { text: 'Expired', variant: 'destructive' };
    return { text: 'Active', variant: 'default' };
}

export default function TrainerOffersPage() {
  const [offers, setOffers] = useState<TrainerOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<TrainerOffer | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof offerSchema>>({
    resolver: zodResolver(offerSchema),
    defaultValues: { title: '', description: '', startDate: '', endDate: '', offerType: '', bonusValue: 0 },
  });
  
  const fetchOffers = async () => {
    setLoading(true);
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');

    if (!userDocId || !activeBranchId) {
      toast({ title: "Error", description: "Branch not selected.", variant: "destructive" });
      setLoading(false);
      return;
    }
    
    try {
        const offersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainerOffers');
        const offersSnapshot = await getDocs(offersCollection);
        
        const offersList = offersSnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                startDate: (data.startDate as Timestamp).toDate().toISOString().split('T')[0],
                endDate: (data.endDate as Timestamp).toDate().toISOString().split('T')[0],
            } as TrainerOffer;
        });

        offersList.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        setOffers(offersList);

    } catch (error) {
        console.error("Error fetching offers:", error);
        toast({ title: "Error", description: "Failed to fetch offers data.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }

  useEffect(() => {
    fetchOffers();
  }, [toast]);
  
  useEffect(() => {
    if (editingOffer) {
        form.reset(editingOffer);
        setIsFormDialogOpen(true);
    } else {
        form.reset({ title: '', description: '', startDate: '', endDate: '', offerType: '', bonusType: undefined, bonusValue: 0 });
    }
  }, [editingOffer, form]);


  const handleFormDialogStateChange = (open: boolean) => {
      setIsFormDialogOpen(open);
      if (!open) {
          setEditingOffer(null);
      }
  }

  const handleFormSubmit = async (values: z.infer<typeof offerSchema>) => {
    if (editingOffer) {
        await onUpdateOffer(values);
    } else {
        await onAddOffer(values);
    }
  };

  const onAddOffer = async (values: z.infer<typeof offerSchema>) => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId) return;

    try {
      const offersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainerOffers');
      
      await addDoc(offersCollection, {
        ...values,
        startDate: Timestamp.fromDate(new Date(values.startDate)),
        endDate: Timestamp.fromDate(new Date(values.endDate)),
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Success!', description: 'New trainer offer has been created.' });
      handleFormDialogStateChange(false);
      await fetchOffers();
    } catch (error) {
      console.error("Error adding offer:", error);
      toast({ title: 'Error', description: 'Could not create offer. Please try again.', variant: 'destructive' });
    }
  };

  const onUpdateOffer = async (values: z.infer<typeof offerSchema>) => {
      if (!editingOffer) return;
      const userDocId = localStorage.getItem('userDocId');
      const activeBranchId = localStorage.getItem('activeBranch');
      if (!userDocId || !activeBranchId) return;

      try {
        const offerRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainerOffers', editingOffer.id);

        await updateDoc(offerRef, {
            ...values,
            startDate: Timestamp.fromDate(new Date(values.startDate)),
            endDate: Timestamp.fromDate(new Date(values.endDate)),
        });
        
        toast({ title: 'Success!', description: 'Offer details have been updated.' });
        handleFormDialogStateChange(false);
        await fetchOffers();
      } catch (error) {
          console.error("Error updating offer:", error);
          toast({ title: 'Error', description: 'Could not update offer.', variant: 'destructive'});
      }
  }
  
  const onDeleteOffer = async (offerId: string) => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId) return;
    
    try {
        const offerRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainerOffers', offerId);
        await deleteDoc(offerRef);
        toast({ title: "Offer Deleted", description: "The offer has been removed."});
        await fetchOffers();
    } catch (error) {
        console.error("Error deleting offer:", error);
        toast({ title: "Error", description: "Could not delete offer.", variant: "destructive"});
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Trainer Offers</h1>
          <p className="text-muted-foreground">Create and manage promotional offers and bonuses for trainers.</p>
        </div>
        <div className="flex items-center gap-2">
            <Link href="/dashboard/owner/make-offers" passHref>
                <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back</Button>
            </Link>
            <Dialog open={isFormDialogOpen} onOpenChange={handleFormDialogStateChange}>
            <DialogTrigger asChild>
                <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Trainer Offer
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                <DialogTitle>{editingOffer ? 'Edit Offer' : 'Create a New Trainer Offer'}</DialogTitle>
                <DialogDescription>{editingOffer ? 'Update the details for this offer.' : 'Fill in the details for the new promotional offer for trainers.'}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                    <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Offer Title</FormLabel><FormControl><Input placeholder="e.g., Q3 Performance Bonus" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Briefly describe the offer..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="startDate" render={({ field }) => ( <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="endDate" render={({ field }) => ( <FormItem><FormLabel>End Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>

                    <FormField control={form.control} name="offerType" render={({ field }) => ( <FormItem><FormLabel>Offer Type</FormLabel><FormControl><Input placeholder="e.g. Performance Bonus, Referral Incentive" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    
                    <FormField control={form.control} name="bonusType" render={({ field }) => (
                        <FormItem className="space-y-3"><FormLabel>Bonus Type</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="percentage" /></FormControl><FormLabel className="font-normal">Percentage (%)</FormLabel></FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="flat" /></FormControl><FormLabel className="font-normal">Flat (₹)</FormLabel></FormItem>
                                </RadioGroup>
                            </FormControl>
                                <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="bonusValue" render={({ field }) => ( <FormItem><FormLabel>Bonus Value</FormLabel><FormControl><Input type="number" placeholder="e.g., 5 or 1000" {...field} /></FormControl><FormMessage /></FormItem> )} />

                    <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => handleFormDialogStateChange(false)}>Cancel</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : (editingOffer ? 'Save Changes' : 'Create Offer')}
                    </Button>
                    </DialogFooter>
                </form>
                </Form>
            </DialogContent>
            </Dialog>
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl font-bold mb-4">Trainer Offers Dashboard</h2>
        {loading ? <p>Loading offers...</p> : (
            offers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {offers.map(offer => {
                        const status = getStatus(offer.startDate, offer.endDate);
                        return (
                            <Card key={offer.id} className="flex flex-col">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg">{offer.title}</CardTitle>
                                        <Badge variant={status.variant}>{status.text}</Badge>
                                    </div>
                                    <CardDescription className="pt-2">{offer.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 flex-grow">
                                    <div className="flex items-center text-sm text-muted-foreground"><Calendar className="mr-2 h-4 w-4" /> Valid: {format(parseISO(offer.startDate), 'MMM d, yyyy')} - {format(parseISO(offer.endDate), 'MMM d, yyyy')}</div>
                                    <div className="flex items-center text-sm">
                                        {offer.bonusType === 'percentage' ? <Percent className="mr-2 h-4 w-4 text-primary"/> : <IndianRupee className="mr-2 h-4 w-4 text-primary"/>}
                                        <span className="font-semibold text-primary">{offer.bonusValue}{offer.bonusType === 'percentage' ? '%' : ' Flat'} Bonus</span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold mb-2">Offer Type:</h4>
                                        <Badge variant="secondary">{offer.offerType}</Badge>
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-muted/50 p-2 flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setEditingOffer(offer)}><Edit className="mr-2"/>Edit</Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                         <Button variant="destructive" size="sm"><Trash className="mr-2"/>Delete</Button>
                                      </AlertDialogTrigger>
                                       <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete this offer.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => onDeleteOffer(offer.id)}>Continue</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <Tags className="mx-auto h-12 w-12 text-muted-foreground"/>
                    <h3 className="mt-4 text-lg font-semibold">No Trainer Offers Found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Get started by creating your first promotional offer for trainers.</p>
                </div>
            )
        )}
      </div>
    </div>
  );
}
