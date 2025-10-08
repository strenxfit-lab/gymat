
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Loader2, Calendar as CalendarIcon, Search, Check } from 'lucide-react';
import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore';
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

const formSchema = z.object({
  memberId: z.string().nonempty({ message: "Please select a member." }),
  membershipPlan: z.string().optional(),
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
}

const planFees: Record<string, number> = {
    'trial': 0,
    'monthly': 1500,
    'quarterly': 4000,
    'half-yearly': 7500,
    'yearly': 12000,
};

export default function AddPaymentPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      memberId: '',
      membershipPlan: '',
      totalFee: 0,
      discount: '',
      amountPaid: 0,
      balanceDue: 0,
      paymentDate: new Date(),
      paymentMode: '',
      transactionId: '',
      nextDueDate: undefined
    },
  });

  const fetchMembers = async () => {
    const userDocId = localStorage.getItem('userDocId');
    if (!userDocId) return;
    
    const membersCollection = collection(db, 'gyms', userDocId, 'members');
    const membersSnapshot = await getDocs(membersCollection);
    const membersList = membersSnapshot.docs.map(doc => ({
      id: doc.id,
      fullName: doc.data().fullName,
      phone: doc.data().phone,
      membershipType: doc.data().membershipType,
    }));
    setMembers(membersList);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    const subscription = form.watch((values, { name }) => {
        const { totalFee, discount, amountPaid } = values;
        const numericDiscount = typeof discount === 'string' ? parseFloat(discount) : discount;

        if (name === 'memberId' && values.memberId) {
            const member = members.find(m => m.id === values.memberId);
            if (member) {
                setSelectedMember(member);
                const fee = planFees[member.membershipType] || 0;
                form.setValue('membershipPlan', member.membershipType);
                form.setValue('totalFee', fee);
                form.setValue('amountPaid', fee);
            }
        }
        
        if (name === 'totalFee' || name === 'discount' || name === 'amountPaid') {
            const finalPayable = (totalFee || 0) - (numericDiscount || 0);
            const balance = finalPayable - (amountPaid || 0);
            form.setValue('balanceDue', balance > 0 ? balance : 0);
        }
    });
    return () => subscription.unsubscribe();
  }, [form, members]);


  const onSubmit = async (data: FormData) => {
    const userDocId = localStorage.getItem('userDocId');
    if (!userDocId) {
      toast({ title: 'Error', description: 'Gym owner session not found.', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);

    try {
      const paymentsCollection = collection(db, 'gyms', userDocId, 'members', data.memberId, 'payments');
      await addDoc(paymentsCollection, {
        ...data,
        discount: data.discount ? parseFloat(data.discount as string) : 0,
        paymentDate: Timestamp.fromDate(data.paymentDate),
        nextDueDate: data.nextDueDate ? Timestamp.fromDate(data.nextDueDate) : null,
        createdAt: Timestamp.now(),
      });

      toast({
        title: 'Payment Added!',
        description: `Payment for ${selectedMember?.fullName} has been recorded.`,
      });
      router.push('/dashboard/owner');
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
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
                            <Popover>
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
                                                        onSelect={() => form.setValue('memberId', member.id)}
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
                        <FormField control={form.control} name="membershipPlan" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Membership Plan</FormLabel>
                                <FormControl><Input {...field} readOnly disabled placeholder="Membership Plan" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    )}
                </div>
                
                <div className="space-y-4 border-b pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="totalFee" render={({ field }) => ( <FormItem><FormLabel>Total Fee (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? 0 : parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="discount" render={({ field }) => ( <FormItem><FormLabel>Discount (₹, Optional)</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="amountPaid" render={({ field }) => ( <FormItem><FormLabel>Amount Paid (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? 0 : parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="balanceDue" render={({ field }) => ( <FormItem><FormLabel>Balance Due (₹)</FormLabel><FormControl><Input type="number" {...field} readOnly disabled /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="paymentDate" render={({ field }) => (
                             <FormItem className="flex flex-col">
                                <FormLabel>Payment Date</FormLabel>
                                <FormControl>
                                <Input
                                    type="date"
                                    value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                    onChange={(e) => field.onChange(new Date(e.target.value))}
                                />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="paymentMode" render={({ field }) => (
                            <FormItem><FormLabel>Payment Mode</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="upi">UPI</SelectItem>
                                    <SelectItem value="card">Card</SelectItem>
                                    <SelectItem value="netbanking">NetBanking</SelectItem>
                                    <SelectItem value="wallet">Wallet</SelectItem>
                                    <SelectItem value="cheque">Cheque</SelectItem>
                                </SelectContent>
                            </Select><FormMessage />
                            </FormItem>
                        )} />
                    </div>
                    <FormField control={form.control} name="transactionId" render={({ field }) => ( <FormItem><FormLabel>Transaction ID (Optional)</FormLabel><FormControl><Input placeholder="UPI Ref / Card Txn ID" {...field} /></FormControl><FormMessage /></FormItem> )} />
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
