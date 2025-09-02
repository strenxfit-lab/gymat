
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, getDocs, Timestamp, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Building, Calendar, DollarSign, PlusCircle, Send, Users, UserPlus, TrendingUp, AlertCircle, Sparkles, LifeBuoy, BarChart3, IndianRupee, Mail, Phone } from 'lucide-react';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, Legend } from 'recharts';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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
}

export default function OwnerDashboardPage() {
  const [gymData, setGymData] = useState<GymData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const userDocId = localStorage.getItem('userDocId');

    if (!userDocId) {
      router.push('/');
      return;
    }
    
    const fetchData = async () => {
      try {
        const gymRef = doc(db, 'gyms', userDocId);
        const gymSnap = await getDoc(gymRef);

        if (!gymSnap.exists()) {
          localStorage.removeItem('userDocId');
          localStorage.removeItem('userRole');
          localStorage.removeItem('activeBranch');
          router.push('/');
          return;
        }

        const gym = gymSnap.data();
        const activeBranchId = localStorage.getItem('activeBranch');
        
        if (!activeBranchId) {
            // No branches exist yet for this gym.
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
            });
            setLoading(false);
            return;
        }

        const branchRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId);
        const branchSnap = await getDoc(branchRef);
        const branchName = branchSnap.exists() ? branchSnap.data().name : gym.name;

        // Fetch data scoped to the active branch
        const membersRef = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'members');
        const membersSnap = await getDocs(membersRef);
        
        const trainersRef = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers');
        const trainersSnap = await getDocs(trainersRef);

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        let activeMembers = 0;
        let expiredMembers = 0;
        let upcomingExpiries: Member[] = [];
        let upcomingExpiriesTotal = 0;
        const activePackages = new Set<string>();
        
        let todaysCollection = 0;
        let thisMonthsRevenue = 0;
        let pendingDues = 0;
        let newTrialMembers = 0;
        
        const members: {id: string, plan: string, assignedTrainer?: string, totalFee: number}[] = [];

        for (const memberDoc of membersSnap.docs) {
            const data = memberDoc.data();
            const createdAt = (data.createdAt as Timestamp)?.toDate();
            
            if (data.isTrial && createdAt && createdAt >= startOfToday) {
                newTrialMembers++;
            }

            if (!data.endDate || !(data.endDate instanceof Timestamp)) {
              continue;
            }
            const expiry = (data.endDate as Timestamp).toDate();
            const memberTotalFee = data.totalFee || 0;
            
            const memberInfo = {
                id: memberDoc.id,
                name: data.fullName,
                endDate: expiry,
                plan: data.plan,
                totalFee: memberTotalFee,
                phone: data.phone,
                assignedTrainer: data.assignedTrainer
            };
            members.push(memberInfo);

            const paymentsRef = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', memberDoc.id, 'payments');
            const paymentsSnap = await getDocs(paymentsRef);
            
            let totalPaidForCurrentTerm = 0;
            let memberPendingDue = 0;
            paymentsSnap.forEach(paymentDoc => {
                const payment = paymentDoc.data();
                const paymentDate = (payment.paymentDate as Timestamp).toDate();

                if (paymentDate >= startOfMonth) {
                    thisMonthsRevenue += payment.amountPaid;
                }

                if (paymentDate >= startOfToday) {
                    todaysCollection += payment.amountPaid;
                }
                
                totalPaidForCurrentTerm += payment.amountPaid;
                memberPendingDue += payment.balanceDue || 0;
            });
            
            pendingDues += memberPendingDue;

            if (expiry >= now) {
                activeMembers++;
                if(expiry <= sevenDaysFromNow) {
                    upcomingExpiries.push({ 
                      id: memberDoc.id, 
                      name: data.fullName, 
                      endDate: expiry, 
                      plan: data.plan,
                      phone: data.phone,
                      totalFee: memberTotalFee
                    });
                    upcomingExpiriesTotal += memberTotalFee;
                }
            } else {
                expiredMembers++;
                const outstandingForExpired = memberTotalFee - totalPaidForCurrentTerm;
                if(outstandingForExpired > 0 && !paymentsSnap.empty) {
                     if (memberPendingDue === 0) {
                        pendingDues += outstandingForExpired;
                     }
                }
            }

            if(data.plan) {
                activePackages.add(data.plan);
            }
        }


        const trainersData: Trainer[] = trainersSnap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.fullName,
                assignedMembers: members.filter(m => m.assignedTrainer === doc.id).length 
            };
        });

        const data: GymData = {
          name: gym.name || 'Your Gym',
          location: gym.location || 'Your City',
          totalMembers: members.length,
          totalTrainers: trainersSnap.size,
          activePackages: Array.from(activePackages),
          todaysCollection: todaysCollection,
          thisMonthsRevenue: thisMonthsRevenue,
          pendingDues: pendingDues,
          activeMembers: activeMembers,
          expiredMembers: expiredMembers,
          trainers: trainersData,
          upcomingExpiries: upcomingExpiries,
          upcomingExpiriesTotal: upcomingExpiriesTotal,
          todaysCheckIns: 0, // Needs attendance data
          newTrialMembers: newTrialMembers,
          runningOffers: gym.runningOffers || [],
          multiBranch: gym.multiBranch || false,
          activeBranchName: branchName,
        };

        setGymData(data);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast({ title: "Error", description: "Failed to fetch dashboard data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchData, 500); // give layout time to set branch
    return () => clearTimeout(timeoutId);
  }, [router, toast]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background">Loading dashboard...</div>;
  }

  if (!gymData) {
     router.push('/');
     return <div className="flex min-h-screen items-center justify-center bg-background">Redirecting...</div>;
  }
  
  if (!gymData.activeBranchName) {
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
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">{gymData.activeBranchName} Dashboard</h2>
          <div className="flex items-center space-x-2">
            <Button>
              <Calendar className="mr-2 h-4 w-4" />
              View Calendar
            </Button>
            <Button variant="outline">
                <Bell className="h-4 w-4" />
            </Button>
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
            <Card className="hover:bg-card/90 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Send Notification</CardTitle>
                    <Send className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <Button className="w-full mt-2">
                        <Send className="mr-2 h-4 w-4" />
                        Notify All
                    </Button>
                </CardContent>
            </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
             <CardHeader>
                <CardTitle className="flex items-center">
                    <Building className="mr-2"/>
                    {gymData.name} ({gymData.activeBranchName})
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
            <Card className="col-span-4">
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
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
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
                            <span className="text-muted-foreground">Assigned: {trainer.assignedMembers}</span>
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
                    <Button variant="outline">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create an offer
                    </Button>
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
                        <a href="https://wa.me/917988487892" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-md hover:bg-accent transition-colors">
                            <Phone className="h-5 w-5 text-muted-foreground" />
                            <span>+91 79884 87892</span>
                        </a>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
      </div>
    </ScrollArea>
  );
}
