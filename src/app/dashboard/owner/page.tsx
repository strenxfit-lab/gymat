
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, getDocs, Timestamp, query, orderBy, limit, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Building, Calendar, DollarSign, PlusCircle, Send, Users, UserPlus, TrendingUp, AlertCircle, Sparkles, LifeBuoy, BarChart3, IndianRupee, Mail, Phone, Loader2, Star, ClockIcon, BellRing, QrCode, Download, Shield } from 'lucide-react';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, Legend } from 'recharts';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import QRCode from 'qrcode.react';
import { ThemeToggle } from '@/components/theme-toggle';
import { differenceInDays } from 'date-fns';


interface Member {
  id: string;
  name: string;
  endDate: Date;
  plan: string;
  phone: string;
  totalFee: number;
}

interface Trainer {
  id: string;
  name: string;
  assignedMembers: number;
  averageRating?: number;
}

interface GymData {
  name: string;
  location: string;
  totalMembers: number;
  totalTrainers: number;
  activePackages: string[];
  todaysCollection: number;
  thisMonthsRevenue: number;
  pendingDues: number;
  activeMembers: number;
  expiredMembers: number;
  trainers: Trainer[];
  upcomingExpiries: Member[];
  upcomingExpiriesTotal: number;
  todaysCheckIns: number;
  newTrialMembers: number;
  runningOffers: string[];
  multiBranch?: boolean;
  activeBranchName?: string | null;
  isTrial?: boolean;
  trialKey?: string;
  membershipType?: string;
  price?: number;
  expiry_at?: Date;
}

const announcementSchema = z.object({
  message: z.string().min(10, { message: "Announcement must be at least 10 characters."}),
  audience: z.enum(['all', 'members', 'trainers'], { required_error: "You must select an audience."}),
});
type AnnouncementFormData = z.infer<typeof announcementSchema>;

export default function OwnerDashboardPage() {
  const [gymData, setGymData] = useState<GymData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const [showRenewalAlert, setShowRenewalAlert] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const announcementForm = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
  });

  useEffect(() => {
    const userDocId = localStorage.getItem('userDocId');

    if (!userDocId) {
      router.push('/');
      return;
    }
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const gymRef = doc(db, 'gyms', userDocId);
        const gymSnap = await getDoc(gymRef);

        if (!gymSnap.exists()) {
          localStorage.clear();
          router.push('/');
          return;
        }

        const gym = gymSnap.data();

        let activeBranchId = localStorage.getItem('activeBranch');
        
        if (!activeBranchId) {
          const branchesCollection = collection(db, 'gyms', userDocId, 'branches');
          const branchesSnap = await getDocs(branchesCollection);
          if (branchesSnap.docs.length > 0) {
            activeBranchId = branchesSnap.docs[0].id;
            localStorage.setItem('activeBranch', activeBranchId);
          }
        }
        
        setQrValue(JSON.stringify({ gymId: userDocId, branchId: activeBranchId }));

        const now = new Date();
        const expiryAt = (gym.expiry_at as Timestamp)?.toDate();
        if (expiryAt) {
            const daysUntilExpiry = differenceInDays(expiryAt, now);
            if (daysUntilExpiry <= 7 && daysUntilExpiry >= 0) {
                setShowRenewalAlert(true);
            }
        }

        if (!activeBranchId) {
            setGymData({
              name: gym.name || 'Your Gym',
              location: gym.location || 'Your City',
              totalMembers: 0,
              totalTrainers: 0,
              activePackages: [],
              todaysCollection: 0,
              thisMonthsRevenue: 0,
              pendingDues: 0,
              activeMembers: 0,
              expiredMembers: 0,
              trainers: [],
              upcomingExpiries: [],
              upcomingExpiriesTotal: 0,
              todaysCheckIns: 0,
              newTrialMembers: 0,
              runningOffers: [],
              multiBranch: gym.multiBranch || false,
              activeBranchName: null,
              isTrial: gym.isTrial,
              trialKey: gym.trialKey,
              membershipType: gym.membershipType,
              price: gym.price,
              expiry_at: expiryAt,
            });
            setLoading(false);
            return;
        }

        const branchRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId);
        const branchSnap = await getDoc(branchRef);
        const branchName = branchSnap.exists() ? branchSnap.data().name : gym.name;

        const membersRef = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'members');
        const membersSnap = await getDocs(membersRef);
        
        const trainersRef = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers');
        const trainersSnap = await getDocs(trainersRef);

        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        let activeMembers = 0;
        let expiredMembers = 0;
        let upcomingExpiries: Member[] = [];
        let upcomingExpiriesTotal = 0;
        const activePackages = new Set<string>();
        let newTrialMembers = 0;
        
        let todaysCollection = 0;
        let thisMonthsRevenue = 0;
        let totalPendingDues = 0;

        const allMembersForTrainers: {id: string, assignedTrainer?: string}[] = [];
        
        for (const memberDoc of membersSnap.docs) {
            const data = memberDoc.data();
            const createdAt = (data.createdAt as Timestamp)?.toDate();
            
            if (data.isTrial && createdAt && createdAt >= startOfToday) {
                newTrialMembers++;
            }
            
            if (data.endDate && data.endDate instanceof Timestamp) {
                const expiry = data.endDate.toDate();
                if (expiry >= now) {
                    activeMembers++;
                    if(expiry <= sevenDaysFromNow) {
                        upcomingExpiries.push({ 
                          id: memberDoc.id, 
                          name: data.fullName, 
                          endDate: expiry, 
                          plan: data.plan || 'N/A',
                          phone: data.phone,
                          totalFee: data.totalFee || 0
                        });
                        upcomingExpiriesTotal += data.totalFee || 0;
                    }
                } else {
                    expiredMembers++;
                }
            }
            
            if(data.plan) {
                activePackages.add(data.plan);
            }
            
            allMembersForTrainers.push({ id: memberDoc.id, assignedTrainer: data.assignedTrainer });
            
            const paymentsQuery = query(collection(memberDoc.ref, 'payments'), orderBy('paymentDate', 'desc'));
            const paymentsSnap = await getDocs(paymentsQuery);

            if (!paymentsSnap.empty) {
                const latestPayment = paymentsSnap.docs[0].data();
                if (latestPayment.balanceDue > 0) {
                    totalPendingDues += latestPayment.balanceDue;
                }
            }

            paymentsSnap.forEach(paymentDoc => {
                const payment = paymentDoc.data();
                const paymentDate = (payment.paymentDate as Timestamp).toDate();

                if (paymentDate >= startOfMonth) {
                    thisMonthsRevenue += payment.amountPaid || 0;
                }
                if (paymentDate >= startOfToday) {
                    todaysCollection += payment.amountPaid || 0;
                }
            });
        };
        
        const trainersData: Trainer[] = trainersSnap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.fullName,
                assignedMembers: allMembersForTrainers.filter(m => m.assignedTrainer === doc.id).length,
                averageRating: data.ratings?.averageRating,
            };
        });

        const data: GymData = {
          name: gym.name || 'Your Gym',
          location: gym.location || 'Your City',
          totalMembers: membersSnap.size,
          totalTrainers: trainersSnap.size,
          activePackages: Array.from(activePackages),
          todaysCollection: todaysCollection,
          thisMonthsRevenue: thisMonthsRevenue,
          pendingDues: totalPendingDues,
          activeMembers: activeMembers,
          expiredMembers: expiredMembers,
          trainers: trainersData,
          upcomingExpiries: upcomingExpiries,
          upcomingExpiriesTotal: upcomingExpiriesTotal,
          todaysCheckIns: 0,
          newTrialMembers: newTrialMembers,
          runningOffers: gym.runningOffers || [],
          multiBranch: gym.multiBranch || false,
          activeBranchName: branchName,
          isTrial: gym.isTrial,
          membershipType: gym.membershipType,
          price: gym.price,
          expiry_at: expiryAt,
        };

        setGymData(data);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast({ title: "Error", description: "Failed to fetch dashboard data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();

    const now = new Date();
    const night = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const msToMidnight = night.getTime() - now.getTime();
    const timeoutId = setTimeout(fetchData, msToMidnight);

    return () => clearTimeout(timeoutId);

  }, [router, toast]);
  
  const onAnnouncementSubmit = async (data: AnnouncementFormData) => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');

    if (!userDocId || !activeBranchId) {
        toast({ title: "Error", description: "No active branch found.", variant: "destructive"});
        return;
    }

    try {
        const announcementsRef = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'announcements');
        await addDoc(announcementsRef, {
            ...data,
            createdAt: serverTimestamp(),
            gymId: userDocId,
            branchId: activeBranchId,
            status: 'active'
        });
        toast({ title: "Announcement Sent!", description: "Your announcement has been published."});
        setIsAnnouncementDialogOpen(false);
        announcementForm.reset();
    } catch(error) {
        console.error("Error sending announcement: ", error);
        toast({ title: "Error", description: "Could not send announcement.", variant: "destructive"});
    }
  }
  
  const handleDownloadQr = () => {
    const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `${gymData?.activeBranchName || 'gym'}-qr-code.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Dashboard...</p>
      </div>
    );
  }

  if (!gymData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Redirecting...</p>
      </div>
    );
  }
  
  if (!gymData.activeBranchName && !gymData.isTrial) {
    return (
        <div className="flex flex-col min-h-screen items-center justify-center bg-background p-8 text-center">
            <Building className="h-16 w-16 text-primary mb-4"/>
            <h1 className="text-2xl font-bold">Welcome to {gymData.name}!</h1>
            <p className="text-muted-foreground mt-2 mb-6">It looks like you haven't set up any branches yet. <br/>Create your first branch to start managing your members and trainers.</p>
            <Link href="/dashboard/owner/multi-branch">
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4"/>
                    Create Your First Branch
                </Button>
            </Link>
        </div>
    )
  }

  const memberData = [
    { name: 'Members', active: gymData.activeMembers, expired: gymData.expiredMembers },
  ];

  return (
    <ScrollArea className="h-screen bg-background">
    <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {showRenewalAlert && (
            <Alert variant="destructive" className="mb-4">
                <ClockIcon className="h-4 w-4" />
                <AlertTitle>Your Plan is Expiring Soon!</AlertTitle>
                <AlertDescription className="flex justify-between items-center">
                    <span>Please renew your plan to continue using all features without interruption.</span>
                    <Button variant="outline" size="sm" onClick={() => setIsSupportDialogOpen(true)}>Renew Now</Button>
                </AlertDescription>
            </Alert>
        )}
        {gymData.isTrial && !showRenewalAlert && (
            <Alert variant="destructive" className="mb-4">
                <ClockIcon className="h-4 w-4" />
                <AlertTitle>Trial Period Active</AlertTitle>
                <AlertDescription>
                    You are currently on a trial plan. Some features may be limited.
                </AlertDescription>
            </Alert>
        )}
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">{gymData.activeBranchName || 'Trial Dashboard'}</h2>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <DialogTrigger asChild>
                <Button>
                    <QrCode className="mr-2 h-4 w-4"/>
                    Show QR Code
                </Button>
            </DialogTrigger>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="hover:bg-card/90 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Add Member</CardTitle>
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <Link href="/dashboard/owner/add-member" passHref>
                        <Button className="w-full mt-2">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New Member
                        </Button>
                    </Link>
                </CardContent>
            </Card>
             <Card className="hover:bg-card/90 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Add Trainer</CardTitle>
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <Link href="/dashboard/owner/add-trainer" passHref>
                        <Button className="w-full mt-2">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New Trainer
                        </Button>
                    </Link>
                </CardContent>
            </Card>
            <Card className="hover_bg-card/90 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Collect Fees</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                     <Link href="/dashboard/owner/add-payment" passHref>
                        <Button className="w-full mt-2">
                            <IndianRupee className="mr-2 h-4 w-4" />
                            Add Payment
                        </Button>
                    </Link>
                </CardContent>
            </Card>
            <Dialog open={isAnnouncementDialogOpen} onOpenChange={setIsAnnouncementDialogOpen}>
                <Card className="hover:bg-card/90 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Make Announcement</CardTitle>
                        <Send className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <DialogTrigger asChild>
                            <Button className="w-full mt-2">
                                <BellRing className="mr-2 h-4 w-4" />
                                Notify All
                            </Button>
                        </DialogTrigger>
                    </CardContent>
                </Card>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Make an Announcement</DialogTitle>
                        <DialogDescription>
                            Send a message to your members, trainers, or everyone.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...announcementForm}>
                        <form onSubmit={announcementForm.handleSubmit(onAnnouncementSubmit)} className="space-y-4">
                            <FormField
                                control={announcementForm.control}
                                name="audience"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                    <FormLabel>Select Audience</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                                            <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="all" /></FormControl><FormLabel className="font-normal">All</FormLabel></FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="members" /></FormControl><FormLabel className="font-normal">Members Only</FormLabel></FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="trainers" /></FormControl><FormLabel className="font-normal">Trainers Only</FormLabel></FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                             <FormField
                                control={announcementForm.control}
                                name="message"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Message</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="e.g., The gym will be closed tomorrow for maintenance."
                                            className="min-h-[120px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsAnnouncementDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={announcementForm.formState.isSubmitting}>
                                    {announcementForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Send Announcement'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-full lg:col-span-4">
             <CardHeader>
                <CardTitle className="flex items-center">
                    <Building className="mr-2"/>
                    {gymData.name} ({gymData.activeBranchName || 'Trial'})
                </CardTitle>
                <CardDescription>{gymData.location}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                 <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Members</p>
                    <p className="text-2xl font-bold">{gymData.totalMembers}</p>
                </div>
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Trainers</p>
                    <p className="text-2xl font-bold">{gymData.totalTrainers}</p>
                </div>
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Packages</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {gymData.activePackages.map(pkg => <div key={pkg} className="text-xs bg-primary/20 text-primary-foreground rounded-full px-2 py-0.5">{pkg}</div>)}
                        {gymData.activePackages.length === 0 && <p className="text-muted-foreground text-sm">No active packages.</p>}
                    </div>
                </div>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2"/>
                Revenue Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Collection</p>
                <p className="text-2xl font-bold">₹{gymData.todaysCollection.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Month's Revenue</p>
                <p className="text-2xl font-bold">₹{gymData.thisMonthsRevenue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
                <p className="text-2xl font-bold text-destructive">₹{gymData.pendingDues.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-full lg:col-span-4">
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <BarChart3 className="mr-2"/>
                        Active Members Overview
                    </CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={memberData}>
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip wrapperClassName="!bg-background !border-border" contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                            <Legend />
                            <Bar dataKey="active" fill="hsl(var(--primary))" name="Active" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expired" fill="hsl(var(--destructive))" name="Expired" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <AlertCircle className="mr-2"/>
                        Upcoming Expiries (Next 7 days)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[150px]">
                        <ul className="space-y-3 pr-4">
                            {gymData.upcomingExpiries.map(member => (
                                <li key={member.id} className="flex justify-between items-center text-sm">
                                    <div className="flex-1">
                                        <p className="font-semibold">{member.name} <span className="font-normal text-muted-foreground">({member.plan})</span></p>
                                        <p className="text-xs text-muted-foreground">{member.phone}</p>
                                        <p className="text-xs text-muted-foreground">Expires: {member.endDate.toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right ml-4">
                                      <p className="font-semibold">₹{member.totalFee.toLocaleString()}</p>
                                      <Link href={`/dashboard/owner/add-payment?memberId=${member.id}&memberName=${encodeURIComponent(member.name)}`} passHref>
                                        <Button variant="link" size="sm" className="h-auto p-0 text-primary">Collect</Button>
                                      </Link>
                                    </div>
                                </li>
                            ))}
                             {gymData.upcomingExpiries.length === 0 && <p className="text-muted-foreground text-sm">No upcoming expiries.</p>}
                        </ul>
                    </ScrollArea>
                    {gymData.upcomingExpiries.length > 0 && (
                        <>
                            <Separator className="my-4" />
                            <div className="flex justify-between items-center font-bold">
                                <span>Total Upcoming Revenue</span>
                                <span>₹{gymData.upcomingExpiriesTotal.toLocaleString()}</span>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Shield className="mr-2"/>
                        Plan Details
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Membership Type</p>
                            <p className="text-lg font-bold capitalize">{gymData.membershipType || 'N/A'}</p>
                        </div>
                         <div>
                            <p className="text-sm font-medium text-muted-foreground">Price</p>
                            <p className="text-lg font-bold">₹{gymData.price?.toLocaleString() || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Expires On</p>
                            <p className="text-lg font-bold">{gymData.expiry_at ? gymData.expiry_at.toLocaleDateString() : 'N/A'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Users className="mr-2"/>
                        Trainers Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {gymData.trainers.map(trainer => (
                        <div key={trainer.id} className="flex justify-between items-center text-sm mb-2">
                            <span>{trainer.name}</span>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                {trainer.averageRating ? (
                                    <div className="flex items-center gap-1">
                                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400"/>
                                        <span>{trainer.averageRating.toFixed(1)}</span>
                                    </div>
                                ) : null}
                                <span>Assigned: {trainer.assignedMembers}</span>
                            </div>
                        </div>
                    ))}
                    {gymData.trainers.length === 0 && <p className="text-muted-foreground text-sm">No trainers added.</p>}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Sparkles className="mr-2"/>
                        Trials & Offers
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <p className="text-sm font-medium">New Trial Members Today</p>
                        <p className="text-2xl font-bold">{gymData.newTrialMembers}</p>
                    </div>
                     <div className="mb-4">
                        <p className="text-sm font-medium">Running Offers</p>
                        <ul className="list-disc list-inside mt-1 text-sm text-muted-foreground">
                            {gymData.runningOffers.map(offer => <li key={offer}>{offer}</li>)}
                            {gymData.runningOffers.length === 0 && <p className="text-muted-foreground text-sm">No running offers.</p>}
                        </ul>
                    </div>
                    <Link href="/dashboard/owner/make-offers" passHref>
                        <Button variant="outline">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create an offer
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>

        <div className="grid gap-4">
            <Dialog open={isSupportDialogOpen} onOpenChange={setIsSupportDialogOpen}>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <LifeBuoy className="mr-2"/>
                            Support
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-sm mb-4">Need help? Contact our support team.</p>
                        <DialogTrigger asChild>
                            <Button>Contact Strenxfit Support</Button>
                        </DialogTrigger>
                    </CardContent>
                </Card>
                <DialogContent>
                    <DialogHeader>
                    <DialogTitle>Contact Support</DialogTitle>
                    <DialogDescription>
                        You can reach us via email or WhatsApp.
                    </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col space-y-4 py-4">
                        <a href="mailto:strenxfit@gmail.com" className="flex items-center gap-3 p-3 rounded-md hover:bg-accent transition-colors">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <span>strenxfit@gmail.com</span>
                        </a>
                        <a href="https://wa.me/917988487892" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 p-3 rounded-md hover:bg-accent transition-colors">
                            <Phone className="h-5 w-5 text-muted-foreground" />
                            <span>+91 79884 87892</span>
                        </a>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
      </div>
      <DialogContent>
        <DialogHeader>
            <DialogTitle>Branch Attendance QR Code</DialogTitle>
            <DialogDescription>
                Members can scan this code with their app to mark their attendance.
            </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center gap-6 py-4">
            <div className="bg-white p-4 rounded-2xl shadow-md">
                {qrValue ? (
                    <QRCode
                    id="qr-code-canvas"
                    value={qrValue}
                    size={200}
                    level={"H"}
                    includeMargin={true}
                    />
                ) : (
                    <div className="h-[200px] w-[200px] bg-muted rounded-md flex items-center justify-center">
                    <p className="text-muted-foreground">Could not generate QR code.</p>
                    </div>
                )}
            </div>
            <Button onClick={handleDownloadQr} disabled={!qrValue} className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl px-4 py-2">
                <Download className="mr-2 h-4 w-4" />
                Download QR
            </Button>
        </div>
      </DialogContent>
    </Dialog>
    </ScrollArea>
  );
}

    