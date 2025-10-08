
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, Lock } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const formSchema = z.object({
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function ChangePasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [userRefPath, setUserRefPath] = useState<{ gymId: string, branchId: string, userId: string, role: string } | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const gymId = localStorage.getItem('userDocId');
    const branchId = localStorage.getItem('activeBranch');
    const role = localStorage.getItem('userRole');
    const memberId = localStorage.getItem('memberId');
    const trainerId = localStorage.getItem('trainerId');

    const userId = role === 'member' ? memberId : trainerId;
    const userRoleCollection = role === 'member' ? 'members' : 'trainers';

    if (!gymId || !userId || !role || (role !== 'member' && role !== 'trainer')) {
      toast({ title: "Error", description: "No valid user session found.", variant: "destructive" });
      router.push('/');
      return;
    }
    
    // For members, branch is required. For trainers it is too.
    if (!branchId) {
       toast({ title: "Error", description: "No active branch found in session.", variant: "destructive" });
       router.push('/');
       return;
    }

    setUserRefPath({ gymId, branchId, userId, role: userRoleCollection });

    const checkPasswordStatus = async () => {
        const userRef = doc(db, 'gyms', gymId, 'branches', branchId, userRoleCollection, userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().passwordChanged) {
            toast({ title: "Redirecting", description: "Password already changed." });
            const redirectPath = role === 'member' ? '/dashboard/member' : '/dashboard/trainer';
            router.push(redirectPath);
        }
    };
    checkPasswordStatus();
  }, [router, toast]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!userRefPath) return;
    setIsLoading(true);
    
    try {
      const { gymId, branchId, userId, role } = userRefPath;
      const userRef = doc(db, 'gyms', gymId, 'branches', branchId, role, userId);
      await updateDoc(userRef, {
        password: values.password,
        passwordChanged: true,
      });

      toast({
        title: 'Success!',
        description: 'Your password has been changed.',
      });

      const redirectPath = role === 'members' ? '/dashboard/member' : '/dashboard/trainer';
      router.push(redirectPath);

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
                <CardTitle>Change Your Password</CardTitle>
                <CardDescription>Please enter a new password for your account.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                    control={form.control}
                    name="password"
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
                    <Button type="submit" className="w-full !mt-8" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : 'Set New Password'}
                    </Button>
                </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  );
}
