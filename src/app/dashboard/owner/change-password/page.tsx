
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, Lock, ArrowLeft } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

const formSchema = z.object({
  oldPassword: z.string().min(1, { message: 'Old password is required.' }),
  newPassword: z.string().min(6, { message: 'New password must be at least 6 characters.' }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function OwnerChangePasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [userDocId, setUserDocId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const gymId = localStorage.getItem('userDocId');
    if (!gymId) {
      toast({ title: "Error", description: "No valid user session found.", variant: "destructive" });
      router.push('/');
      return;
    }
    setUserDocId(gymId);
  }, [router, toast]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!userDocId) return;
    setIsLoading(true);
    
    try {
      const userRef = doc(db, 'gyms', userDocId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
          toast({ title: "Error", description: "User not found.", variant: "destructive" });
          setIsLoading(false);
          return;
      }
      
      const userData = userSnap.data();
      if (userData.password !== values.oldPassword) {
          toast({ title: "Error", description: "Old password does not match.", variant: "destructive" });
          setIsLoading(false);
          return;
      }

      await updateDoc(userRef, {
        password: values.newPassword,
      });

      toast({
        title: 'Success!',
        description: 'Your password has been changed.',
      });

      router.push('/dashboard/owner');

    } catch (error) {
      console.error("Error updating password:", error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Change Owner Password</CardTitle>
                <CardDescription>Enter your old password and a new one to secure your account.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                    control={form.control}
                    name="oldPassword"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Old Password</FormLabel>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} className="pl-10"/>
                            </FormControl>
                        </div>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} className="pl-10"/>
                            </FormControl>
                        </div>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} className="pl-10"/>
                            </FormControl>
                        </div>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <div className="flex justify-between items-center !mt-8">
                         <Link href="/dashboard/owner" passHref>
                            <Button variant="outline" type="button">
                                <ArrowLeft className="mr-2 h-4 w-4"/>
                                Back
                            </Button>
                        </Link>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin" /> : 'Set New Password'}
                        </Button>
                    </div>
                </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  );
}

    