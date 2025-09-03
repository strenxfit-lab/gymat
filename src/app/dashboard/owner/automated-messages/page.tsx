
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, setDoc, collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, ArrowLeft, MessageSquare, IndianRupee, Cake, Repeat, Send, Search, User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  paymentReminder: z.string().optional(),
  renewalAlert: z.string().optional(),
  birthdayWish: z.string().optional(),
  motivationalQuote: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

type MessageType = "paymentReminder" | "renewalAlert" | "birthdayWish" | "motivationalQuote";

interface MemberForMessage {
    id: string;
    fullName: string;
    phone: string;
    endDate?: Date;
    dob?: Date;
    gymName?: string;
    amount?: number;
}

const messageTemplates = [
    { 
        value: "paymentReminder" as MessageType, 
        label: "Payment Reminders", 
        icon: <IndianRupee className="h-5 w-5" />,
        description: "Sent when a member's fee is due soon.",
        placeholder: "Hi {memberName}, your membership is expiring on {dueDate}. Please pay to continue. Thank you, {gymName}!"
    },
    { 
        value: "renewalAlert" as MessageType, 
        label: "Renewal Alerts", 
        icon: <Repeat className="h-5 w-5" />,
        description: "Sent when a member's plan has expired.",
        placeholder: "Hi {memberName}, your membership expired on {expiryDate}. Renew now to enjoy uninterrupted workouts! - Team {gymName}"
    },
    { 
        value: "birthdayWish" as MessageType, 
        label: "Birthday Wishes", 
        icon: <Cake className="h-5 w-5" />,
        description: "A special message on a member's birthday.",
        placeholder: "Happy Birthday {memberName}! We wish you a day full of joy and a year full of fitness. - Team {gymName}"
    },
    { 
        value: "motivationalQuote" as MessageType, 
        label: "Motivational Quotes", 
        icon: <MessageSquare className="h-5 w-5" />,
        description: "Periodic quotes to keep members motivated.",
        placeholder: "Hey {memberName}, remember why you started! 'The only bad workout is the one that didn't happen.' Keep pushing!"
    },
];

export default function AutomatedMessagesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isFetchingMembers, setIsFetchingMembers] = useState(false);
  const [userDocId, setUserDocId] = useState<string | null>(null);
  const [gymName, setGymName] = useState<string>('');
  const [messageLists, setMessageLists] = useState<Record<MessageType, MemberForMessage[]>>({
    paymentReminder: [],
    renewalAlert: [],
    birthdayWish: [],
    motivationalQuote: [],
  });
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

    const fetchInitialData = async () => {
        try {
            const detailsRef = doc(db, 'gyms', docId, 'details', 'automated_messages');
            const detailsSnap = await getDoc(detailsRef);
            if (detailsSnap.exists()) {
                const data = detailsSnap.data() as FormData;
                form.reset(data);
            }

            const gymRef = doc(db, 'gyms', docId);
            const gymSnap = await getDoc(gymRef);
            if (gymSnap.exists()) {
                setGymName(gymSnap.data().name || 'Your Gym');
            }

        } catch(error) {
            console.error("Error fetching data:", error);
            toast({ title: "Error", description: "Could not fetch initial data.", variant: "destructive" });
        } finally {
            setIsFetching(false);
        }
    };
    fetchInitialData();
  }, [router, toast, form]);

  const onSaveTemplate = async (data: FormData) => {
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
      toast({ title: 'Error', description: 'Could not save templates. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMembersForList = async (type: MessageType) => {
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId) {
        toast({ title: "Error", description: "Branch not selected.", variant: "destructive" });
        return;
    }
    setIsFetchingMembers(true);
    
    try {
        const membersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'members');
        const membersSnap = await getDocs(membersCollection);
        const allMembers = membersSnap.docs.map(d => ({id: d.id, ...d.data()}));
        
        let filteredMembers: MemberForMessage[] = [];
        const now = new Date();
        const todayMonth = now.getMonth();
        const todayDate = now.getDate();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        switch (type) {
            case 'paymentReminder': // Expiring in next 7 days
                filteredMembers = allMembers.filter(m => {
                    const endDate = (m.endDate as Timestamp)?.toDate();
                    return endDate && endDate > now && endDate <= sevenDaysFromNow;
                }).map(m => ({ id: m.id, fullName: m.fullName, phone: m.phone, endDate: (m.endDate as Timestamp).toDate(), amount: m.totalFee || 0, gymName }));
                break;
            case 'renewalAlert': // Already expired or expires today
                 filteredMembers = allMembers.filter(m => {
                    const endDate = (m.endDate as Timestamp)?.toDate();
                    return endDate && endDate <= now;
                }).map(m => ({ id: m.id, fullName: m.fullName, phone: m.phone, endDate: (m.endDate as Timestamp).toDate(), gymName }));
                break;
            case 'birthdayWish':
                filteredMembers = allMembers.filter(m => {
                    const dob = (m.dob as Timestamp)?.toDate();
                    return dob && dob.getMonth() === todayMonth && dob.getDate() === todayDate;
                }).map(m => ({ id: m.id, fullName: m.fullName, phone: m.phone, dob: (m.dob as Timestamp).toDate(), gymName }));
                break;
            case 'motivationalQuote': // Fetches all active members
                filteredMembers = allMembers.map(m => ({ id: m.id, fullName: m.fullName, phone: m.phone, gymName }));
                break;
        }

        setMessageLists(prev => ({ ...prev, [type]: filteredMembers }));
    } catch (error) {
        console.error("Error fetching members:", error);
        toast({ title: "Error", description: "Failed to fetch member list.", variant: "destructive" });
    } finally {
        setIsFetchingMembers(false);
    }
  }
  
  const generateMessage = (template: string = '', member: MemberForMessage) => {
    let message = template;
    message = message.replace(/{memberName}/g, member.fullName);
    message = message.replace(/{gymName}/g, member.gymName || '');
    if (member.endDate) {
        message = message.replace(/{dueDate}|{expiryDate}/g, member.endDate.toLocaleDateString());
    }
    if (member.amount) {
        message = message.replace(/{amount}/g, member.amount.toString());
    }
    return encodeURIComponent(message);
  }

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
      <Card className="w-full max-w-4xl mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSaveTemplate)}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <MessageSquare className="h-8 w-8 text-primary" />
                    <div>
                    <CardTitle>Automated Message Templates</CardTitle>
                    <CardDescription>Set up predefined messages and send them to members via WhatsApp.</CardDescription>
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
                                    <div className="mt-2 text-xs text-muted-foreground">
                                        <p>You can use placeholders like {"{memberName}"}, {"{gymName}"}, {"{amount}"}, etc. which will be replaced automatically.</p>
                                    </div>
                                    <Separator className="my-4" />
                                    
                                    <div className="space-y-4">
                                        <Button type="button" disabled={isFetchingMembers} onClick={() => fetchMembersForList(template.value)}>
                                            {isFetchingMembers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                            Fetch Members for this list
                                        </Button>
                                        
                                        {messageLists[template.value].length > 0 && (
                                            <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                                                <h4 className="font-semibold mb-2">Members to Message ({messageLists[template.value].length})</h4>
                                                <ul className="space-y-3">
                                                    {messageLists[template.value].map(member => (
                                                        <li key={member.id} className="flex items-center justify-between text-sm">
                                                          <div className="flex items-center gap-3">
                                                            <User className="h-4 w-4 text-muted-foreground" />
                                                            <div>
                                                              <p className="font-medium">{member.fullName}</p>
                                                              <p className="text-xs text-muted-foreground">{member.phone}</p>
                                                            </div>
                                                          </div>
                                                          <a 
                                                            href={`https://wa.me/91${member.phone}?text=${generateMessage(form.getValues(template.value), member)}`}
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                          >
                                                            <Button size="sm" variant="outline"><Send className="mr-2 h-3 w-3"/>Send</Button>
                                                          </a>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {messageLists[template.value].length === 0 && !isFetchingMembers && (
                                            <p className="text-sm text-muted-foreground pt-2">No members found for this criteria.</p>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter className="justify-end gap-2">
                                    <Button type="submit" variant="outline" disabled={isLoading}>
                                        {isLoading ? <Loader2 className="animate-spin" /> : 'Save Template'}
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

    