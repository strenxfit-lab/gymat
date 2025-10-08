
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, setDoc, collection, getDocs, Timestamp, addDoc, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, ArrowLeft, MessageSquare, IndianRupee, Cake, Repeat, Send, Search, User, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import Image from 'next/image';


const formSchema = z.object({
  paymentReminder: z.string().optional(),
  renewalAlert: z.string().optional(),
  birthdayWish: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

type MessageType = "paymentReminder" | "renewalAlert" | "birthdayWish";

interface MemberForMessage {
    id: string;
    fullName: string;
    phone: string;
    endDate?: Date;
    dob?: Date;
    gymName?: string;
    amount?: number;
}

interface MessageHistory {
    id: string;
    memberName: string;
    message: string;
    type: string;
    sentAt: string;
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
];

const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
);


export default function RemindersPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isFetchingMembers, setIsFetchingMembers] = useState(false);
  const [userDocId, setUserDocId] = useState<string | null>(null);
  const [gymName, setGymName] = useState<string>('');
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [messageLists, setMessageLists] = useState<Record<MessageType, MemberForMessage[]>>({
    paymentReminder: [],
    renewalAlert: [],
    birthdayWish: [],
  });
  const [history, setHistory] = useState<MessageHistory[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paymentReminder: '',
      renewalAlert: '',
      birthdayWish: '',
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
    setActiveBranchId(localStorage.getItem('activeBranch'));

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
    return message;
  }

  const handleMessageSent = async (type: MessageType, member: MemberForMessage) => {
    if (!userDocId || !activeBranchId) return;

    const messageContent = generateMessage(form.getValues(type), member);
    
    try {
        const historyCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'messageHistory');
        await addDoc(historyCollection, {
            memberName: member.fullName,
            memberPhone: member.phone,
            message: messageContent,
            type: type,
            sentAt: serverTimestamp(),
        });

        setMessageLists(prev => ({
            ...prev,
            [type]: prev[type].filter(m => m.id !== member.id)
        }));

        toast({ title: 'Logged!', description: `Message to ${member.fullName} logged in history.` });

    } catch(error) {
        console.error('Error logging message:', error);
        toast({ title: 'Error', description: 'Could not log message to history.', variant: 'destructive' });
    }
  };

  const handleTabChange = async (tabValue: string) => {
      if (tabValue === 'history' && userDocId && activeBranchId) {
          setIsFetchingHistory(true);
          try {
              const historyCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'messageHistory');
              const historyQuery = query(historyCollection, orderBy('sentAt', 'desc'), limit(50));
              const historySnap = await getDocs(historyQuery);
              const historyList = historySnap.docs.map(d => {
                  const data = d.data();
                  return {
                      id: d.id,
                      memberName: data.memberName,
                      message: data.message,
                      type: data.type,
                      sentAt: (data.sentAt as Timestamp).toDate().toLocaleString(),
                  }
              });
              setHistory(historyList);
          } catch(error) {
              console.error("Error fetching history:", error);
              toast({ title: "Error", description: "Failed to fetch message history.", variant: "destructive" });
          } finally {
              setIsFetchingHistory(false);
          }
      }
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
                 <div className="flex items-center gap-2">
                    <Dialog>
                        <DialogTrigger asChild>
                             <Button variant="outline" type="button">
                                <WhatsAppIcon />
                                Connect WhatsApp
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Connect to WhatsApp</DialogTitle>
                                <DialogDescription>
                                    Click the button below to open WhatsApp Web in a new tab. Scan the QR code with your phone to link your device.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <a href="https://web.whatsapp.com" target="_blank" rel="noopener noreferrer" className="w-full">
                                    <Button className="w-full">
                                        <WhatsAppIcon /> Open WhatsApp Web
                                    </Button>
                                </a>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Link href="/dashboard/owner">
                        <Button variant="outline" type="button">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Dashboard
                        </Button>
                    </Link>
                 </div>
              </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="paymentReminder" className="w-full" onValueChange={handleTabChange}>
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
                        {messageTemplates.map(template => (
                           <TabsTrigger key={template.value} value={template.value} className="flex flex-col md:flex-row gap-2 h-auto py-2">
                               {template.icon}
                               {template.label}
                           </TabsTrigger>
                        ))}
                         <TabsTrigger value="history" className="flex flex-col md:flex-row gap-2 h-auto py-2">
                            <History className="h-5 w-5" />
                            History
                        </TabsTrigger>
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
                                                            href={`https://wa.me/91${member.phone}?text=${encodeURIComponent(generateMessage(form.getValues(template.value as MessageType) || template.placeholder, member))}`}
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            onClick={() => handleMessageSent(template.value, member)}
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

                    <TabsContent value="history">
                        <Card className="mt-4">
                            <CardHeader>
                                <CardTitle>Message History</CardTitle>
                                <CardDescription>Showing the last 50 messages sent.</CardDescription>
                            </CardHeader>
                             <CardContent>
                                {isFetchingHistory ? (
                                    <div className="flex items-center justify-center p-8">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                ) : history.length > 0 ? (
                                    <ScrollArea className="h-96">
                                        <div className="space-y-4">
                                            {history.map(item => (
                                                <div key={item.id} className="p-3 rounded-md border text-sm">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="font-semibold">{item.memberName}</span>
                                                        <span className="text-xs text-muted-foreground">{item.sentAt}</span>
                                                    </div>
                                                    <p className="text-muted-foreground bg-muted p-2 rounded-md">{item.message}</p>
                                                    <Badge variant="secondary" className="mt-2">{item.type}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                ) : (
                                    <p className="text-center text-muted-foreground py-8">No message history found.</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </CardContent>
          </form>
        </Form>
      </Card>
    </div>
  );
}
