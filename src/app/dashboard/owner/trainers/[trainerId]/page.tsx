
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, User, Briefcase, Wallet, Calendar, Mail, Phone, Clock, Edit, Star, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

interface TrainerDetails {
  fullName: string;
  gender: string;
  dob: string;
  phone: string;
  email: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  designation: string;
  specialization?: string;
  experience?: string;
  joiningDate: string;
  certifications?: string;
  salaryType: string;
  salaryRate: string;
  bankDetails?: string;
  averageRating?: number;
  ratingCount?: number;
  password?: string;
  passwordChanged: boolean;
}

const DetailItem = ({ label, value }: { label: string, value: string | undefined }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="font-semibold">{value || 'N/A'}</p>
    </div>
);

export default function TrainerProfilePage() {
  const params = useParams();
  const trainerId = params.trainerId as string;
  const [trainer, setTrainer] = useState<TrainerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');

    if (!userDocId || !activeBranchId || !trainerId) {
      toast({ title: 'Error', description: 'Session, branch, or trainer ID not found.', variant: 'destructive' });
      router.push('/dashboard/owner/members');
      return;
    }

    const fetchTrainerData = async () => {
      try {
        const trainerRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers', trainerId);
        const trainerSnap = await getDoc(trainerRef);

        if (!trainerSnap.exists()) {
          toast({ title: 'Error', description: 'Trainer not found.', variant: 'destructive' });
          router.push('/dashboard/owner/members');
          return;
        }

        const data = trainerSnap.data();
        setTrainer({
            fullName: data.fullName,
            gender: data.gender,
            dob: (data.dob as Timestamp)?.toDate().toLocaleDateString(),
            phone: data.phone,
            email: data.email,
            address: data.address,
            emergencyContactName: data.emergencyContactName,
            emergencyContactNumber: data.emergencyContactNumber,
            designation: data.designation,
            specialization: data.specialization,
            experience: data.experience ? `${data.experience} years` : undefined,
            joiningDate: (data.joiningDate as Timestamp)?.toDate().toLocaleDateString(),
            certifications: data.certifications,
            salaryType: data.salaryType,
            salaryRate: data.salaryRate,
            bankDetails: data.bankDetails,
            averageRating: data.ratings?.averageRating,
            ratingCount: data.ratings?.ratingCount,
            password: data.password,
            passwordChanged: data.passwordChanged || false,
        });
        
      } catch (error) {
        console.error("Error fetching trainer data:", error);
        toast({ title: 'Error', description: 'Failed to fetch trainer details.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchTrainerData();
  }, [trainerId, router, toast]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!trainer) {
    return <div className="flex min-h-screen items-center justify-center bg-background">Trainer not found.</div>;
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
        <div className="flex items-center justify-between">
            <div>
                 <h1 className="text-3xl font-bold">{trainer.fullName}</h1>
                 <p className="text-muted-foreground">Trainer Profile</p>
            </div>
            <div className="flex items-center gap-2">
                <Link href="/dashboard/owner/members" passHref>
                    <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Lists</Button>
                </Link>
                <Link href={`/dashboard/owner/trainers/${trainerId}/edit`} passHref>
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
                <CardContent className="space-y-4">
                    <DetailItem label="Gender" value={trainer.gender} />
                    <DetailItem label="Date of Birth" value={trainer.dob} />
                    <DetailItem label="Phone" value={trainer.phone} />
                    <DetailItem label="Email" value={trainer.email} />
                    <DetailItem label="Address" value={trainer.address} />
                    <DetailItem label="Login ID (Phone No.)" value={trainer.phone} />
                    <DetailItem label="Password" value={trainer.passwordChanged ? "Password Changed" : trainer.password} />
                    <Separator/>
                    <DetailItem label="Emergency Contact Name" value={trainer.emergencyContactName} />
                    <DetailItem label="Emergency Contact Number" value={trainer.emergencyContactNumber} />
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Briefcase /> Professional Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <DetailItem label="Designation" value={trainer.designation} />
                    <DetailItem label="Specialization" value={trainer.specialization} />
                    <DetailItem label="Experience" value={trainer.experience} />
                    <DetailItem label="Joining Date" value={trainer.joiningDate} />
                    <DetailItem label="Shift" value={trainer.shiftTiming} />
                     <div>
                        <p className="text-sm font-medium text-muted-foreground">Rating</p>
                        <div className="flex items-center gap-2 font-semibold">
                            {trainer.averageRating ? (
                                <>
                                    <Star className="h-5 w-5 text-yellow-400 fill-yellow-400"/>
                                    <span>{trainer.averageRating.toFixed(1)} / 5</span>
                                    <span className="text-xs text-muted-foreground">({trainer.ratingCount} ratings)</span>
                                </>
                            ) : (
                                <span>No ratings yet</span>
                            )}
                        </div>
                    </div>
                    <div className="col-span-2"><DetailItem label="Certifications" value={trainer.certifications} /></div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Wallet /> Financial Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <DetailItem label="Salary Type" value={trainer.salaryType} />
                    <DetailItem label="Salary / Pay Rate" value={`₹${trainer.salaryRate}`} />
                    <div className="col-span-2"><DetailItem label="Bank Details" value={trainer.bankDetails} /></div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
