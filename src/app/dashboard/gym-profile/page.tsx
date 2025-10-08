
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Building, User, Phone, Mail, MapPin, Wallet, CalendarCheck } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface GymDetails {
  gymName: string;
  gymLogo?: string;
  gymAddress?: string;
  cityStatePin?: string;
  contactNumber?: string;
  gymEmail?: string;
  ownerName?: string;
  plans?: { name: string; price: string }[];
}

const DetailItem = ({ label, value, icon, className }: { label: string; value?: string; icon: React.ReactNode, className?: string }) => (
  <div className={cn("flex items-start gap-3", className)}>
    <div className="text-primary">{icon}</div>
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-semibold">{value || 'N/A'}</p>
    </div>
  </div>
);

export default function GymProfilePage() {
  const [gymDetails, setGymDetails] = useState<GymDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role);
    const userDocId = localStorage.getItem('userDocId');

    if (!userDocId) {
      toast({ title: 'Error', description: 'Session data not found.', variant: 'destructive' });
      router.push('/');
      return;
    }

    const fetchGymData = async () => {
      try {
        const detailsRef = doc(db, 'gyms', userDocId, 'details', 'onboarding');
        const detailsSnap = await getDoc(detailsRef);

        if (detailsSnap.exists()) {
          const data = detailsSnap.data();
          setGymDetails({
            gymName: data.gymName,
            gymLogo: data.gymLogo,
            gymAddress: data.gymAddress,
            cityStatePin: data.cityStatePin,
            contactNumber: data.contactNumber,
            gymEmail: data.gymEmail,
            ownerName: data.ownerName,
            plans: data.plans || [],
          });
        } else {
            // Fallback to main gym doc if onboarding details are missing
            const gymRef = doc(db, 'gyms', userDocId);
            const gymSnap = await getDoc(gymRef);
            if (gymSnap.exists()) {
                 const data = gymSnap.data();
                 setGymDetails({
                    gymName: data.name,
                    contactNumber: data.contactNumber,
                    gymEmail: data.email,
                    gymAddress: data.location
                 });
            } else {
                toast({ title: 'Error', description: 'Gym details not found.', variant: 'destructive' });
            }
        }
      } catch (error) {
        console.error("Error fetching gym data:", error);
        toast({ title: 'Error', description: 'Failed to fetch gym details.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchGymData();
  }, [router, toast]);
  
  const getBackLink = () => {
      if (userRole === 'member') return '/dashboard/member';
      if (userRole === 'trainer') return '/dashboard/trainer';
      return '/';
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!gymDetails) {
    return <div className="flex min-h-screen items-center justify-center bg-background">Gym details not found.</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="text-center">
            {gymDetails.gymLogo && (
                <div className="mx-auto h-24 w-24 relative mb-4">
                    <Image src={gymDetails.gymLogo} alt="Gym Logo" layout="fill" className="rounded-full object-cover border-2 border-primary" />
                </div>
            )}
          <CardTitle className="text-4xl font-bold">{gymDetails.gymName}</CardTitle>
          <CardDescription>Your hub for fitness and well-being.</CardDescription>
        </CardHeader>
        <CardContent className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <h3 className="font-semibold text-lg border-b pb-2">Contact Information</h3>
                    <DetailItem label="Address" value={`${gymDetails.gymAddress || ''} ${gymDetails.cityStatePin || ''}`} icon={<MapPin/>} />
                    <DetailItem label="Phone" value={gymDetails.contactNumber} icon={<Phone/>} />
                    <DetailItem label="Email" value={gymDetails.gymEmail} icon={<Mail/>} />
                    <DetailItem label="Owner" value={gymDetails.ownerName} icon={<User/>} />
                </div>
                <div className="space-y-6">
                    <h3 className="font-semibold text-lg border-b pb-2">Membership Plans</h3>
                    {gymDetails.plans && gymDetails.plans.length > 0 ? (
                        <div className="space-y-4">
                            {gymDetails.plans.map((plan, index) => (
                                <div key={index} className="flex justify-between items-center bg-muted/50 p-3 rounded-md">
                                    <p className="font-medium">{plan.name}</p>
                                    <p className="font-bold text-primary">₹{plan.price}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No specific plans listed. Contact us for details!</p>
                    )}
                </div>
            </div>
        </CardContent>
        <CardFooter className="flex-col gap-4 pt-6">
            {userRole === 'member' && (
                <Link href="/dashboard/member/book-class" passHref>
                    <Button size="lg"><CalendarCheck className="mr-2"/>Join Now</Button>
                </Link>
            )}
             <Link href={getBackLink()} passHref>
                <Button variant="ghost" className="text-muted-foreground">
                    <ArrowLeft className="mr-2 h-4 w-4"/>
                    Back to Dashboard
                </Button>
            </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
