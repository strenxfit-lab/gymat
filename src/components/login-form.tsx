"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, Lock, Mail } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
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
      const gymsCollection = collection(db, 'gyms');
      const q = query(gymsCollection, where('email', '==', values.email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({
          title: 'Login Failed',
          description: 'No user found with that email.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      if (userData.password !== values.password) {
        toast({
          title: 'Login Failed',
          description: 'Incorrect password.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
      
      localStorage.setItem('userDocId', userDoc.id);

      toast({
        title: 'Welcome!',
        description: "You have been successfully logged in.",
      });

      if (userData.role === 'owner' && !userData.onboardingComplete) {
        router.push('/onboarding');
      } else if (userData.passwordChanged === false) {
        router.push('/change-password');
      } else if (userData.role === 'owner') {
        router.push('/dashboard/owner');
      } else {
        router.push('/dashboard/member');
      }

    } catch (error) {
      console.error("Error logging in:", error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
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
              <FormLabel>Email Address</FormLabel>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <FormControl>
                  <Input type="email" placeholder="you@example.com" {...field} className="pl-10"/>
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
