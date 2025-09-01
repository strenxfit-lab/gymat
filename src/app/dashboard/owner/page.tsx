
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Building, Calendar, DollarSign, PlusCircle, Send, Users, UserPlus, TrendingUp, AlertCircle, Sparkles, LifeBuoy, BarChart3 } from 'lucide-react';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, Legend } from 'recharts';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Member {
  id: string;
  name: string;
  expiryDate: Date;
  plan: string;
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
  todaysCheckIns: number;
  newTrialMembers: number;
  runningOffers: string[];
}

export default function OwnerDashboard() {
  const [gymData, setGymData] = useState<GymData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const userDocId = localStorage.getItem('userDocId');
    if (!userDocId) {
      toast({ title: "Error", description: "No user session found.", variant: "destructive" });
      router.push('/');
      return;
    }

    const fetchData = async () => {
      try {
        const gymRef = doc(db, 'gyms', userDocId);
        const gymSnap = await getDoc(gymRef);

        if (!gymSnap.exists()) {
          toast({ title: "Error", description: "Gym data not found.", variant: "destructive" });
          setLoading(false);
          return;
        }

        const gym = gymSnap.data();
        
        // Mocking data for now as Firestore structure is not fully defined
        const mockData: GymData = {
          name: gym.name || 'Strenxfit Gym',
          location: gym.location || 'Metropolis',
          totalMembers: 150,
          totalTrainers: 10,
          activePackages: ['Monthly', 'Quarterly', 'Yearly'],
          todaysCollection: 1250,
          thisMonthsRevenue: 18500,
          pendingDues: 3200,
          activeMembers: 120,
          expiredMembers: 30,
          trainers: [
            { id: 't1', name: 'John Doe', assignedMembers: 15 },
            { id: 't2', name: 'Jane Smith', assignedMembers: 20 },
          ],
          upcomingExpiries: [
            { id: 'm1', name: 'Alice', expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), plan: 'Monthly' },
            { id: 'm2', name: 'Bob', expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), plan: 'Yearly' },
          ],
          todaysCheckIns: 45,
          newTrialMembers: 3,
          runningOffers: ['20% off on yearly plan', 'Bring a friend, get 1 month free'],
        };

        setGymData(mockData);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast({ title: "Error", description: "Failed to fetch dashboard data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, toast]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background">Loading dashboard...</div>;
  }

  if (!gymData) {
    return <div className="flex min-h-screen items-center justify-center bg-background">Could not load gym data.</div>;
  }
  
  const memberData = [
    { name: 'Members', active: gymData.activeMembers, expired: gymData.expiredMembers },
  ];

  return (
    <ScrollArea className="h-screen bg-background">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Owner Dashboard</h2>
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
                    <Button className="w-full mt-2">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Member
                    </Button>
                </CardContent>
            </Card>
             <Card className="hover:bg-card/90 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Add Trainer</CardTitle>
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <Button className="w-full mt-2">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Trainer
                    </Button>
                </CardContent>
            </Card>
            <Card className="hover:bg-card/90 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Collect Fees</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                     <Button className="w-full mt-2">
                        <DollarSign className="mr-2 h-4 w-4" />
                        Add Payment
                    </Button>
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
                    {gymData.name}
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
                <p className="text-2xl font-bold">${gymData.todaysCollection.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Month's Revenue</p>
                <p className="text-2xl font-bold">${gymData.thisMonthsRevenue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
                <p className="text-2xl font-bold text-destructive">${gymData.pendingDues.toLocaleString()}</p>
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
                    <ul className="space-y-2">
                        {gymData.upcomingExpiries.map(member => (
                            <li key={member.id} className="flex justify-between items-center text-sm">
                                <span>{member.name} ({member.plan})</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">{member.expiryDate.toLocaleDateString()}</span>
                                  <Button size="sm" variant="outline">Renew</Button>
                                </div>
                            </li>
                        ))}
                         {gymData.upcomingExpiries.length === 0 && <p className="text-muted-foreground text-sm">No upcoming expiries.</p>}
                    </ul>
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
                     <div>
                        <p className="text-sm font-medium">Running Offers</p>
                        <ul className="list-disc list-inside mt-1 text-sm text-muted-foreground">
                            {gymData.runningOffers.map(offer => <li key={offer}>{offer}</li>)}
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="grid gap-4">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <LifeBuoy className="mr-2"/>
                        Support
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm mb-4">Need help? Contact our support team.</p>
                    <Button>Contact Strenxfit Support</Button>
                </CardContent>
            </Card>
        </div>

      </div>
    </ScrollArea>
  );
}
