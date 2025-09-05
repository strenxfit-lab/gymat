
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { KeyRound, Loader2, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  trialKey: z.string().min(8, { message: 'Trial key must be at least 8 characters long.' }),
});

export default function ActivateTrialPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      trialKey: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    console.log('Activating trial key:', values.trialKey);

    // Simulate API call and update local storage
    setTimeout(() => {
      try {
        // In a real app, you would validate the key against a backend service
        // and fetch the associated userDocId and role.
        localStorage.setItem('userDocId', 'trial-user-id'); // Placeholder ID
        localStorage.setItem('userRole', 'owner');
        
        toast({
          title: 'Trial Activated!',
          description: 'Welcome! Your trial has been successfully activated.',
        });
        router.push('/dashboard/owner');
      } catch (error) {
        toast({
            title: 'Activation Failed',
            description: 'Could not save trial key. Please enable storage access.',
            variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
        form.reset();
      }
    }, 1500);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Activate Trial Key</CardTitle>
                <CardDescription>
                    Enter the trial key you received to activate your trial period.
                </CardDescription>
            </CardHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4 pt-4">
                    <FormField
                    control={form.control}
                    name="trialKey"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Trial Key</FormLabel>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <FormControl>
                            <Input placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" {...field} className="pl-10" />
                            </FormControl>
                        </div>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </CardContent>
                <CardFooter className="flex-col gap-4">
                    <Button type="submit" disabled={isLoading} className="w-full">
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Activate Key & Go to Dashboard'}
                    </Button>
                    <Link href="/" passHref>
                        <Button variant="link" className="text-muted-foreground">
                            <ArrowLeft className="mr-2 h-4 w-4"/>
                            Back to Login
                        </Button>
                    </Link>
                </CardFooter>
            </form>
            </Form>
      </Card>
    </div>
  );
}
