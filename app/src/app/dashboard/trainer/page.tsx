
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, Timestamp, doc, getDoc, addDoc, orderBy, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, User, LogOut, Building, Cake, MessageSquare, Wrench, Utensils, Megaphone, Clock, Tags, IndianRupee, Percent, QrCode, BarChart3 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { differenceInYears, parseISO, isWithinInterval } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { BannerDisplay } from '@/components/ui/banner-display';
import { Users as UsersIcon } from 'lucide-react';

interface AssignedClass {
  id: string;
  className: string;
  dateTime: Date;
  capacity: number;
  location: string;
  booked: number;
}

interface AssignedMember {
    id: string;
    fullName: string;
    age: number;
    fitnessGoal?: string;
    communityUsername?: string;
}

interface TrainerInfo {
    name: string;
    branchName: string;
}

interface Announcement {
    id: string;
    message: string;
    audience: 'all' | 'members' | 'trainers';
    createdAt: Date;
}

interface TrainerOffer {
  id: string;
  title: string;
  description?: string;
  offerType: string;
  bonusType: 'percentage' | 'flat';
  bonusValue: number;
  startDate: string;
  endDate: string;
}

const dietFormSchema = z.object({
    breakfast: z.string().min(1, 'Breakfast details are required.'),
    lunch: z.string().min(1, 'Lunch details are required.'),
    dinner: z.string().min(1, 'Dinner details are required.'),
    snacks: z.string().optional(),
});
type DietFormData = z.infer<typeof dietFormSchema>;

const broadcastSchema = z.object({
    message: z.string().min(1, 'Message cannot be empty.'),
});
type BroadcastFormData = z.infer<typeof broadcastSchema>;


export default function TrainerDashboardPage() {
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [pastClasses, setPastClasses] = useState<AssignedClass[]>([]);
  const [assignedMembers, setAssignedMembers] = useState<AssignedMember[]>([]);
  const [trainerInfo, setTrainerInfo] = useState<TrainerInfo | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [offers, setOffers] = useState<TrainerOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [birthdayMessage, setBirthdayMessage] = useState<string | null>(null);
  const [isDietDialogOpen, setIsDietDialogOpen] = useState(false);
  const [selectedMemberForDiet, setSelectedMemberForDiet] = useState<AssignedMember | null>(null);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [isBroadcastDialogOpen, setIsBroadcastDialogOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const dietForm = useForm<DietFormData>({
    resolver: zodResolver(dietFormSchema),
    defaultValues: { breakfast: '', lunch: '', dinner: '', snacks: '' },
  });

  const broadcastForm = useForm<BroadcastFormData>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: { message: '' },
  });


  useEffect(() => {
    const fetchTrainerData = async () => {
      const userDocId = localStorage.getItem('userDocId');
      const activeBranchId = localStorage.getItem('activeBranch');
      const trainerId = localStorage.getItem('trainerId');

      if (!userDocId || !activeBranchId || !trainerId) {
        toast({ title: "Error", description: "Session invalid. Please log in again.", variant: "destructive" });
        router.push('/');
        return;
      }

      try {
        const trainerRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers', trainerId);
        const trainerSnap = await getDoc(trainerRef);
        
        const gymRef = doc(db, 'gyms', userDocId);
        const gymSnap = await getDoc(gymRef);

        const branchRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId);
        const branchSnap = await getDoc(branchRef);

        if (trainerSnap.exists() && branchSnap.exists() && gymSnap.exists()) {
            const trainerData = trainerSnap.data();
            setTrainerInfo({
                name: trainerData.fullName,
                branchName: branchSnap.data().name
            });
            
            const dob = (trainerData.dob as Timestamp)?.toDate();
            if (dob) {
                const today = new Date();
                if (dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth()) {
                    const gymName = gymSnap.data().name || "the gym";
                    setBirthdayMessage(`Happy Birthday, Coach! 🏋️‍♂️🎂 Thank you for inspiring us every day. Here’s to another year of strength, motivation, and achievements! From ${gymName}`);
                }
            }

        } else {
             toast({ title: "Error", description: "Could not find trainer details.", variant: "destructive" });
             router.push('/');
             return;
        }

        const classesCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'classes');
        const qClasses = query(classesCollection, where("trainerId", "==", trainerId));
        const classesSnapshot = await getDocs(qClasses);
        
        const allClassesPromises = classesSnapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const bookingsCollection = collection(docSnap.ref, 'bookings');
            const bookingsSnapshot = await getDocs(bookingsCollection);
            return {
                id: docSnap.id,
                className: data.className,
                dateTime: (data.dateTime as Timestamp).toDate(),
                capacity: data.capacity,
                location: data.location,
                booked: bookingsSnapshot.size,
            };
        });
        const allLoadedClasses = await Promise.all(allClassesPromises);
        
        const upcomingClasses = allLoadedClasses.filter(c => c.dateTime > new Date());
        upcomingClasses.sort((a,b) => a.dateTime.getTime() - a.dateTime.getTime());
        setAssignedClasses(upcomingClasses);

        const pastConductedClasses = allLoadedClasses.filter(c => c.dateTime <= new Date());
        pastConductedClasses.sort((a,b) => b.dateTime.getTime() - a.dateTime.getTime());
        setPastClasses(pastConductedClasses);
        
        const membersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'members');
        const qMembers = query(membersCollection, where('assignedTrainer', '==', trainerId));
        const membersSnap = await getDocs(qMembers);
        
        const membersListPromises = membersSnap.docs.map(async (docSnap) => {
            const memberData = docSnap.data();
            const dob = (memberData.dob as Timestamp)?.toDate();
            const age = dob ? differenceInYears(new Date(), dob) : 0;
            
            // Find member's community username
            const communityQuery = query(collection(db, 'userCommunity'), where('userId', '==', docSnap.id));
            const communitySnap = await getDocs(communityQuery);
            const communityUsername = !communitySnap.empty ? communitySnap.docs[0].id : undefined;

            return {
                id: docSnap.id,
                fullName: memberData.fullName,
                age: age,
                fitnessGoal: memberData.fitnessGoal,
                communityUsername: communityUsername
            }
        });
        const membersList = await Promise.all(membersListPromises);
        setAssignedMembers(membersList);

        // Fetch Announcements
        const now = new Date();
        const announcementsRef = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'announcements');
        const announcementsQuery = query(announcementsRef, orderBy("createdAt", "desc"));
        const announcementsSnap = await getDocs(announcementsQuery);
        
        const announcementsList = announcementsSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data(), createdAt: (doc.data().createdAt as Timestamp).toDate() } as Announcement))
            .filter(a => (a.audience === 'all' || a.audience === 'trainers'));
        setAnnouncements(announcementsList.slice(0,1)); // Only show the most recent one
        
        // Fetch Trainer Offers
        const offersRef = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainerOffers');
        const qOffers = query(offersRef, where("endDate", ">=", Timestamp.fromDate(now)));
        const offersSnap = await getDocs(qOffers);
        const offersList = offersSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as TrainerOffer))
            .filter(offer => isWithinInterval(now, {start: parseISO((offer.startDate as unknown) as string), end: parseISO((offer.endDate as unknown) as string)}));
        setOffers(offersList);

      } catch (error) {
        console.error("Error fetching trainer data:", error);
        toast({ title: "Error", description: "Failed to fetch dashboard data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchTrainerData();
  }, [router, toast]);
  
  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  const onDietSubmit = async (data: DietFormData) => {
    if (!selectedMemberForDiet) return;
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    const trainerId = localStorage.getItem('trainerId');
    if (!userDocId || !activeBranchId || !trainerId) return;

    try {
        const memberRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', selectedMemberForDiet.id);
        const dietCollection = collection(memberRef, 'dietPlans');
        
        await addDoc(dietCollection, {
            ...data,
            sentByTrainerId: trainerId,
            sentAt: serverTimestamp(),
        });
        
        // Set flag on member document
        await updateDoc(memberRef, { hasNewDietPlan: true });

        toast({ title: "Diet Plan Sent!", description: `A new diet plan has been sent to ${selectedMemberForDiet.fullName}.`});
        dietForm.reset();
        setIsDietDialogOpen(false);
    } catch (e) {
        console.error("Error sending diet plan: ", e);
        toast({ title: "Error", description: "Could not send the diet plan.", variant: "destructive"});
    }
  };
  
  const handleStartChat = async (member: AssignedMember) => {
    const trainerUsername = localStorage.getItem('communityUsername');
    const memberUsername = member.communityUsername;

    if (!trainerUsername || !memberUsername) {
        toast({ title: "Cannot Chat", description: "Either you or the member does not have a community profile to initiate chat.", variant: "destructive" });
        return;
    }
    setIsStartingChat(true);

    const participants = [trainerUsername, memberUsername].sort();
    const chatId = participants.join('_');
    const chatRef = doc(db, 'chats', chatId);

    try {
        const chatSnap = await getDoc(chatRef);
        if (!chatSnap.exists()) {
            await setDoc(chatRef, {
                participants: participants,
                createdAt: serverTimestamp(),
            });
        }
        router.push(`/dashboard/messages/${chatId}`);
    } catch (error) {
        console.error("Error starting chat:", error);
        toast({ title: "Error", description: "Could not start a chat.", variant: "destructive" });
    } finally {
        setIsStartingChat(false);
    }
  };
  
  const handleBroadcast = async (data: BroadcastFormData) => {
    const trainerUsername = localStorage.getItem('communityUsername');
    if (!trainerUsername) {
        toast({ title: 'Profile Not Found', description: 'You need a community profile to send messages.', variant: 'destructive'});
        return;
    }

    const membersToMessage = assignedMembers.filter(m => m.communityUsername);
    if (membersToMessage.length === 0) {
        toast({ title: 'No Recipients', description: 'None of your assigned members have community profiles.', variant: 'destructive'});
        return;
    }

    try {
        let count = 0;
        for (const member of membersToMessage) {
            const participants = [trainerUsername, member.communityUsername!].sort();
            const chatId = participants.join('_');
            const chatRef = doc(db, 'chats', chatId);
            
            const chatSnap = await getDoc(chatRef);
            if (!chatSnap.exists()) {
                await setDoc(chatRef, {
                    participants: participants,
                    createdAt: serverTimestamp(),
                });
            }

            const messagesRef = collection(chatRef, 'messages');
            await addDoc(messagesRef, {
                text: data.message,
                senderId: localStorage.getItem('trainerId'),
                senderName: trainerUsername,
                timestamp: serverTimestamp(),
            });
            count++;
        }
        toast({ title: 'Broadcast Sent!', description: `Your message was sent to ${count} members.`});
        setIsBroadcastDialogOpen(false);
        broadcastForm.reset();
    } catch (error) {
        console.error("Error sending broadcast:", error);
        toast({ title: 'Error', description: 'An error occurred while sending the broadcast.', variant: 'destructive' });
    }
  }


  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <>
    <Dialog open={isDietDialogOpen} onOpenChange={setIsDietDialogOpen}>
        <DialogContent className="max-w-lg">
            <DialogHeader>
                <DialogTitle>Send Diet Plan to {selectedMemberForDiet?.fullName}</DialogTitle>
                <DialogDescription>Create a diet plan for your student. They will be notified.</DialogDescription>
            </DialogHeader>
            <Form {...dietForm}>
                <form onSubmit={dietForm.handleSubmit(onDietSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                    <FormField control={dietForm.control} name="breakfast" render={({ field }) => (<FormItem><FormLabel>Breakfast</FormLabel><FormControl><Textarea placeholder="e.g., Oats with fruits and nuts" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={dietForm.control} name="lunch" render={({ field }) => (<FormItem><FormLabel>Lunch</FormLabel><FormControl><Textarea placeholder="e.g., Grilled chicken with brown rice and salad" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={dietForm.control} name="dinner" render={({ field }) => (<FormItem><FormLabel>Dinner</FormLabel><FormControl><Textarea placeholder="e.g., Paneer stir-fry with vegetables" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={dietForm.control} name="snacks" render={({ field }) => (<FormItem><FormLabel>Snacks (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Greek yogurt, a handful of almonds" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDietDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={dietForm.formState.isSubmitting}>
                            {dietForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Send Diet Plan'}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
    
    <Dialog open={isBroadcastDialogOpen} onOpenChange={setIsBroadcastDialogOpen}>
      <DialogContent>
          <DialogHeader>
              <DialogTitle>Broadcast to All Assigned Members</DialogTitle>
              <DialogDescription>
                  This message will be sent individually to all your assigned members who have a community profile.
              </DialogDescription>
          </DialogHeader>
          <Form {...broadcastForm}>
              <form onSubmit={broadcastForm.handleSubmit(handleBroadcast)} className="space-y-4 py-4">
                  <FormField
                      control={broadcastForm.control}
                      name="message"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Message</FormLabel>
                              <FormControl>
                                  <Textarea placeholder="Type your message here..." className="min-h-[120px]" {...field} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                  <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsBroadcastDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={broadcastForm.formState.isSubmitting}>
                          {broadcastForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Send Broadcast'}
                      </Button>
                  </DialogFooter>
              </form>
          </Form>
      </DialogContent>
    </Dialog>


    <div className="container mx-auto py-10">
        {announcements.length > 0 && (
             <Alert className="mb-6">
                <Megaphone className="h-4 w-4" />
                <AlertTitle>Announcement</AlertTitle>
                <AlertDescription>
                    {announcements[0].message}
                </AlertDescription>
             </Alert>
        )}
        {birthdayMessage && (
            <Alert className="mb-6 border-amber-500 text-amber-700 bg-amber-50">
                <Cake className="h-4 w-4 !text-amber-700" />
                <AlertTitle className="text-amber-800 font-bold">Happy Birthday!</AlertTitle>
                <AlertDescription className="text-amber-700">
                   {birthdayMessage}
                </AlertDescription>
            </Alert>
        )}
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-bold">Trainer Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {trainerInfo?.name}! Here are your upcoming classes at {trainerInfo?.branchName}.</p>
        </div>
        <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                    <User className="h-5 w-5" />
                    <span className="sr-only">User Menu</span>
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => router.push('/dashboard/trainer/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>View Profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
      
       <BannerDisplay location="dashboard" />

        <Card className="mb-6">
            <CardHeader>
                <CardTitle>Community</CardTitle>
                <CardDescription>Connect with other gym members and trainers.</CardDescription>
            </CardHeader>
            <CardContent>
                <Link href="/dashboard/trainer/community" passHref>
                <Button className="w-full">
                    <UsersIcon className="mr-2 h-4 w-4" />
                    Go to Community
                </Button>
                </Link>
            </CardContent>
        </Card>
       
       <Card className="mb-6">
            <CardHeader>
                <CardTitle>Scan QR Code</CardTitle>
                <CardDescription>Mark attendance for yourself.</CardDescription>
            </CardHeader>
            <CardContent>
                <Link href="/dashboard/attendance" passHref>
                    <Button className="w-full justify-start">
                        <QrCode className="mr-2 h-4 w-4"/> Scan to Check In
                    </Button>
                </Link>
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                    <CardTitle>My Upcoming Schedule</CardTitle>
                    <CardDescription>A list of your upcoming assigned classes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Class Name</TableHead>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Bookings</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {assignedClasses.length > 0 ? (
                            assignedClasses.map((cls) => (
                            <TableRow key={cls.id}>
                                <TableCell className="font-medium">{cls.className}</TableCell>
                                <TableCell>{cls.dateTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</TableCell>
                                <TableCell>{cls.location}</TableCell>
                                <TableCell>{cls.booked} / {cls.capacity}</TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                You have no upcoming classes assigned.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row justify-between items-center">
                        <div>
                            <CardTitle>Assigned Students</CardTitle>
                            <CardDescription>Members you are currently training.</CardDescription>
                        </div>
                        <Button variant="outline" onClick={() => setIsBroadcastDialogOpen(true)}>
                            <MessageSquare className="h-4 w-4 mr-2" /> Message All Members
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Age</TableHead>
                                    <TableHead>Goal</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assignedMembers.length > 0 ? assignedMembers.map(member => (
                                    <TableRow key={member.id}>
                                        <TableCell className="font-medium">{member.fullName}</TableCell>
                                        <TableCell>{member.age} yrs</TableCell>
                                        <TableCell>{member.fitnessGoal || "N/A"}</TableCell>
                                        <TableCell className="space-x-2">
                                            <Link href={`/progress/${member.communityUsername}`} passHref>
                                                <Button variant="outline" size="sm" disabled={!member.communityUsername}>
                                                    <BarChart3 className="h-4 w-4 mr-2"/>
                                                    Progress
                                                </Button>
                                            </Link>
                                            <Button variant="outline" size="sm" onClick={() => {setSelectedMemberForDiet(member); setIsDietDialogOpen(true);}}>
                                                <Utensils className="h-4 w-4 mr-2"/>
                                                Send Diet
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => handleStartChat(member)} disabled={isStartingChat || !member.communityUsername}>
                                               {isStartingChat ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <MessageSquare className="h-4 w-4 mr-2"/>}
                                                Chat
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">No students assigned.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>My Past Classes</CardTitle>
                        <CardDescription>A log of your recently conducted classes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Class Name</TableHead>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>Attendance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pastClasses.length > 0 ? (
                                    pastClasses.slice(0, 5).map((cls) => (
                                        <TableRow key={cls.id}>
                                            <TableCell className="font-medium">{cls.className}</TableCell>
                                            <TableCell>{cls.dateTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</TableCell>
                                            <TableCell>{cls.booked} / {cls.capacity}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">No past classes found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-1 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                         <Link href="/dashboard/gym-profile" passHref>
                            <Button className="w-full justify-start" variant="outline"><Building className="mr-2"/> View Gym Profile</Button>
                         </Link>
                         <Link href="/dashboard/trainer/maintenance" passHref>
                            <Button className="w-full justify-start" variant="outline"><Wrench className="mr-2"/> Maintenance Tasks</Button>
                         </Link>
                         <Link href="/dashboard/trainer/complaints" passHref>
                            <Button className="w-full justify-start" variant="outline"><MessageSquare className="mr-2"/> Complaints</Button>
                         </Link>
                         <Link href="/dashboard/trainer/payments" passHref>
                            <Button className="w-full justify-start" variant="outline"><IndianRupee className="mr-2"/> Payments</Button>
                         </Link>
                    </CardContent>
                </Card>
                 {offers.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Tags/> Active Incentives</CardTitle>
                            <CardDescription>Check out the latest incentive programs available for you.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           {offers.map(offer => (
                                <div key={offer.id} className="p-4 border rounded-lg bg-background">
                                    <h3 className="font-semibold">{offer.title}</h3>
                                    <p className="text-sm text-muted-foreground my-2">{offer.description}</p>
                                    <div className="flex justify-between items-center text-sm">
                                        <Badge variant="secondary">{offer.offerType}</Badge>
                                        <div className="flex items-center font-bold text-primary">
                                            {offer.bonusType === 'percentage' ? <Percent className="mr-2 h-4 w-4"/> : <IndianRupee className="mr-2 h-4 w-4"/>}
                                            <span>{offer.bonusValue}{offer.bonusType === 'percentage' ? '%' : ' Flat'} Bonus</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    </div>
    </>
  );
}
