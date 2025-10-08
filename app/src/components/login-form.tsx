
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, Lock, Mail, AlertTriangle } from 'lucide-react';
import { collection, query, where, getDocs, DocumentData, Timestamp, doc, getDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { isSameDay } from 'date-fns';

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

interface LoginFormProps {
    onExpired?: (gymId: string) => void;
}

export default function LoginForm({ onExpired }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingDate, setIsVerifyingDate] = useState(false);
  const [isDateMismatched, setIsDateMismatched] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function verifyDate() {
    setIsVerifyingDate(true);
    try {
        const dateRef = doc(db, 'date', 'current');
        const dateSnap = await getDoc(dateRef);

        if (dateSnap.exists()) {
            const serverDate = (dateSnap.data().date as Timestamp).toDate();
            const localDate = new Date();

            if (!isSameDay(serverDate, localDate)) {
                setIsDateMismatched(true);
                return false;
            }
            setIsDateMismatched(false);
            return true;
        } else {
            toast({
                title: "Configuration Error",
                description: "The server date document could not be found. Please contact support.",
                variant: "destructive"
            });
            return false;
        }
    } catch (error) {
        console.error("Date verification failed:", error);
        toast({ title: "Error", description: "Could not verify server date.", variant: "destructive" });
        return false;
    } finally {
        setIsVerifyingDate(false);
    }
  }


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    
    const isDateCorrect = await verifyDate();
    if (!isDateCorrect) {
        setIsLoading(false);
        return;
    }

    try {
      // 1. Check if it's a superadmin
      const superadminsCollection = collection(db, 'superadmins');
      const superadminQuery = query(superadminsCollection, where('email', '==', values.email));
      const superadminSnapshot = await getDocs(superadminQuery);

      if (!superadminSnapshot.empty) {
        const userDoc = superadminSnapshot.docs[0];
        const userData = userDoc.data();
        if (userData.password === values.password) {
          localStorage.setItem('userDocId', userDoc.id);
          localStorage.setItem('userRole', 'superadmin');
          toast({ title: 'Welcome Superadmin!', description: "Redirecting to your dashboard." });
          router.push('/dashboard/superadmin');
          return;
        }
      }
        
      // 2. Check if it's an owner
      const gymsCollection = collection(db, 'gyms');
      const ownerQuery = query(gymsCollection, where('email', '==', values.email));
      const ownerSnapshot = await getDocs(ownerQuery);

      if (!ownerSnapshot.empty) {
        const userDoc = ownerSnapshot.docs[0];
        const userData = userDoc.data();

        if (userData.password === values.password) {
            const expiry = (userData.expiry_at as Timestamp)?.toDate();
            if (expiry && expiry < new Date() && !userData.isTrial) {
                if (onExpired) onExpired(userDoc.id);
                setIsLoading(false);
                return;
            }

            localStorage.setItem('userDocId', userDoc.id);
            localStorage.setItem('userRole', userData.role);
            toast({ title: 'Welcome!', description: "You have been successfully logged in." });
            router.push('/dashboard/owner');
            return;
        }
      }

      // 3. If not an owner, search for members/trainers across all gyms and branches
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
      
      const foundUser = potentialUsers.find(u => u.userData.password === values.password);

      if (foundUser) {
          const { gymId, branchId, userId, userData } = foundUser;
          const userRole = userData.role;

          localStorage.setItem('userDocId', gymId);
          localStorage.setItem('activeBranch', branchId);
          localStorage.setItem(`${userRole}Id`, userId);
          localStorage.setItem('userRole', userRole);
          localStorage.setItem('userName', userData.fullName);
          localStorage.setItem('userPhone', userData.phone);
          
          toast({ title: 'Welcome!', description: "You have been successfully logged in." });
          
          if (userData.passwordChanged === false) {
              router.push('/change-password');
          } else {
              router.push(`/dashboard/${userRole}`);
          }
          return;
      }

      // 4. If no standard user, check for trial key login.
      if(values.password.toLowerCase() === 'trial') {
          const trialKeysRef = collection(db, 'trialKeys');
          const trialQuery = query(trialKeysRef, where("key", "==", values.email));
          const trialSnapshot = await getDocs(trialQuery);

          if (!trialSnapshot.empty) {
              const trialDoc = trialSnapshot.docs[0];
              const trialData = trialDoc.data();
              const now = new Date();
              const expiresAt = (trialData.expiresAt as Timestamp)?.toDate();

              if (trialData.activatedAt && trialData.gymId) {
                  if (expiresAt && expiresAt >= now) {
                      localStorage.setItem('userDocId', trialData.gymId);
                      localStorage.setItem('userRole', 'owner');
                      toast({ title: 'Welcome Back!', description: "Your trial continues." });
                      router.push('/dashboard/owner');
                      return;
                  } else {
                      if (onExpired) onExpired(trialData.gymId);
                      setIsLoading(false);
                      return;
                  }
              }
          }
      }

      toast({ title: 'Login Failed', description: 'Incorrect username or password.', variant: 'destructive' });

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
    <>
    <Dialog open={isDateMismatched} onOpenChange={setIsDateMismatched}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/> Date & Time Mismatch</DialogTitle>
                <DialogDescription>
                    Your device's date does not match the server's date. Please correct your system's date and time settings to ensure all data is logged accurately.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button onClick={verifyDate} disabled={isVerifyingDate}>
                    {isVerifyingDate ? <Loader2 className="animate-spin mr-2"/> : null}
                    Retry
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email, Login ID, or Trial Key</FormLabel>
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
    </>
  );
}
