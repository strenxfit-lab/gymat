
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, ArrowLeft, MessageSquare, IndianRupee, Cake, Repeat, Send } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

const formSchema = z.object({
  paymentReminder: z.string().optional(),
  renewalAlert: z.string().optional(),
  birthdayWish: z.string().optional(),
  motivationalQuote: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const messageTemplates = [
    { 
        value: "paymentReminder", 
        label: "Payment Reminders", 
        icon: <IndianRupee className="h-5 w-5" />,
        description: "Sent when a member's fee is due.",
        placeholder: "Hi {memberName}, your payment of ₹{amount} is due on {dueDate}. Please pay to continue your membership. Thank you!"
    },
    { 
        value: "renewalAlert", 
        label: "Renewal Alerts", 
        icon: <Repeat className="h-5 w-5" />,
        description: "Sent when a member's plan is about to expire.",
        placeholder: "Hi {memberName}, your {planName} plan is expiring on {expiryDate}. Renew now to enjoy uninterrupted workouts!"
    },
    { 
        value: "birthdayWish", 
        label: "Birthday Wishes", 
        icon: <Cake className="h-5 w-5" />,
        description: "A special message on a member's birthday.",
        placeholder: "Happy Birthday {memberName}! We wish you a day full of joy and a year full of fitness. - Team {gymName}"
    },
    { 
        value: "motivationalQuote", 
        label: "Motivational Quotes", 
        icon: <MessageSquare className="h-5 w-5" />,
        description: "Periodic quotes to keep members motivated.",
        placeholder: "Hey {memberName}, remember why you started! 'The only bad workout is the one that didn't happen.' Keep pushing!"
    },
];

export default function AutomatedMessagesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [userDocId, setUserDocId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paymentReminder: '',
      renewalAlert: '',
      birthdayWish: '',
      motivationalQuote: '',
    },
  });

  useEffect(() => {
    const docId = localStorage.getItem('userDocId');
    if (!docId) {
      toast({ title: "Error", description: "No user session found.", variant: "destructive" });
      router.push('/');
      return;
    }
    setUserDocId(docId);

    const fetchMessageTemplates = async () => {
        try {
            const detailsRef = doc(db, 'gyms', docId, 'details', 'automated_messages');
            const detailsSnap = await getDoc(detailsRef);

            if (detailsSnap.exists()) {
                const data = detailsSnap.data() as FormData;
                form.reset(data);
            }
        } catch(error) {
            console.error("Error fetching message templates:", error);
            toast({ title: "Error", description: "Could not fetch message templates.", variant: "destructive" });
        } finally {
            setIsFetching(false);
        }
    };
    fetchMessageTemplates();
  }, [router, toast, form]);

  const onSubmit = async (data: FormData) => {
    if (!userDocId) return;
    setIsLoading(true);

    try {
      const detailsRef = doc(db, 'gyms', userDocId, 'details', 'automated_messages');
      await setDoc(detailsRef, data, { merge: true });

      toast({
        title: 'Success!',
        description: 'Message templates have been saved.',
      });
    } catch (error) {
      console.error("Error updating templates:", error);
      toast({
        title: 'Error',
        description: 'Could not save templates. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-muted-foreground">Loading Templates...</p>
        </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-3xl mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <MessageSquare className="h-8 w-8 text-primary" />
                    <div>
                    <CardTitle>Automated Message Templates</CardTitle>
                    <CardDescription>Set up predefined messages for different events.</CardDescription>
                    </div>
                </div>
                 <Link href="/dashboard/owner">
                    <Button variant="outline" type="button">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="paymentReminder" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
                        {messageTemplates.map(template => (
                           <TabsTrigger key={template.value} value={template.value} className="flex flex-col md:flex-row gap-2 h-auto py-2">
                               {template.icon}
                               {template.label}
                           </TabsTrigger>
                        ))}
                    </TabsList>

                    {messageTemplates.map(template => (
                        <TabsContent key={template.value} value={template.value}>
                            <Card className="mt-4">
                                <CardHeader>
                                    <CardTitle>{template.label}</CardTitle>
                                    <CardDescription>{template.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                     <FormField
                                        control={form.control}
                                        name={template.value as keyof FormData}
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Message Template</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder={template.placeholder}
                                                    className="min-h-[120px]"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="mt-4 text-xs text-muted-foreground">
                                        <p>You can use placeholders like {"{memberName}"}, {"{gymName}"}, {"{amount}"}, etc. which will be replaced automatically.</p>
                                    </div>
                                </CardContent>
                                <CardFooter className="justify-end gap-2">
                                    <Button type="submit" variant="outline" disabled={isLoading}>
                                        {isLoading ? <Loader2 className="animate-spin" /> : 'Save Template'}
                                    </Button>
                                    <Button type="button" disabled={isLoading}>
                                        <Send className="mr-2 h-4 w-4" />
                                        Send
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>
          </form>
        </Form>
      </Card>
    </div>
  );
}
