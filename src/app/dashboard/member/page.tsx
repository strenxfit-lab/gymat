
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Tags, IndianRupee, Percent, ShieldCheck, User, LogOut, Bell, Building } from "lucide-react";
import Link from 'next/link';
import { collection, getDocs, query, where, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isBefore, isWithinInterval, addDays } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


interface Offer {
  id: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  applicablePlans: string[];
}

interface Equipment {
  id: string;
  name: string;
  status: 'Active' | 'Under Maintenance' | 'Out of Order';
}


const membershipPlans = [
    { id: "monthly", label: "Monthly" },
    { id: "quarterly", label: "Quarterly" },
    { id: "half-yearly", label: "Half-Yearly" },
    { id: "yearly", label: "Yearly" },
    { id: "trial", label: "Trial" },
];

const getStatusVariant = (status: Equipment['status']) => {
    switch (status) {
        case 'Active': return 'default';
        case 'Under Maintenance': return 'secondary';
        case 'Out of Order': return 'destructive';
        default: return 'outline';
    }
}

export default function MemberDashboard() {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [loadingOffers, setLoadingOffers] = useState(true);
    const [loadingEquipment, setLoadingEquipment] = useState(true);
    const [hasNotification, setHasNotification] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const userDocId = localStorage.getItem('userDocId');
        const activeBranchId = localStorage.getItem('activeBranch');
        const memberId = localStorage.getItem('memberId');

        if (!userDocId || !activeBranchId) {
            setLoadingOffers(false);
            setLoadingEquipment(false);
            return;
        }

        const fetchAllData = async () => {
            // Fetch Offers
            try {
                const now = new Date();
                const offersRef = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'offers');
                const q = query(offersRef, where("endDate", ">=", Timestamp.fromDate(now)));
                const offersSnap = await getDocs(q);
                const offersList = offersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Offer));
                setOffers(offersList);
            } catch (error) {
                console.error("Failed to fetch offers:", error);
            } finally {
                setLoadingOffers(false);
            }
        
            // Fetch Equipment
             try {
                const equipmentRef = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'equipment');
                const equipmentSnap = await getDocs(equipmentRef);
                const equipmentList = equipmentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment));
                setEquipment(equipmentList);
            } catch (error) {
                console.error("Failed to fetch equipment:", error);
            } finally {
                setLoadingEquipment(false);
            }

            // Check for payment notifications
            if (memberId) {
                try {
                    const memberRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', memberId);
                    const memberSnap = await getDoc(memberRef);
                    if (memberSnap.exists()) {
                        const memberData = memberSnap.data();
                        const endDate = (memberData.endDate as Timestamp)?.toDate();
                        if (endDate) {
                            const now = new Date();
                            const sevenDaysFromNow = addDays(now, 7);
                            if (isWithinInterval(endDate, { start: now, end: sevenDaysFromNow })) {
                                setHasNotification(true);
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error checking notifications:", error);
                }
            }
        };

        fetchAllData();
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        router.push('/');
    };

  return (
    <div className="flex min-h-screen items-start justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-6xl space-y-8">
        <div className="flex justify-between items-center text-center">
          <div>
            <h1 className="text-3xl font-bold">Member Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's your fitness overview.</p>
          </div>
          <div className="flex items-center gap-2">
             <Link href="/dashboard/member/payment-history" passHref>
                <Button variant="outline" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {hasNotification && <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-destructive" />}
                    <span className="sr-only">Notifications</span>
                </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                    <User className="h-5 w-5" />
                    <span className="sr-only">User Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                 <DropdownMenuItem onSelect={() => router.push('/dashboard/member/profile')}>
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
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                    <CardTitle>My Schedule</CardTitle>
                    <CardDescription>View your upcoming booked classes.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center text-center">
                        <p className="text-muted-foreground mb-4">You have no upcoming classes.</p>
                        <Link href="/dashboard/member/book-class" passHref>
                            <Button>
                                <CalendarCheck className="w-4 h-4 mr-2" />
                                Book a Class
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Tags/> Active Offers</CardTitle>
                        <CardDescription>Check out the latest promotions available for you.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingOffers ? <p>Loading offers...</p> : (
                            offers.length > 0 ? (
                                <div className="grid md:grid-cols-2 gap-4">
                                {offers.map(offer => (
                                    <div key={offer.id} className="p-4 border rounded-lg bg-background flex flex-col">
                                        <h3 className="font-semibold">{offer.title}</h3>
                                        <p className="text-sm text-muted-foreground flex-grow my-2">{offer.description}</p>
                                        <div className="flex items-center text-sm font-bold text-primary mb-3">
                                            {offer.discountType === 'percentage' ? <Percent className="mr-2 h-4 w-4"/> : <IndianRupee className="mr-2 h-4 w-4"/>}
                                            <span>{offer.discountValue}{offer.discountType === 'percentage' ? '%' : ' Flat'} Discount</span>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-semibold mb-1">Applicable on:</h4>
                                            <div className="flex flex-wrap gap-1">
                                                {offer.applicablePlans.map(planId => (
                                                    <Badge key={planId} variant="secondary" className="text-xs">{membershipPlans.find(p=>p.id === planId)?.label || planId}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-4">No active offers at the moment. Check back later!</p>
                            )
                        )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ShieldCheck/> Equipment Status</CardTitle>
                        <CardDescription>Check the availability of gym equipment.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingEquipment ? <p>Loading equipment status...</p> : (
                            equipment.length > 0 ? (
                                <div className="grid md:grid-cols-3 gap-4 max-h-60 overflow-y-auto">
                                {equipment.map(item => (
                                    <div key={item.id} className="p-3 border rounded-lg bg-background flex items-center justify-between">
                                        <span className="font-medium text-sm">{item.name}</span>
                                        <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                                    </div>
                                ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-4">Equipment status is not available at the moment.</p>
                            )
                        )}
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1">
                 <Card>
                    <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col space-y-4">
                        <Link href="/dashboard/member/book-class" passHref>
                            <Button className="w-full justify-start"><CalendarCheck className="mr-2"/> Book a Class</Button>
                        </Link>
                         <Link href="/dashboard/member/payment-history" passHref>
                            <Button className="w-full justify-start" variant="outline">Payment History</Button>
                         </Link>
                         <Link href="/dashboard/gym-profile" passHref>
                            <Button className="w-full justify-start" variant="outline"><Building className="mr-2"/> Your Gym Profile</Button>
                         </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
}
