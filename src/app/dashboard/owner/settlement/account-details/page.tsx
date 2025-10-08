
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

const accountSchema = z.object({
  accountHolderName: z.string().min(1, 'Account holder name is required.'),
  accountNumber: z.string().min(1, 'Account number is required.'),
  bankName: z.string().min(1, 'Bank name is required.'),
  ifscCode: z.string().min(1, 'IFSC code is required.'),
});

type AccountFormData = z.infer<typeof accountSchema>;

export default function AccountDetailsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const { toast } = useToast();

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      accountHolderName: '',
      accountNumber: '',
      bankName: '',
      ifscCode: '',
    },
  });

  useEffect(() => {
    const userDocId = localStorage.getItem('userDocId');
    if (!userDocId) return;

    const fetchAccountDetails = async () => {
      try {
        const settlementRef = doc(db, 'gyms', userDocId, 'details', 'settlement');
        const docSnap = await getDoc(settlementRef);
        if (docSnap.exists()) {
          form.reset(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching account details:", error);
        toast({ title: 'Error', description: 'Could not fetch account details.', variant: 'destructive' });
      } finally {
        setIsFetching(false);
      }
    };
    fetchAccountDetails();
  }, [toast, form]);

  const onSubmit = async (data: AccountFormData) => {
    setIsLoading(true);
    const userDocId = localStorage.getItem('userDocId');
    if (!userDocId) {
        toast({ title: 'Error', description: 'Session expired.', variant: 'destructive' });
        setIsLoading(false);
        return;
    }
    try {
      const settlementRef = doc(db, 'gyms', userDocId, 'details', 'settlement');
      await setDoc(settlementRef, data, { merge: true });
      toast({ title: 'Success!', description: 'Your account details have been saved.' });
    } catch (error) {
      console.error('Error saving account details:', error);
      toast({ title: 'Error', description: 'Could not save account details.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const currentValues = form.watch();

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

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Update Account Details</CardTitle>
            <CardDescription>Enter the bank account where you'd like to receive your payments.</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="accountHolderName" render={({ field }) => ( <FormItem><FormLabel>Account Holder Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="accountNumber" render={({ field }) => ( <FormItem><FormLabel>Account Number</FormLabel><FormControl><Input placeholder="1234567890" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="bankName" render={({ field }) => ( <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input placeholder="Federal Bank" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="ifscCode" render={({ field }) => ( <FormItem><FormLabel>IFSC Code</FormLabel><FormControl><Input placeholder="FDRL0001234" {...field} /></FormControl><FormMessage /></FormItem> )} />
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Save Account Details'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Current Account</CardTitle>
                <CardDescription>This is the account currently on file for your settlements.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isFetching ? <Loader2 className="animate-spin"/> : (
                <>
                <div className="flex items-center gap-3"><User className="text-muted-foreground"/><p><strong>Name:</strong> {currentValues.accountHolderName || 'Not set'}</p></div>
                <div className="flex items-center gap-3"><Banknote className="text-muted-foreground"/><p><strong>Account No:</strong> {currentValues.accountNumber || 'Not set'}</p></div>
                <div className="flex items-center gap-3"><Landmark className="text-muted-foreground"/><p><strong>Bank:</strong> {currentValues.bankName || 'Not set'}</p></div>
                <div className="flex items-center gap-3"><Hash className="text-muted-foreground"/><p><strong>IFSC:</strong> {currentValues.ifscCode || 'Not set'}</p></div>
                </>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
