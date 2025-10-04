
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, User, Calendar, Dumbbell, HeartPulse, Mail, Phone, Briefcase, Edit } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

type MemberStatus = 'Active' | 'Expired' | 'Pending' | 'Frozen' | 'Stopped';

interface MemberDetails {
  fullName: string;
  dob: string;
  gender: string;
  phone: string;
  email?: string;
  photoUrl?: string;
  joiningDate: string;
  membershipType: string;
  startDate: string;
  endDate: string;
  status: MemberStatus;
  plan?: string;
  assignedTrainerName?: string;
  height?: string;
  weight?: string;
  medicalConditions?: string;
  fitnessGoal?: string;
}

const DetailItem = ({ label, value, icon }: { label: string, value: string | undefined, icon?: React.ReactNode }) => (
    <div className="flex flex-col space-y-1">
        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">{icon}{label}</p>
        <p className="font-semibold">{value || 'N/A'}</p>
    </div>
);

const getStatusVariant = (status: MemberStatus) => {
    switch (status) {
        case 'Active': return 'default';
        case 'Expired': return 'destructive';
        case 'Pending': return 'secondary';
        case 'Frozen':
        case 'Stopped':
             return 'destructive';
        default: return 'outline';
    }
}

export default function MemberProfilePage() {
  const [member, setMember] = useState<MemberDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    const memberId = localStorage.getItem('memberId');

    if (!userDocId || !activeBranchId || !memberId) {
      toast({ title: 'Error', description: 'Session data not found.', variant: 'destructive' });
      router.push('/dashboard/member');
      return;
    }

    const fetchMemberData = async () => {
      try {
        const memberRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', memberId);
        const memberSnap = await getDoc(memberRef);

        if (!memberSnap.exists()) {
          toast({ title: 'Error', description: 'Member not found.', variant: 'destructive' });
          router.push('/dashboard/member');
          return;
        }

        const data = memberSnap.data();
        const now = new Date();
        const endDate = (data.endDate as Timestamp)?.toDate();
        
        let status: MemberStatus = data.status || 'Pending';
        if (status === 'Active' && endDate && endDate < now) {
            status = 'Expired';
        }
        
        let assignedTrainerName = 'N/A';
        if (data.assignedTrainer) {
            const trainerRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers', data.assignedTrainer);
            const trainerSnap = await getDoc(trainerRef);
            if (trainerSnap.exists()) {
                assignedTrainerName = trainerSnap.data().fullName;
            }
        }

        setMember({
          fullName: data.fullName,
          dob: (data.dob as Timestamp)?.toDate().toLocaleDateString() || 'N/A',
          gender: data.gender,
          phone: data.phone,
          email: data.email,
          photoUrl: data.photoUrl,
          joiningDate: (data.createdAt as Timestamp)?.toDate().toLocaleDateString(),
          membershipType: data.membershipType,
          startDate: (data.startDate as Timestamp)?.toDate().toLocaleDateString(),
          endDate: endDate?.toLocaleDateString() || 'N/A',
          status: status,
          plan: data.plan,
          assignedTrainerName: assignedTrainerName,
          height: data.height,
          weight: data.weight,
          medicalConditions: data.medicalConditions,
          fitnessGoal: data.fitnessGoal,
        });
        
      } catch (error) {
        console.error("Error fetching member data:", error);
        toast({ title: 'Error', description: 'Failed to fetch member details.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchMemberData();
  }, [router, toast]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!member) {
    return <div className="flex min-h-screen items-center justify-center bg-background">Member not found.</div>;
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 rounded-full border-2 border-primary">
                    {member.photoUrl ? (
                        <Image src={member.photoUrl} alt="Profile" layout="fill" className="rounded-full object-cover" />
                    ) : (
                        <div className="h-full w-full flex items-center justify-center rounded-full bg-muted">
                            <User className="h-8 w-8 text-muted-foreground" />
                        </div>
                    )}
                </div>
                <div>
                     <h1 className="text-3xl font-bold">{member.fullName}</h1>
                     <p className="text-muted-foreground">My Profile</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Link href="/dashboard/member" passHref>
                    <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Dashboard</Button>
                </Link>
                 <Link href="/dashboard/member/profile/edit" passHref>
                    <Button><Edit className="mr-2 h-4 w-4"/>Edit Profile</Button>
                </Link>
            </div>
        </div>
        
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User /> Personal Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 grid grid-cols-2 gap-4">
                    <DetailItem label="Gender" value={member.gender} />
                    <DetailItem label="Date of Birth" value={member.dob} />
                    <DetailItem label="Phone" value={member.phone} icon={<Phone />} />
                    <DetailItem label="Email" value={member.email} icon={<Mail />} />
                    <DetailItem label="Joining Date" value={member.joiningDate} icon={<Calendar />} />
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Dumbbell /> Membership</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 grid grid-cols-2 gap-4">
                    <DetailItem label="Plan Type" value={member.membershipType} />
                    <DetailItem label="Package" value={member.plan} />
                    <DetailItem label="Start Date" value={member.startDate} />
                    <DetailItem label="End Date" value={member.endDate} />
                    <DetailItem label="Assigned Trainer" value={member.assignedTrainerName} icon={<Briefcase />} />
                    <div>
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">Status</p>
                        <Badge variant={getStatusVariant(member.status)} className="mt-1">{member.status}</Badge>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><HeartPulse /> Health & Fitness</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 grid grid-cols-2 gap-4">
                    <DetailItem label="Height" value={member.height ? `${member.height} cm` : undefined} />
                    <DetailItem label="Weight" value={member.weight ? `${member.weight} kg` : undefined} />
                    <div className="col-span-2"><DetailItem label="Fitness Goal" value={member.fitnessGoal} /></div>
                    <div className="col-span-2"><DetailItem label="Medical Conditions" value={member.medicalConditions} /></div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
