
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, getDocs, Timestamp, deleteDoc, doc, updateDoc, query, where, getDoc, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from "@/components/ui/input";
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PlusCircle, ArrowLeft, MoreHorizontal, Edit, Trash, Tags, Calendar, Percent, IndianRupee, Users, TrendingUp, Phone, Mail } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


const membershipPlans = [
    { id: "monthly", label: "Monthly" },
    { id: "quarterly", label: "Quarterly" },
    { id: "half-yearly", label: "Half-Yearly" },
    { id: "yearly", label: "Yearly" },
    { id: "trial", label: "Trial" },
];

const offerSchema = z.object({
  title: z.string().min(1, 'Offer title is required.'),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required.'),
  endDate: z.string().min(1, 'End date is required.'),
  applicablePlans: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You have to select at least one plan.",
  }),
  discountType: z.enum(['percentage', 'flat'], { required_error: "You need to select a discount type." }),
  discountValue: z.coerce.number().min(1, 'Discount value must be greater than 0.'),
});

interface Offer extends z.infer<typeof offerSchema> {
  id: string;
  availed: number;
  revenue: number;
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
}

const getStatus = (startDate: string, endDate: string): { text: 'Active' | 'Upcoming' | 'Expired', variant: 'default' | 'secondary' | 'destructive'} => {
    const now = new Date();
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    if(now < start) return { text: 'Upcoming', variant: 'secondary' };
    if(now > end) return { text: 'Expired', variant: 'destructive' };
    return { text: 'Active', variant: 'default' };
}

function LimitReachedDialog({ isOpen, onOpenChange, limits }: { isOpen: boolean; onOpenChange: (open: boolean) => void, limits: LimitDialogInfo }) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>You've reached the limit of your trial account</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 pt-2">
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
            <p className="font-semibold pt-2">Upgrade to a full Account to continue managing without restrictions.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col space-y-2">
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

export default function MemberOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [isTrial, setIsTrial] = useState(false);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [limitInfo, setLimitInfo] = useState<LimitDialogInfo>({});
  const { toast } = useToast();

  const form = useForm<z.infer<typeof offerSchema>>({
    resolver: zodResolver(offerSchema),
    defaultValues: { title: '', description: '', startDate: '', endDate: '', applicablePlans: [], discountValue: 0 },
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

    const gymRef = doc(db, 'gyms', userDocId);
    const gymSnap = await getDoc(gymRef);
    if (gymSnap.exists() && gymSnap.data().isTrial) {
        setIsTrial(true);
    }
    
    try {
        const offersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'offers');
        const offersSnapshot = await getDocs(offersCollection);

        // This is a collection group query. It will require an index.
        const paymentsQuery = query(collectionGroup(db, 'payments'), where('appliedOfferId', '!=', ''));
        const paymentsSnap = await getDocs(paymentsQuery);
        
        // We must filter by gym/branch on the client side for collection group queries.
        const allPaymentsForGym = [];
        for (const paymentDoc of paymentsSnap.docs) {
            const path = paymentDoc.ref.path.split('/');
            // path is like: gyms/{gymId}/branches/{branchId}/members/{memberId}/payments/{paymentId}
            if (path[1] === userDocId && path[3] === activeBranchId) {
                 allPaymentsForGym.push(paymentDoc.data());
            }
        }
        
        const offersList = offersSnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const offerId = docSnap.id;

            const analytics = allPaymentsForGym
                .filter(p => p.appliedOfferId === offerId)
                .reduce((acc, p) => {
                    acc.availed += 1;
                    acc.revenue += p.amountPaid;
                    return acc;
                }, { availed: 0, revenue: 0 });

            return {
                id: offerId,
                ...data,
                startDate: (data.startDate as Timestamp).toDate().toISOString().split('T')[0],
                endDate: (data.endDate as Timestamp).toDate().toISOString().split('T')[0],
                availed: analytics.availed,
                revenue: analytics.revenue,
            } as Offer;
        });

        offersList.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        setOffers(offersList);

    } catch (error) {
        console.error("Error fetching offers:", error);
        toast({ title: "Error", description: "Failed to fetch offers data. You may need to create a Firestore index. See console for details.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }

  useEffect(() => {
    fetchOffers();
  }, [toast]);
  
  useEffect(() => {
    if (editingOffer) {
        form.reset({
            ...editingOffer,
            // @ts-ignore
            availed: undefined,
            revenue: undefined,
        });
        setIsFormDialogOpen(true);
    } else {
        form.reset({ title: '', description: '', startDate: '', endDate: '', applicablePlans: [], discountType: undefined, discountValue: 0 });
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

    if(isTrial) {
        if (offers.length >= 1) {
            setLimitInfo({ offers: offers.length });
            setLimitDialogOpen(true);
            return;
        }
    }

    try {
      const offersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'offers');
      
      await addDoc(offersCollection, {
        ...values,
        startDate: Timestamp.fromDate(new Date(values.startDate)),
        endDate: Timestamp.fromDate(new Date(values.endDate)),
        createdAt: Timestamp.now(),
      });

      toast({ title: 'Success!', description: 'New offer has been created.' });
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
        const offerRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'offers', editingOffer.id);

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
        const offerRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'offers', offerId);
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
      <LimitReachedDialog isOpen={limitDialogOpen} onOpenChange={setLimitDialogOpen} limits={limitInfo} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Member Offers</h1>
          <p className="text-muted-foreground">Create and manage promotional offers for members.</p>
        </div>
        <div className="flex items-center gap-2">
            <Link href="/dashboard/owner/make-offers" passHref>
                <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back</Button>
            </Link>
            <Dialog open={isFormDialogOpen} onOpenChange={handleFormDialogStateChange}>
            <DialogTrigger asChild>
                <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Offer
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                <DialogTitle>{editingOffer ? 'Edit Offer' : 'Create a New Offer'}</DialogTitle>
                <DialogDescription>{editingOffer ? 'Update the details for this offer.' : 'Fill in the details for the new promotional offer.'}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                    <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Offer Title</FormLabel><FormControl><Input placeholder="e.g., Summer Fitness Deal" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Briefly describe the offer..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="startDate" render={({ field }) => ( <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="endDate" render={({ field }) => ( <FormItem><FormLabel>End Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>

                    <FormField control={form.control} name="applicablePlans" render={() => (
                        <FormItem>
                            <FormLabel>Applicable Plans</FormLabel>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 rounded-md border p-4">
                            {membershipPlans.map((plan) => (
                                <FormField key={plan.id} control={form.control} name="applicablePlans" render={({ field }) => (
                                    <FormItem key={plan.id} className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl><Checkbox checked={field.value?.includes(plan.id)} onCheckedChange={(checked) => {
                                            return checked ? field.onChange([...(field.value || []), plan.id]) : field.onChange(field.value?.filter((value) => value !== plan.id));
                                        }} /></FormControl>
                                        <FormLabel className="font-normal">{plan.label}</FormLabel>
                                    </FormItem>
                                    )}
                                />
                            ))}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    
                    <FormField control={form.control} name="discountType" render={({ field }) => (
                        <FormItem className="space-y-3"><FormLabel>Discount Type</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="percentage" /></FormControl><FormLabel className="font-normal">Percentage (%)</FormLabel></FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="flat" /></FormControl><FormLabel className="font-normal">Flat (₹)</FormLabel></FormItem>
                                </RadioGroup>
                            </FormControl>
                                <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="discountValue" render={({ field }) => ( <FormItem><FormLabel>Discount Value</FormLabel><FormControl><Input type="number" placeholder="e.g., 20 or 500" {...field} /></FormControl><FormMessage /></FormItem> )} />


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
        <h2 className="text-2xl font-bold mb-4">Offers Dashboard</h2>
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
                                        {offer.discountType === 'percentage' ? <Percent className="mr-2 h-4 w-4 text-primary"/> : <IndianRupee className="mr-2 h-4 w-4 text-primary"/>}
                                        <span className="font-semibold text-primary">{offer.discountValue}{offer.discountType === 'percentage' ? '%' : ' Flat'} Discount</span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold mb-2">Applicable on:</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {offer.applicablePlans.map(planId => (
                                                <Badge key={planId} variant="secondary">{membershipPlans.find(p=>p.id === planId)?.label || planId}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="border-t pt-3 mt-3 space-y-2">
                                        <h4 className="text-sm font-semibold">Analytics</h4>
                                        <div className="flex items-center text-sm text-muted-foreground"><Users className="mr-2 h-4 w-4" /> Availed by: <span className="font-bold text-foreground ml-1">{offer.availed} members</span></div>
                                        <div className="flex items-center text-sm text-muted-foreground"><TrendingUp className="mr-2 h-4 w-4" /> Revenue: <span className="font-bold text-foreground ml-1">₹{offer.revenue.toLocaleString()}</span></div>
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
                    <h3 className="mt-4 text-lg font-semibold">No Offers Found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Get started by creating your first promotional offer.</p>
                </div>
            )
        )}
      </div>
    </div>
  );
}
