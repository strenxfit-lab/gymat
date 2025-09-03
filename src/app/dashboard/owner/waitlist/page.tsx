
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, collectionGroup, getDocs, query, where, Timestamp, orderBy, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Clock, Phone, User, Users } from 'lucide-react';

interface WaitlistedMember {
  id: string;
  fullName: string;
  phone: string;
  joinedAt: Date;
}

interface WaitlistedClass {
  id: string;
  className: string;
  dateTime: Date;
  trainerName: string;
  waitlist: WaitlistedMember[];
}

interface Trainer {
  id: string;
  name: string;
}

export default function WaitlistManagementPage() {
  const [waitlistedClasses, setWaitlistedClasses] = useState<WaitlistedClass[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchWaitlists = async () => {
      setLoading(true);
      const userDocId = localStorage.getItem('userDocId');
      const activeBranchId = localStorage.getItem('activeBranch');

      if (!userDocId || !activeBranchId) {
        toast({ title: "Error", description: "Branch not selected.", variant: "destructive" });
        setLoading(false);
        return;
      }
      
      try {
        const trainersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers');
        const trainersSnapshot = await getDocs(trainersCollection);
        const trainersList = trainersSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().fullName }));

        const classesCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'classes');
        const classesSnapshot = await getDocs(classesCollection);

        const allClasses = classesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        let waitlists: WaitlistedClass[] = [];

        for (const cls of allClasses) {
            const waitlistCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'classes', cls.id, 'waitlist');
            const waitlistQuery = query(waitlistCollection, orderBy('joinedAt', 'asc'));
            const waitlistSnapshot = await getDocs(waitlistQuery);

            if (!waitlistSnapshot.empty) {
                const waitlistedMembersPromises = waitlistSnapshot.docs.map(async (waitlistDoc) => {
                    const memberId = waitlistDoc.id;
                    const memberRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'members', memberId);
                    const memberSnap = await getDoc(memberRef);
                    if (memberSnap.exists()) {
                        const memberData = memberSnap.data();
                        return {
                            id: memberId,
                            fullName: memberData.fullName,
                            phone: memberData.phone,
                            joinedAt: (waitlistDoc.data().joinedAt as Timestamp).toDate(),
                        };
                    }
                    return null;
                });

                const waitlistedMembers = (await Promise.all(waitlistedMembersPromises)).filter(m => m !== null) as WaitlistedMember[];
                
                const trainer = trainersList.find(t => t.id === cls.trainerId);

                waitlists.push({
                    id: cls.id,
                    className: cls.className,
                    dateTime: (cls.dateTime as Timestamp).toDate(),
                    trainerName: trainer?.name || 'Unknown',
                    waitlist: waitlistedMembers,
                });
            }
        }
        
        waitlists.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
        setWaitlistedClasses(waitlists);

      } catch (error) {
        console.error("Error fetching waitlists:", error);
        toast({ title: "Error", description: "Failed to fetch waitlist data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchWaitlists();
  }, [toast]);


  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
        <div className="flex items-center justify-between mb-6">
            <div>
            <h1 className="text-3xl font-bold">Waitlist Management</h1>
            <p className="text-muted-foreground">Monitor and manage waitlists for full classes.</p>
            </div>
            <Link href="/dashboard/owner" passHref>
                <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Dashboard</Button>
            </Link>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Classes with Active Waitlists</CardTitle>
                <CardDescription>Members in this list are waiting for a spot to open up.</CardDescription>
            </CardHeader>
            <CardContent>
                {waitlistedClasses.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                        {waitlistedClasses.map((cls) => (
                            <AccordionItem value={cls.id} key={cls.id}>
                                <AccordionTrigger>
                                    <div className="flex justify-between items-center w-full pr-4">
                                        <div className="text-left">
                                            <p className="font-semibold">{cls.className}</p>
                                            <p className="text-sm text-muted-foreground">{cls.dateTime.toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4"/>
                                            <span className="font-bold">{cls.waitlist.length}</span>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <ul className="space-y-4 pt-2">
                                        {cls.waitlist.map((member, index) => (
                                            <li key={member.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                                <div className="flex items-center gap-4">
                                                    <span className="font-bold text-lg text-primary">{index + 1}</span>
                                                    <div>
                                                        <p className="font-medium flex items-center gap-2"><User className="h-4 w-4"/>{member.fullName}</p>
                                                        <p className="text-sm text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4"/>{member.phone}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                   <Button size="sm">Promote</Button>
                                                   <Button size="sm" variant="ghost">Remove</Button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <div className="text-center text-muted-foreground py-16">
                        <p>No classes currently have a waitlist.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
