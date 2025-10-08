
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Tags, IndianRupee, Percent, ShieldCheck, User, LogOut, Bell, Building, Cake, Clock, Loader2, MessageSquare, Utensils, Users as UsersIcon, Megaphone, QrCode, CreditCard, AlertCircle } from "lucide-react";
import Link from 'next/link';
import { collection, getDocs, query, where, Timestamp, doc, getDoc, collectionGroup, orderBy, setDoc, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isBefore, isWithinInterval, addDays, isToday, differenceInDays } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/theme-toggle';
import { BannerDisplay } from '@/components/ui/banner-display';


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

interface BookedClass {
    id: string;
    className: string;
    trainerName: string;
    dateTime: Date;
}

interface Announcement {
    id: string;
    message: string;
    audience: 'all' | 'members' | 'trainers';
    createdAt: Date;
}

interface MembershipStatus {
    status: 'Active' | 'Expired' | 'Expiring Soon' | 'Trial' | 'No Membership';
    daysLeft: number;
}

interface AssignedTrainer {
    id: string;
    name: string;
    communityUsername?: string;
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
    const [bookedClasses, setBookedClasses] = useState<BookedClass[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [membershipStatus, setMembershipStatus] = useState<MembershipStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasNewDietPlan, setHasNewDietPlan] = useState(false);
    const [birthdayMessage, setBirthdayMessage] = useState<string | null>(null);
    const [assignedTrainer, setAssignedTrainer] = useState<AssignedTrainer | null>(null);
    const [isStartingChat, setIsStartingChat] = useState(false);
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const userDocId = localStorage.getItem('userDocId');
        const activeBranchId = localStorage.getItem('activeBranch');
        const memberId = localStorage.getItem('memberId');
        
        const lastCheckIn = localStorage.getItem('lastCheckIn');
        if (lastCheckIn && isToday(new Date(lastCheckIn))) {
            setIsCheckedIn(true);
        }

        if (!memberId) {
            setLoading(false);
            router.push('/');
            return;
        }

        const fetchAllData = async () => {
            setLoading(true);
            try {
                let memberRef;
                let memberSnap;
                if(userDocId && activeBranchId) {
                    memberRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', memberId);
                    memberSnap = await getDoc(memberRef);
                }
                
                if (!memberSnap || !memberSnap.exists()) {
                    setMembershipStatus({ status: 'No Membership', daysLeft: 0 });
                    setLoading(false);
                    toast({ title: "Membership Inactive", description: "Your gym membership is no longer active. Some features are disabled.", variant: "destructive"});
                    router.push('/dashboard/member/community');
                    return;
                }
                
                const memberData = memberSnap.data();
                setHasNewDietPlan(memberData.hasNewDietPlan || false);
                
                if (memberData.assignedTrainer) {
                    const trainerRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers', memberData.assignedTrainer);
                    const trainerSnap = await getDoc(trainerRef);
                    if (trainerSnap.exists()) {
                        const communityQuery = query(collection(db, 'userCommunity'), where('userId', '==', trainerSnap.id), limit(1));
                        const communitySnap = await getDocs(communityQuery);
                        const communityUsername = !communitySnap.empty ? communitySnap.docs[0].id : undefined;

                        setAssignedTrainer({
                            id: trainerSnap.id,
                            name: trainerSnap.data().fullName,
                            communityUsername: communityUsername
                        });
                    }
                }


                // Check gym's trial status first
                const gymRef = doc(db, 'gyms', userDocId);
                const gymSnap = await getDoc(gymRef);
                const isGymTrial = gymSnap.exists() && gymSnap.data().isTrial;

                if (isGymTrial) {
                     setMembershipStatus({ status: 'Trial', daysLeft: Infinity });
                } else {
                    const endDate = (memberData.endDate as Timestamp)?.toDate();
                    if (endDate) {
                        const daysLeft = differenceInDays(endDate, new Date());
                        let status: MembershipStatus['status'] = 'Active';
                        if (daysLeft < 0) {
                            status = 'Expired';
                        } else if (daysLeft <= 7) {
                            status = 'Expiring Soon';
                        }
                        setMembershipStatus({ status, daysLeft });
                    } else {
                        // If not a trial gym and no end date, the session might be invalid.
                        router.push('/');
                        return;
                    }
                }


                // Fetch Trainers for class mapping
                const trainersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers');
                const trainersSnapshot = await getDocs(trainersCollection);
                const trainersList = trainersSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().fullName }));
                
                // Fetch Booked Classes for this member by querying all booking subcollections
                const classesRef = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'classes');
                const classesSnap = await getDocs(classesRef);
                const myBookingsPromises = classesSnap.docs.map(async (classDoc) => {
                    const bookingRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'classes', classDoc.id, 'bookings', memberId);
                    const bookingSnap = await getDoc(bookingRef);
                    if (bookingSnap.exists()) {
                        const classData = classDoc.data();
                         if ((classData.dateTime as Timestamp).toDate() > new Date()) {
                            const trainer = trainersList.find(t => t.id === classData.trainerId);
                            return {
                                id: classDoc.id,
                                className: classData.className,
                                trainerName: trainer?.name || 'Unknown',
                                dateTime: (classData.dateTime as Timestamp).toDate()
                            };
                        }
                    }
                    return null;
                });
                
                const myBookedClasses = (await Promise.all(myBookingsPromises)).filter(Boolean) as BookedClass[];
                myBookedClasses.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
                setBookedClasses(myBookedClasses);


                // Fetch Offers
                const now = new Date();
                const offersRef = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'offers');
                const qOffers = query(offersRef, where("endDate", ">=", Timestamp.fromDate(now)));
                const offersSnap = await getDocs(qOffers);
                const offersList = offersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Offer));
                setOffers(offersList);
        
                // Fetch Equipment
                const equipmentRef = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'equipment');
                const equipmentSnap = await getDocs(equipmentRef);
                const equipmentList = equipmentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment));
                setEquipment(equipmentList);
                
                // Fetch Announcements
                const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                const announcementsRef = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'announcements');
                const qAnnouncements = query(announcementsRef, where("createdAt", ">=", Timestamp.fromDate(oneDayAgo)), orderBy("createdAt", "desc"));
                const announcementsSnap = await getDocs(qAnnouncements);
                const announcementsList = announcementsSnap.docs
                    .map(doc => ({ id: doc.id, ...doc.data(), createdAt: (doc.data().createdAt as Timestamp).toDate() } as Announcement))
                    .filter(a => a.audience === 'all' || a.audience === 'members');
                setAnnouncements(announcementsList);

                
                const dob = (memberData.dob as Timestamp)?.toDate();
                if (dob) {
                    if (dob.getDate() === now.getDate() && dob.getMonth() === now.getMonth()) {
                        const gymName = gymSnap.exists() ? gymSnap.data().name : "the gym";
                        setBirthdayMessage(`Happy Birthday! ${memberData.fullName} 🎂💪 Wishing you another year of strength, health, and success—both inside and outside the gym! From ${gymName}`);
                    }
                }
                
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [router, toast]);

    const handleStartChat = async () => {
        const memberUsername = localStorage.getItem('communityUsername');
        const trainerUsername = assignedTrainer?.communityUsername;

        if (!trainerUsername || !memberUsername) {
            toast({ title: "Cannot Chat", description: "Either you or your trainer does not have a community profile to initiate chat.", variant: "destructive" });
            return;
        }
        setIsStartingChat(true);

        const participants = [memberUsername, trainerUsername].sort();
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
    
  const getStatusProps = (status: MembershipStatus['status'] | undefined) => {
    switch (status) {
      case 'Active':
        return { variant: 'default', text: 'Active' };
      case 'Expiring Soon':
        return { variant: 'secondary', text: 'Expiring Soon' };
      case 'Expired':
        return { variant: 'destructive', text: 'Expired' };
      case 'Trial':
        return { variant: 'default', text: 'Trial' };
      case 'No Membership':
          return { variant: 'destructive', text: 'Inactive' };
      default:
        return { variant: 'outline', text: 'Unknown' };
    }
  };
  const statusProps = getStatusProps(membershipStatus?.status);

  if (loading) {
    return (
        <div className="flex min-h-screen items-start justify-center bg-background p-4 sm:p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <div className="w-full max-w-6xl space-y-8">
        
        <BannerDisplay location="dashboard" />
        
        <Card>
          <CardHeader>
            <CardTitle>Community</CardTitle>
            <CardDescription>Connect with other gym members and trainers.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/member/community" passHref>
              <Button className="w-full">
                <UsersIcon className="mr-2 h-4 w-4" />
                Go to Community
              </Button>
            </Link>
          </CardContent>
        </Card>

        {hasNewDietPlan && (
            <Alert>
                <Utensils className="h-4 w-4" />
                <AlertTitle>New Diet Plan!</AlertTitle>
                <AlertDescription className="flex justify-between items-center">
                    <span>Your trainer sent you a new diet plan.</span>
                    <Link href="/dashboard/member/diet-plan" passHref>
                        <Button variant="outline" size="sm">Click to see it</Button>
                    </Link>
                </AlertDescription>
            </Alert>
        )}
        {membershipStatus?.status === 'Expiring Soon' && (
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Your membership is expiring soon!</AlertTitle>
                <AlertDescription className="flex justify-between items-center">
                    <span>You have {membershipStatus.daysLeft} days left. Renew now to avoid interruption.</span>
                    <Link href="/dashboard/member/renew" passHref>
                        <Button variant="outline" size="sm">Renew Now</Button>
                    </Link>
                </AlertDescription>
             </Alert>
        )}
        {announcements.length > 0 && (
             <Alert>
                <Megaphone className="h-4 w-4" />
                <AlertTitle>Announcement</AlertTitle>
                <AlertDescription>
                    {announcements[0].message}
                </AlertDescription>
             </Alert>
        )}
        {birthdayMessage && (
            <Alert className="border-amber-500 text-amber-700 bg-amber-50">
                <Cake className="h-4 w-4 !text-amber-700" />
                <AlertTitle className="text-amber-800 font-bold">Happy Birthday!</AlertTitle>
                <AlertDescription className="text-amber-700">
                   {birthdayMessage}
                </AlertDescription>
            </Alert>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Scan to Check In</CardTitle>
                            <CardDescription>Mark your attendance by scanning the gym's QR code.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href="/dashboard/attendance" passHref>
                                <Button size="lg" className="w-full" disabled={isCheckedIn}>
                                    {isCheckedIn ? 'Checked In for Today' : 'Check In Now'}
                                    {!isCheckedIn && <QrCode className="w-4 h-4 ml-2" />}
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                    {membershipStatus && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Membership Status</CardTitle>
                                <CardDescription>Your current subscription details.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-start justify-between h-full">
                                <div className="flex justify-between items-center w-full mb-4">
                                     <div>
                                        <Badge variant={statusProps.variant}>{statusProps.text}</Badge>
                                        <p className="text-2xl font-bold mt-1">
                                            {membershipStatus.status !== 'Trial' && membershipStatus.daysLeft > 0 ? `${membershipStatus.daysLeft} days left` : membershipStatus.status === 'Trial' ? 'Active Trial' : 'Expired'}
                                        </p>
                                    </div>
                                    <Link href="/dashboard/member/renew" passHref>
                                        <Button>
                                            <CreditCard className="w-4 h-4 mr-2" />
                                            Renew
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
                {assignedTrainer && (
                     <Card>
                        <CardHeader>
                            <CardTitle>Your Assigned Trainer</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-between items-center">
                            <p className="text-lg font-semibold">{assignedTrainer.name}</p>
                            <Button onClick={handleStartChat} disabled={isStartingChat}>
                                {isStartingChat ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <MessageSquare className="mr-2 h-4 w-4"/>}
                                Chat with Trainer
                            </Button>
                        </CardContent>
                    </Card>
                )}
                <Card>
                    <CardHeader>
                        <CardTitle>My Schedule</CardTitle>
                        <CardDescription>Your upcoming booked classes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? <div className="flex items-center justify-center p-4"><Loader2 className="animate-spin" /></div> :
                         bookedClasses.length > 0 ? (
                            <ul className="space-y-4">
                                {bookedClasses.map(cls => (
                                <li key={cls.id} className="flex items-center justify-between rounded-lg border p-4">
                                    <div>
                                        <p className="font-semibold">{cls.className}</p>
                                        <p className="text-sm text-muted-foreground">with {cls.trainerName}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium">{cls.dateTime.toLocaleDateString()}</p>
                                        <p className="text-sm text-muted-foreground">{cls.dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}</p>
                                    </div>
                                </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center py-6">
                                <p className="text-muted-foreground mb-4">You have no upcoming classes.</p>
                                <Link href="/dashboard/member/book-class" passHref>
                                    <Button>
                                        <CalendarCheck className="w-4 h-4 mr-2" />
                                        Book a Class
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Tags/> Active Offers</CardTitle>
                        <CardDescription>Check out the latest promotions available for you.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? <div className="flex items-center justify-center p-4"><Loader2 className="animate-spin" /></div> : (
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
                        {loading ? <div className="flex items-center justify-center p-4"><Loader2 className="animate-spin" /></div> : (
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
        </div>
    </div>
  );
}
