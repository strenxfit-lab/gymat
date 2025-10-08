"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, getDocs, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, User, Calendar, DollarSign, Weight, BarChart2, Edit, KeyRound, Dumbbell, HeartPulse, ShieldCheck, Mail, Phone, Briefcase, Fingerprint, Trash } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


type MemberStatus = 'Active' | 'Expired' | 'Pending' | 'Frozen' | 'Stopped';

interface MemberDetails {
  // Personal Info
  fullName: string;
  dob: string;
  gender: string;
  phone: string;
  email?: string;
  joiningDate: string;
  loginId?: string;
  password?: string;
  passwordChanged: boolean;

  // Membership Details
  membershipType: string;
  startDate: string;
  endDate: string;
  status: MemberStatus;
  plan?: string;
  assignedTrainerName?: string;
  
  // Health & Fitness
  height?: string;
  weight?: string;
  medicalConditions?: string;
  fitnessGoal?: string;

  // KYC
  kyc?: KycDetails;
}

interface KycDetails {
    idType: 'aadhar' | 'pan';
    idNumber: string;
    aadharFrontUrl?: string;
    aadharBackUrl?: string;
    panUrl?: string;
    selfieUrl?: string;
    notes?: string;
}

interface Payment {
    id: string;
    amountPaid: number;
    paymentDate: string;
    paymentMode: string;
    status: 'Paid' | 'Pending' | 'Overdue';
    nextDueDate?: string;
    balanceDue: number;
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
  const params = useParams();
  const memberId = params.memberId as string;
  const [member, setMember] = useState<MemberDetails | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');

    if (!userDocId || !activeBranchId || !memberId) {
      toast({ title: 'Error', description: 'Session, branch, or member ID not found.', variant: 'destructive' });
      router.push('/dashboard/owner/members');
      return;
    }

    const fetchMemberData = async () => {
      try {
        const memberRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', memberId);
        const memberSnap = await getDoc(memberRef);

        if (!memberSnap.exists()) {
          toast({ title: 'Error', description: 'Member not found.', variant: 'destructive' });
          router.push('/dashboard/owner/members');
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
        
        // Fetch KYC data
        let kycDetails: KycDetails | undefined = undefined;
        const kycCollection = collection(memberRef, 'kyc');
        const kycSnap = await getDocs(kycCollection);
        if (!kycSnap.empty) {
            kycDetails = kycSnap.docs[0].data() as KycDetails;
        }


        setMember({
          fullName: data.fullName,
          dob: (data.dob as Timestamp)?.toDate().toLocaleDateString() || 'N/A',
          gender: data.gender,
          phone: data.phone,
          email: data.email,
          joiningDate: (data.createdAt as Timestamp)?.toDate().toLocaleDateString(),
          loginId: data.loginId,
          password: data.password,
          passwordChanged: data.passwordChanged || false,
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
          kyc: kycDetails,
        });
        
        const paymentsRef = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', memberId, 'payments');
        const paymentsSnap = await getDocs(paymentsRef);
        const paymentsList = paymentsSnap.docs.map(doc => {
            const pData = doc.data();
            const nextDueDate = (pData.nextDueDate as Timestamp)?.toDate();
            const paymentStatus = () => {
                if(pData.balanceDue > 0) return 'Pending';
                if(nextDueDate && nextDueDate < now) return 'Overdue';
                return 'Paid';
            }

            return {
                id: doc.id,
                amountPaid: pData.amountPaid,
                paymentDate: (pData.paymentDate as Timestamp).toDate().toLocaleDateString(),
                paymentMode: pData.paymentMode,
                status: paymentStatus(),
                nextDueDate: nextDueDate?.toLocaleDateString(),
                balanceDue: pData.balanceDue
            }
        });
        setPayments(paymentsList);

      } catch (error) {
        console.error("Error fetching member data:", error);
        toast({ title: 'Error', description: 'Failed to fetch member details.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchMemberData();
  }, [memberId, router, toast]);

  const handleDeleteProfile = async () => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');

    if (!userDocId || !activeBranchId || !memberId) {
      toast({ title: 'Error', description: 'Session data is missing.', variant: 'destructive' });
      return;
    }

    try {
        const memberRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', memberId);
        await deleteDoc(memberRef);
        toast({ title: 'Success', description: `${member?.fullName}'s profile has been deleted.` });
        router.push('/dashboard/owner/members');
    } catch (error) {
        console.error('Error deleting member profile:', error);
        toast({ title: 'Error', description: 'Could not delete the profile.', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!member) {
    return <div className="flex min-h-screen items-center justify-center bg-background">Member not found.</div>;
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
        <div className="flex items-center justify-between">
            <div>
                 <h1 className="text-3xl font-bold">{member.fullName}</h1>
                 <p className="text-muted-foreground">Member Profile</p>
            </div>
            <div className="flex items-center gap-2">
                <Link href="/dashboard/owner/members" passHref>
                    <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Members</Button>
                </Link>
                <Link href={`/dashboard/owner/members/${memberId}/edit`} passHref>
                    <Button><Edit className="mr-2 h-4 w-4"/>Edit Profile</Button>
                </Link>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <Button variant="destructive"><Trash className="mr-2 h-4 w-4"/>Delete Profile</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete this member's profile and all associated data. They will not be able to log in again.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteProfile}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
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
                    <DetailItem label="Login ID" value={member.loginId} icon={<KeyRound />} />
                    <DetailItem label="Password" value={member.passwordChanged ? "Password Changed" : member.password} icon={<KeyRound />} />
                </CardContent>
            </Card>
            
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

        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Fingerprint /> KYC Details</CardTitle>
                </CardHeader>
                <CardContent>
                    {member.kyc ? (
                        <div className="space-y-4">
                             <DetailItem label="ID Type" value={member.kyc.idType.toUpperCase()} />
                             <DetailItem label="ID Number" value={member.kyc.idNumber} />
                             <div className="grid grid-cols-2 gap-4 pt-2">
                                {member.kyc.aadharFrontUrl && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Aadhar Front</p>
                                        <Image src={member.kyc.aadharFrontUrl} alt="Aadhar Front" width={200} height={120} className="rounded-md border"/>
                                    </div>
                                )}
                                 {member.kyc.aadharBackUrl && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Aadhar Back</p>
                                        <Image src={member.kyc.aadharBackUrl} alt="Aadhar Back" width={200} height={120} className="rounded-md border"/>
                                    </div>
                                )}
                                 {member.kyc.panUrl && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">PAN Card</p>
                                        <Image src={member.kyc.panUrl} alt="PAN Card" width={200} height={120} className="rounded-md border"/>
                                    </div>
                                )}
                                 {member.kyc.selfieUrl && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Selfie</p>
                                        <Image src={member.kyc.selfieUrl} alt="Selfie" width={200} height={120} className="rounded-md border"/>
                                    </div>
                                )}
                             </div>
                              {member.kyc.notes && <div className="pt-2"><DetailItem label="Notes" value={member.kyc.notes}/></div>}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">No KYC details found for this member.</p>
                    )}
                </CardContent>
            </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><DollarSign /> Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Next Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length > 0 ? payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.paymentDate}</TableCell>
                      <TableCell>₹{p.amountPaid.toLocaleString()}</TableCell>
                      <TableCell>{p.paymentMode}</TableCell>
                      <TableCell>{p.nextDueDate || 'N/A'}</TableCell>
                      <TableCell><Badge variant={p.status === 'Paid' ? 'default' : 'destructive'}>{p.status}</Badge></TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={5} className="text-center h-24">No payment history found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
