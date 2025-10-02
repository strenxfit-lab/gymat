
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft, Banknote, Landmark, Hash, User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const bankAccountSchema = z.object({
  accountHolderName: z.string().min(1, 'Account holder name is required.'),
  accountNumber: z.string().min(1, 'Account number is required.'),
  confirmAccountNumber: z.string().min(1, 'Please confirm account number.'),
  bankName: z.string().min(1, 'Bank name is required.'),
  ifscCode: z.string().min(1, 'IFSC code is required.'),
}).refine(data => data.accountNumber === data.confirmAccountNumber, {
    message: "Account numbers don't match.",
    path: ["confirmAccountNumber"],
});

const upiSchema = z.object({
    upiId: z.string().min(1, 'UPI ID is required.'),
    upiName: z.string().min(1, 'Name is required.'),
});

type BankAccountFormData = z.infer<typeof bankAccountSchema>;
type UpiFormData = z.infer<typeof upiSchema>;

export default function AccountDetailsPage() {
  const [bankLoading, setBankLoading] = useState(false);
  const [upiLoading, setUpiLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const { toast } = useToast();

  const bankForm = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      accountHolderName: '',
      accountNumber: '',
      confirmAccountNumber: '',
      bankName: '',
      ifscCode: '',
    },
  });

  const upiForm = useForm<UpiFormData>({
      resolver: zodResolver(upiSchema),
      defaultValues: { upiId: '', upiName: '' },
  });

  useEffect(() => {
    const userDocId = localStorage.getItem('userDocId');
    if (!userDocId) {
        setIsFetching(false);
        return;
    };

    const fetchAccountDetails = async () => {
      try {
        const bankRef = doc(db, 'gyms', userDocId, 'account_details', 'bankAccount');
        const bankDocSnap = await getDoc(bankRef);
        if (bankDocSnap.exists()) {
            const data = bankDocSnap.data();
            bankForm.reset({ ...data, confirmAccountNumber: data.accountNumber });
        }

        const upiRef = doc(db, 'gyms', userDocId, 'account_details', 'upi');
        const upiDocSnap = await getDoc(upiRef);
        if (upiDocSnap.exists()) {
            upiForm.reset(upiDocSnap.data());
        }
      } catch (error) {
        console.error("Error fetching account details:", error);
        toast({ title: 'Error', description: 'Could not fetch account details.', variant: 'destructive' });
      } finally {
        setIsFetching(false);
      }
    };
    fetchAccountDetails();
  }, [toast, bankForm, upiForm]);

  const onBankSubmit = async (data: BankAccountFormData) => {
    setBankLoading(true);
    const userDocId = localStorage.getItem('userDocId');
    if (!userDocId) {
        toast({ title: 'Error', description: 'Session expired.', variant: 'destructive' });
        setBankLoading(false);
        return;
    }
    try {
      const { confirmAccountNumber, ...bankData } = data;
      const bankRef = doc(db, 'gyms', userDocId, 'account_details', 'bankAccount');
      await setDoc(bankRef, bankData, { merge: true });
      toast({ title: 'Success!', description: 'Your bank account details have been saved.' });
    } catch (error) {
      console.error('Error saving bank details:', error);
      toast({ title: 'Error', description: 'Could not save bank account details.', variant: 'destructive' });
    } finally {
      setBankLoading(false);
    }
  };
  
  const onUpiSubmit = async (data: UpiFormData) => {
    setUpiLoading(true);
    const userDocId = localStorage.getItem('userDocId');
    if (!userDocId) {
        toast({ title: 'Error', description: 'Session expired.', variant: 'destructive' });
        setUpiLoading(false);
        return;
    }
    try {
      const upiRef = doc(db, 'gyms', userDocId, 'account_details', 'upi');
      await setDoc(upiRef, data, { merge: true });
      toast({ title: 'Success!', description: 'Your UPI details have been saved.' });
    } catch (error) {
      console.error('Error saving UPI details:', error);
      toast({ title: 'Error', description: 'Could not save UPI details.', variant: 'destructive' });
    } finally {
      setUpiLoading(false);
    }
  }
  
  if (isFetching) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Settlement Account Details</h1>
          <p className="text-muted-foreground">Manage the bank account for receiving settlements.</p>
        </div>
        <Link href="/dashboard/owner" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Button>
        </Link>
      </div>
        <Card>
            <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Add or update your bank account or UPI details for settlements.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="bank">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="bank">Bank Account</TabsTrigger>
                        <TabsTrigger value="upi">UPI Details</TabsTrigger>
                    </TabsList>
                    <TabsContent value="bank">
                         <Form {...bankForm}>
                            <form onSubmit={bankForm.handleSubmit(onBankSubmit)}>
                            <CardContent className="space-y-4 pt-6">
                                <FormField control={bankForm.control} name="accountHolderName" render={({ field }) => ( <FormItem><FormLabel>Account Holder Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={bankForm.control} name="accountNumber" render={({ field }) => ( <FormItem><FormLabel>Account Number</FormLabel><FormControl><Input placeholder="1234567890" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={bankForm.control} name="confirmAccountNumber" render={({ field }) => ( <FormItem><FormLabel>Re-enter Account Number</FormLabel><FormControl><Input placeholder="1234567890" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={bankForm.control} name="bankName" render={({ field }) => ( <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input placeholder="Federal Bank" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={bankForm.control} name="ifscCode" render={({ field }) => ( <FormItem><FormLabel>IFSC Code</FormLabel><FormControl><Input placeholder="FDRL0001234" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" disabled={bankLoading}>
                                {bankLoading ? <Loader2 className="animate-spin" /> : 'Save Bank Details'}
                                </Button>
                            </CardFooter>
                            </form>
                        </Form>
                    </TabsContent>
                    <TabsContent value="upi">
                         <Form {...upiForm}>
                            <form onSubmit={upiForm.handleSubmit(onUpiSubmit)}>
                            <CardContent className="space-y-4 pt-6">
                                <FormField control={upiForm.control} name="upiId" render={({ field }) => ( <FormItem><FormLabel>UPI ID</FormLabel><FormControl><Input placeholder="johndoe@upi" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={upiForm.control} name="upiName" render={({ field }) => ( <FormItem><FormLabel>Registered Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" disabled={upiLoading}>
                                {upiLoading ? <Loader2 className="animate-spin" /> : 'Save UPI Details'}
                                </Button>
                            </CardFooter>
                            </form>
                        </Form>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    </div>
  );
}
