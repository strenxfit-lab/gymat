
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, Lock, Mail } from 'lucide-react';
import { collection, query, where, getDocs, DocumentData } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';

const formSchema = z.object({
  email: z.string().min(1, { message: 'Please enter a valid email or login ID.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

interface FoundUser {
    gymId: string;
    branchId: string;
    userId: string;
    userData: DocumentData;
}

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
      // 1. Check if it's an owner
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

      // 2. If not an owner, search for members/trainers across all gyms and branches
      const allGymsSnapshot = await getDocs(collection(db, 'gyms'));
      const potentialUsers: FoundUser[] = [];

      for (const gymDoc of allGymsSnapshot.docs) {
          const gymId = gymDoc.id;
          const branchesCollection = collection(db, 'gyms', gymId, 'branches');
          const allBranchesSnapshot = await getDocs(branchesCollection);

          for (const branchDoc of allBranchesSnapshot.docs) {
              const branchId = branchDoc.id;
              const userTypes = ['members', 'trainers'];

              for (const userType of userTypes) {
                  const usersCollection = collection(db, 'gyms', gymId, 'branches', branchId, userType);
                  const userQuery = query(usersCollection, where('loginId', '==', values.email));
                  const userSnapshot = await getDocs(userQuery);

                  if (!userSnapshot.empty) {
                      userSnapshot.forEach(userDoc => {
                          potentialUsers.push({
                              gymId: gymId,
                              branchId: branchId,
                              userId: userDoc.id,
                              userData: userDoc.data(),
                          });
                      });
                  }
              }
          }
      }
      
      // 3. Now, check the password for any found user
      const foundUser = potentialUsers.find(u => u.userData.password === values.password);

      if (foundUser) {
          const { gymId, branchId, userId, userData } = foundUser;
          const userRole = userData.role;
          const userType = userRole === 'member' ? 'members' : 'trainers';

          localStorage.setItem('userDocId', gymId);
          localStorage.setItem('activeBranch', branchId);
          localStorage.setItem(`${userRole}Id`, userId);
          localStorage.setItem('userRole', userRole);
          
          toast({ title: 'Welcome!', description: "You have been successfully logged in." });
          
          if (userData.passwordChanged === false) {
              router.push('/change-password');
          } else {
              router.push(`/dashboard/${userRole}`);
          }
      } else {
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
