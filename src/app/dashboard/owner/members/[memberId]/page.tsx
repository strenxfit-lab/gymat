
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, User, Calendar, DollarSign, Weight, BarChart2, Edit, KeyRound } from 'lucide-react';
import Link from 'next/link';

interface MemberDetails {
  // Personal Info
  fullName: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  address?: string;
  emergencyContact?: string;
  joiningDate: string;
  loginId?: string;
  password?: string;

  // Membership Details
  membershipType: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Expired' | 'Pending' | 'Frozen';
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

const DetailItem = ({ label, value }: { label: string, value: string | undefined }) => (
    <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value || 'N/A'}</p>
    </div>
);

export default function MemberProfilePage({ params }: { params: { memberId: string } }) {
  const { memberId } = params;
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
        // Fetch member details
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
        const memberStatus = () => {
            if (!endDate) return 'Pending';
            if (endDate >= now) return 'Active';
            return 'Expired';
        }

        setMember({
          fullName: data.fullName,
          dob: (data.dob as Timestamp)?.toDate().toLocaleDateString() || 'N/A',
          gender: data.gender,
          phone: data.phone,
          email: data.email,
          address: data.address,
          emergencyContact: data.emergencyContact,
          joiningDate: (data.createdAt as Timestamp)?.toDate().toLocaleDateString(),
          loginId: data.loginId,
          password: data.password,
          membershipType: data.membershipType,
          startDate: (data.startDate as Timestamp)?.toDate().toLocaleDateString(),
          endDate: endDate?.toLocaleDateString() || 'N/A',
          status: memberStatus(),
        });
        
        // Fetch payment history
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

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!member) {
    return <div className="flex min-h-screen items-center justify-center bg-background">Member not found.</div>;
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
        <div className="flex items-center justify-between">
            <Link href="/dashboard/owner/members" passHref>
                <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Members</Button>
            </Link>
            <Button><Edit className="mr-2 h-4 w-4"/>Edit Profile</Button>
        </div>
        
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User /> Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <DetailItem label="Full Name" value={member.fullName} />
                    <DetailItem label="Date of Birth" value={member.dob} />
                    <DetailItem label="Gender" value={member.gender} />
                    <DetailItem label="Mobile Number" value={member.phone} />
                    <DetailItem label="Email Address" value={member.email} />
                    <DetailItem label="Residential Address" value={member.address} />
                    <DetailItem label="Emergency Contact" value={member.emergencyContact} />
                    <DetailItem label="Joining Date" value={member.joiningDate} />
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><KeyRound /> Login Credentials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <DetailItem label="Login ID" value={member.loginId} />
                    <DetailItem label="Password" value={member.password} />
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Calendar /> Membership Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <DetailItem label="Plan Type" value={member.membershipType} />
                    <DetailItem label="Start Date" value={member.startDate} />
                    <DetailItem label="End Date" value={member.endDate} />
                    <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant={member.status === 'Active' ? 'default' : 'destructive'}>{member.status}</Badge>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><DollarSign /> Fees / Payment History</CardTitle>
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

           <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart2 /> Attendance History</CardTitle>
              <CardDescription>This feature is coming soon.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center text-muted-foreground py-10">
                    <p>No attendance data available yet.</p>
                </div>
            </CardContent>
          </Card>
          
           <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Weight /> Workout Progress</CardTitle>
              <CardDescription>This feature is coming soon.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center text-muted-foreground py-10">
                    <p>No workout progress data available yet.</p>
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
