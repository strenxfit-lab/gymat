
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, addDays, parseISO, isSameDay } from 'date-fns';
import { Loader2, Calendar as CalendarIcon, Search, Check, Building, AlertTriangle, Tags, Phone, Mail } from 'lucide-react';
import { collection, addDoc, getDocs, Timestamp, doc, updateDoc, getDoc, query, where, collectionGroup, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogAction } from '@/components/ui/alert-dialog';


const formSchema = z.object({
  memberId: z.string().nonempty({ message: "Please select a member." }),
  membershipPlan: z.string().optional(),
  appliedOfferId: z.string().optional(),
  appliedOfferTitle: z.string().optional(),
  totalFee: z.number().positive({ message: "Fee must be positive." }),
  discount: z.union([z.number().min(0), z.string()]).optional(),
  amountPaid: z.number().positive({ message: "Paid amount must be positive." }),
  balanceDue: z.number().min(0),
  paymentDate: z.date(),
  paymentMode: z.string().nonempty({ message: "Please select a payment mode." }),
  transactionId: z.string().optional(),
  nextDueDate: z.date().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Member {
  id: string;
  fullName: string;
  phone: string;
  membershipType: string;
  totalFee: number;
  startDate?: Date;
  status?: 'Active' | 'Frozen' | 'Stopped' | 'Expired';
}

interface Offer {
  id: string;
  title: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  applicablePlans: string[];
}

interface MembershipPlan {
  name: string;
  price: string;
}

interface LimitDialogInfo {
  members: number;
  trainers: number;
  payments?: number;
}

const defaultPlans = ["monthly", "quarterly", "half-yearly", "yearly", "trial"];

function NoBranchDialog() {
    const router = useRouter();
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <AlertDialog open={true}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>No Branch Found</AlertDialogTitle>
                    <AlertDialogDescription>
                    You need to create a branch before you can collect fees. Please go to the branch management page to add your first branch.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Link href="/dashboard/owner" passHref>
                        <Button variant="outline">Go to Dashboard</Button>
                    </Link>
                    <Button onClick={() => router.push('/dashboard/owner/multi-branch')}>Create Branch</Button>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

function LimitReachedDialog({ isOpen, onOpenChange, limits }: { isOpen: boolean; onOpenChange: (open: boolean) => void, limits: LimitDialogInfo }) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>You've reached the limit of your trial account</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 pt-2">
            <p>Members ({limits.members}/3)</p>
            <p>Trainers ({limits.trainers}/2)</p>
            {limits.payments !== undefined && <p>Payments ({limits.payments}/5 per member)</p>}
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


export default function AddPaymentPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [statusDialogMessage, setStatusDialogMessage] = useState('');
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isTrial, setIsTrial] = useState(false);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [limitInfo, setLimitInfo] = useState<LimitDialogInfo>({ members: 0, trainers: 0 });
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      memberId: '',
      membershipPlan: '',
      appliedOfferId: '',
      appliedOfferTitle: '',
      totalFee: 0,
      discount: '',
      amountPaid: 0,
      balanceDue: 0,
      paymentDate: new Date(),
      paymentMode: 'cash',
      transactionId: '',
      nextDueDate: undefined
    },
  });

  useEffect(() => {
    const branchId = localStorage.getItem('activeBranch');
    setActiveBranchId(branchId);
    
    const userDocId = localStorage.getItem('userDocId');
    if (userDocId) {
        const gymRef = doc(db, 'gyms', userDocId);
        getDoc(gymRef).then(gymSnap => {
            if (gymSnap.exists() && gymSnap.data().isTrial) {
                setIsTrial(true);
            }
        });
    }

  }, []);

  const fetchMembersAndOffers = async (branchId: string) => {
    const userDocId = localStorage.getItem('userDocId');
    if (!userDocId) return { membersList: [], offersList: [] };
    
    // Fetch Members
    const membersCollection = collection(db, 'gyms', userDocId, 'branches', branchId, 'members');
    const membersSnapshot = await getDocs(membersCollection);
    const membersList = membersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          fullName: data.fullName,
          phone: data.phone,
          membershipType: data.membershipType,
          totalFee: data.totalFee,
          status: data.status || 'Active',
          startDate: data.startDate ? (data.startDate as Timestamp).toDate() : undefined,
        };
    });
    setMembers(membersList);

    // Fetch Active Offers
    const now = new Date();
    const offersRef = collection(db, 'gyms', userDocId, 'branches', branchId, 'offers');
    const q = query(offersRef, where("endDate", ">=", Timestamp.fromDate(now)));
    const offersSnap = await getDocs(q);
    const offersList = offersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Offer));
    setOffers(offersList);

     // Fetch Membership Plans
    const detailsRef = doc(db, 'gyms', userDocId, 'details', 'onboarding');
    const detailsSnap = await getDoc(detailsRef);
    if(detailsSnap.exists() && detailsSnap.data().plans) {
        setMembershipPlans(detailsSnap.data().plans);
    }

    return { membersList, offersList };
  };

  useEffect(() => {
    const memberIdFromUrl = searchParams.get('memberId');
    
    const initialize = async () => {
        if(activeBranchId) {
            const { membersList } = await fetchMembersAndOffers(activeBranchId);
            if (memberIdFromUrl && membersList) {
                const member = membersList.find(m => m.id === memberIdFromUrl);
                if(member) {
                    form.setValue('memberId', memberIdFromUrl);
                }
            }
        }
    }
    initialize();
  }, [searchParams, form, activeBranchId]);

    useEffect(() => {
        if (isMemberDropdownOpen && activeBranchId) {
            fetchMembersAndOffers(activeBranchId);
        }
    }, [isMemberDropdownOpen, activeBranchId]);


    useEffect(() => {
        const subscription = form.watch((values, { name }) => {
            const { memberId, membershipPlan, paymentDate, appliedOfferId, totalFee, discount, amountPaid } = values;

            if (name === 'memberId' && memberId) {
                const member = members.find(m => m.id === memberId);
                if (member) {
                    if (member.status === 'Frozen' || member.status === 'Stopped') {
                        setStatusDialogMessage(`This member's account is currently ${member.status}. To collect payment, please reactivate their account from the Member Status page.`);
                        setIsStatusDialogOpen(true);
                        return;
                    }
                    setSelectedMember(member);
                    form.reset({
                        ...form.getValues(),
                        membershipPlan: member.membershipType,
                        totalFee: member.totalFee || 0,
                        amountPaid: member.totalFee || 0,
                        balanceDue: 0,
                        appliedOfferId: 'none',
                        appliedOfferTitle: '',
                        discount: '',
                    });
                }
            }
            
            if (name === 'membershipPlan' && membershipPlan) {
                const planDetails = membershipPlans.find(p => p.name.toLowerCase() === membershipPlan.toLowerCase());
                let newFee = selectedMember?.totalFee || 0;
                if (planDetails && planDetails.price) {
                    newFee = parseFloat(planDetails.price);
                }
                if(newFee !== totalFee){
                    form.reset({
                        ...form.getValues(),
                        totalFee: newFee,
                        appliedOfferId: 'none',
                        appliedOfferTitle: '',
                        discount: '',
                        amountPaid: newFee,
                        balanceDue: 0,
                    });
                }
            }

            if ((name === 'membershipPlan' || name === 'paymentDate') && membershipPlan && paymentDate) {
                let newEndDate = new Date(paymentDate);
                switch (membershipPlan) {
                    case 'trial': newEndDate = addDays(newEndDate, 7); break;
                    case 'monthly': newEndDate = addDays(newEndDate, 30); break;
                    case 'quarterly': newEndDate = addDays(newEndDate, 90); break;
                    case 'half-yearly': newEndDate = addDays(newEndDate, 180); break;
                    case 'yearly': newEndDate = addDays(newEndDate, 365); break;
                }
                if (form.getValues('nextDueDate') !== newEndDate) {
                    form.setValue('nextDueDate', newEndDate, { shouldValidate: true });
                }
            }
            
            if (['totalFee', 'discount', 'appliedOfferId'].includes(name!)) {
                let currentDiscount = typeof discount === 'string' ? parseFloat(discount) || 0 : (discount || 0);
                
                if (name === 'appliedOfferId') {
                    const offer = offers.find(o => o.id === appliedOfferId);
                    if (offer) {
                        currentDiscount = offer.discountType === 'percentage'
                            ? (totalFee! * offer.discountValue) / 100
                            : offer.discountValue;
                        if (form.getValues('discount') !== currentDiscount) {
                            form.setValue('discount', currentDiscount);
                            form.setValue('appliedOfferTitle', offer.title);
                        }
                    } else if (appliedOfferId === 'none') {
                        currentDiscount = 0;
                        if (form.getValues('discount') !== '') {
                            form.setValue('discount', '');
                            form.setValue('appliedOfferTitle', '');
                        }
                    }
                }
                
                const finalPayable = totalFee! - currentDiscount;
                const newAmountPaid = finalPayable > 0 ? finalPayable : 0;
                if (amountPaid !== newAmountPaid) {
                     form.setValue('amountPaid', newAmountPaid, { shouldValidate: true });
                }
            }

            if(['totalFee', 'discount', 'appliedOfferId', 'amountPaid'].includes(name!)) {
                let currentDiscount = typeof discount === 'string' ? parseFloat(discount) || 0 : (discount || 0);
                const finalPayable = totalFee! - currentDiscount;
                const newBalanceDue = (finalPayable > 0 ? finalPayable : 0) - (amountPaid || 0);
                if (form.getValues('balanceDue') !== newBalanceDue) {
                    form.setValue('balanceDue', newBalanceDue > 0 ? newBalanceDue : 0);
                }
            }
        });
        return () => subscription.unsubscribe();
  }, [form, members, selectedMember, offers, membershipPlans]);


  const onSubmit = async (data: FormData) => {
    const userDocId = localStorage.getItem('userDocId');
    if (!userDocId || !selectedMember || !activeBranchId) {
      toast({ title: 'Error', description: 'Session, member, or branch not found.', variant: 'destructive' });
      return;
    }
    
    if (isTrial) {
        const membersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'members');
        const membersSnapshot = await getDocs(membersCollection);
        const trainersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers');
        const trainersSnapshot = await getDocs(trainersCollection);
        const paymentsCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', data.memberId, 'payments');
        const paymentsSnapshot = await getDocs(paymentsCollection);

        setLimitInfo({ members: membersSnapshot.size, trainers: trainersSnapshot.size, payments: paymentsSnapshot.size });

        if (paymentsSnapshot.size >= 5) {
            setLimitDialogOpen(true);
            return;
        }
    }

    setIsLoading(true);

    try {
      const paymentsCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', data.memberId, 'payments');
      await addDoc(paymentsCollection, {
        ...data,
        appliedOfferId: data.appliedOfferId === 'none' ? '' : data.appliedOfferId,
        discount: data.discount ? parseFloat(data.discount as string) : 0,
        paymentDate: Timestamp.fromDate(data.paymentDate),
        nextDueDate: data.nextDueDate ? Timestamp.fromDate(data.nextDueDate) : null,
        createdAt: serverTimestamp(),
      });
      
      const memberRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', data.memberId);
      await updateDoc(memberRef, {
          endDate: data.nextDueDate ? Timestamp.fromDate(data.nextDueDate) : null,
          membershipType: data.membershipPlan,
          totalFee: data.totalFee,
          lastPaymentDate: Timestamp.fromDate(data.paymentDate), // Flag for notifications
      });


      toast({
        title: 'Payment Added!',
        description: `Payment for ${selectedMember?.fullName} has been recorded.`,
      });
      window.location.href = '/dashboard/owner';
    } catch (error) {
      console.error("Error adding payment:", error);
      toast({
        title: 'Error',
        description: 'Could not record payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const applicableOffers = selectedMember ? offers.filter(o => o.applicablePlans.includes(form.watch('membershipPlan') ?? '')) : [];
  
  const combinedPlans = [...new Set([...membershipPlans.map(p => p.name.toLowerCase()), ...defaultPlans])];

  if (!activeBranchId) {
      return <NoBranchDialog />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <LimitReachedDialog isOpen={limitDialogOpen} onOpenChange={setLimitDialogOpen} limits={limitInfo} />
        <AlertDialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/> Account Inactive</AlertDialogTitle>
                    <AlertDialogDescription>{statusDialogMessage}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button variant="outline" onClick={() => { setIsStatusDialogOpen(false); form.reset(); }}>Cancel</Button>
                    <AlertDialogAction onClick={() => router.push('/dashboard/owner/member-status')}>Go to Member Status</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <Card className="w-full max-w-2xl">
            <CardHeader>
            <CardTitle>Collect Fee</CardTitle>
            <CardDescription>Record a new payment from a member.</CardDescription>
            </CardHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                
                <div className="space-y-4 border-b pb-4">
                    <FormField
                        control={form.control}
                        name="memberId"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Select Member</FormLabel>
                            <Popover open={isMemberDropdownOpen} onOpenChange={setIsMemberDropdownOpen}>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                        {field.value ? members.find((m) => m.id === field.value)?.fullName : "Select member"}
                                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                        <CommandInput placeholder="Search by name or phone..." />
                                        <CommandList>
                                            <CommandEmpty>No members found.</CommandEmpty>
                                            <CommandGroup>
                                                {members.map((member) => (
                                                    <CommandItem
                                                        value={`${member.fullName} ${member.phone}`}
                                                        key={member.id}
                                                        onSelect={() => {
                                                            form.setValue('memberId', member.id);
                                                            setIsMemberDropdownOpen(false);
                                                        }}
                                                    >
                                                    <Check className={cn("mr-2 h-4 w-4", member.id === field.value ? "opacity-100" : "opacity-0")} />
                                                        {member.fullName} ({member.phone})
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                    />

                    {selectedMember && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="membershipPlan" render={({ field }) => (
                                <FormItem><FormLabel>Membership Plan</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                       {combinedPlans.map(plan => (
                                           <SelectItem key={plan} value={plan} className="capitalize">{plan}</SelectItem>
                                       ))}
                                    </SelectContent>
                                </Select><FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="appliedOfferId" render={({ field }) => (
                                <FormItem>
                                <FormLabel className="flex items-center gap-2"><Tags className="h-4 w-4"/> Apply Offer (Optional)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value ?? 'none'}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select an offer" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="none">No Offer</SelectItem>
                                        {applicableOffers.map(offer => (
                                            <SelectItem key={offer.id} value={offer.id}>{offer.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                </FormItem>
                            )} />
                        </div>
                    )}
                </div>
                
                <div className="space-y-4 border-b pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="totalFee" render={({ field }) => ( <FormItem><FormLabel>Total Fee (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? 0 : parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="discount" render={({ field }) => ( <FormItem><FormLabel>Discount (₹, Optional)</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value)} disabled={!!form.watch('appliedOfferId') && form.watch('appliedOfferId') !== 'none'} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="amountPaid" render={({ field }) => ( <FormItem><FormLabel>Amount Paid (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? 0 : parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="balanceDue" render={({ field }) => ( <FormItem><FormLabel>Balance Due (₹)</FormLabel><FormControl><Input type="number" {...field} readOnly disabled /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="paymentDate" render={({ field }) => (
                             <FormItem className="flex flex-col"><FormLabel>Payment Date</FormLabel><FormControl>
                                <Input type="date" value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} onChange={e => field.onChange(e.target.value ? new Date(e.target.value) : undefined)} />
                             </FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="nextDueDate" render={({ field }) => (
                             <FormItem className="flex flex-col"><FormLabel>Next Due Date</FormLabel><FormControl>
                                <Input type="date" value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''} onChange={e => field.onChange(e.target.value ? new Date(e.target.value) : undefined)} />
                             </FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="paymentMode" render={({ field }) => (
                            <FormItem><FormLabel>Payment Mode</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="cash">Cash</SelectItem>
                                </SelectContent>
                            </Select><FormMessage />
                            </FormItem>
                        )} />
                    </div>
                </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Link href="/dashboard/owner" passHref>
                        <Button type="button" variant="outline">Cancel</Button>
                    </Link>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Record Payment'}
                    </Button>
                </CardFooter>
            </form>
            </Form>
        </Card>
    </div>
  );
}

    
