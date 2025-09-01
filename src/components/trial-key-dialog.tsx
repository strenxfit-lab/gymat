"use client";

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { KeyRound, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  trialKey: z.string().min(8, { message: 'Trial key must be at least 8 characters long.' }),
});

export default function TrialKeyDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      trialKey: '',
    },
  });
  
  // To avoid hydration mismatch, we ensure localStorage is only accessed on the client.
  useEffect(() => {
    // This effect can be used to check for existing keys or other client-side logic.
  }, []);

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    console.log('Activating trial key:', values.trialKey);

    // Simulate API call and update local storage
    setTimeout(() => {
      try {
        localStorage.setItem('trialKey', values.trialKey);
        localStorage.setItem('userPrivileges', 'trial');
        toast({
          title: 'Trial Activated!',
          description: 'Your trial key has been successfully activated.',
          variant: 'default',
        });
      } catch (error) {
        toast({
            title: 'Activation Failed',
            description: 'Could not save trial key. Please enable storage access.',
            variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
        setOpen(false);
        form.reset();
      }
    }, 1500);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">Have a trial key?</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Activate Trial Key</DialogTitle>
          <DialogDescription>
            Enter the trial key you received to activate your trial period.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
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
            <DialogFooter>
              <Button type="submit" disabled={isLoading} className="w-full" style={{backgroundColor: 'hsl(var(--primary))'}}>
                {isLoading ? <Loader2 className="animate-spin" /> : 'Activate Key'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
