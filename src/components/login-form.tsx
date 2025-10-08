
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, Lock, Mail } from 'lucide-react';
import { collection, query, where, getDocs, collectionGroup } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';

const formSchema = z.object({
  email: z.string().min(1, { message: 'Please enter a valid email or login ID.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    
    try {
      // Query for gym owner first
      const gymsCollection = collection(db, 'gyms');
      const ownerQuery = query(gymsCollection, where('email', '==', values.email));
      const ownerSnapshot = await getDocs(ownerQuery);

      if (!ownerSnapshot.empty) {
        const userDoc = ownerSnapshot.docs[0];
        const userData = userDoc.data();

        if (userData.password === values.password) {
            localStorage.setItem('userDocId', userDoc.id);
            localStorage.setItem('userRole', userData.role);
            toast({ title: 'Welcome!', description: "You have been successfully logged in." });
            router.push('/dashboard/owner');
        } else {
            toast({ title: 'Login Failed', description: 'Incorrect password.', variant: 'destructive' });
        }
        setIsLoading(false);
        return;
      }

      // If not an owner, search for members and trainers across all branches
      const allGymsSnapshot = await getDocs(gymsCollection);
      let userFound = false;

      for (const gymDoc of allGymsSnapshot.docs) {
        if(userFound) break;
        const gymId = gymDoc.id;
        const branchesCollection = collection(db, 'gyms', gymId, 'branches');
        const allBranchesSnapshot = await getDocs(branchesCollection);

        for (const branchDoc of allBranchesSnapshot.docs) {
            if(userFound) break;
            const branchId = branchDoc.id;

            // Check for member
            const membersCollection = collection(db, 'gyms', gymId, 'branches', branchId, 'members');
            const memberQuery = query(membersCollection, where('loginId', '==', values.email));
            const memberSnapshot = await getDocs(memberQuery);

            if (!memberSnapshot.empty) {
                const memberDoc = memberSnapshot.docs[0];
                const memberData = memberDoc.data();
                if (memberData.password === values.password) {
                    localStorage.setItem('userDocId', gymId);
                    localStorage.setItem('activeBranch', branchId);
                    localStorage.setItem('memberId', memberDoc.id);
                    localStorage.setItem('userRole', memberData.role);

                    toast({ title: 'Welcome!', description: "You have been successfully logged in." });

                    if (memberData.passwordChanged === false) {
                        router.push('/change-password');
                    } else {
                        router.push('/dashboard/member');
                    }
                    userFound = true;
                    break;
                }
            }

            // Check for trainer
            const trainersCollection = collection(db, 'gyms', gymId, 'branches', branchId, 'trainers');
            const trainerQuery = query(trainersCollection, where('loginId', '==', values.email));
            const trainerSnapshot = await getDocs(trainerQuery);

            if (!trainerSnapshot.empty) {
                const trainerDoc = trainerSnapshot.docs[0];
                const trainerData = trainerDoc.data();

                if (trainerData.password === values.password) {
                    localStorage.setItem('userDocId', gymId);
                    localStorage.setItem('activeBranch', branchId);
                    localStorage.setItem('trainerId', trainerDoc.id);
                    localStorage.setItem('userRole', trainerData.role);

                    toast({ title: 'Welcome!', description: "You have been successfully logged in as a trainer." });

                    if (trainerData.passwordChanged === false) {
                        router.push('/change-password');
                    } else {
                        router.push('/dashboard/trainer');
                    }
                    userFound = true;
                    break;
                }
            }
        }
      }

      if (!userFound) {
        toast({ title: 'Login Failed', description: 'Incorrect username or password.', variant: 'destructive' });
      }

    } catch (error) {
      console.error("Error logging in:", error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email or Login ID</FormLabel>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <FormControl>
                  <Input placeholder="you@example.com or Member/Phone No." {...field} className="pl-10"/>
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
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
        <Button type="submit" className="w-full font-semibold !mt-8" disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin" /> : 'Sign In'}
        </Button>
      </form>
    </Form>
  );
}
