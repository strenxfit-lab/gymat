
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Tags, IndianRupee, Percent, ShieldCheck } from "lucide-react";
import Link from 'next/link';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';

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

    useEffect(() => {
        const userDocId = localStorage.getItem('userDocId');
        const activeBranchId = localStorage.getItem('activeBranch');

        if (!userDocId || !activeBranchId) {
            setLoadingOffers(false);
            setLoadingEquipment(false);
            return;
        }

        const fetchOffers = async () => {
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
        };
        
        const fetchEquipment = async () => {
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
        }

        fetchOffers();
        fetchEquipment();
    }, []);

  return (
    <div className="flex min-h-screen items-start justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-6xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Member Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your fitness overview.</p>
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
                         <Button className="w-full justify-start" variant="outline" disabled>View Profile</Button>
                         <Button className="w-full justify-start" variant="outline" disabled>Payment History</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
}
