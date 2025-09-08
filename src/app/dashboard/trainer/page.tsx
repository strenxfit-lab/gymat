
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, User, LogOut, Building, Cake, MessageSquare, Wrench, QrCode } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AssignedClass {
  id: string;
  className: string;
  dateTime: Date;
  capacity: number;
  location: string;
  booked: number;
}

interface TrainerInfo {
    name: string;
    branchName: string;
}

export default function TrainerDashboardPage() {
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [trainerInfo, setTrainerInfo] = useState<TrainerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [birthdayMessage, setBirthdayMessage] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchTrainerData = async () => {
      const userDocId = localStorage.getItem('userDocId');
      const activeBranchId = localStorage.getItem('activeBranch');
      const trainerId = localStorage.getItem('trainerId');

      if (!userDocId || !activeBranchId || !trainerId) {
        toast({ title: "Error", description: "Session invalid. Please log in again.", variant: "destructive" });
        router.push('/');
        return;
      }

      try {
        // Fetch trainer and branch name
        const trainerRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers', trainerId);
        const trainerSnap = await getDoc(trainerRef);
        
        const gymRef = doc(db, 'gyms', userDocId);
        const gymSnap = await getDoc(gymRef);

        const branchRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId);
        const branchSnap = await getDoc(branchRef);

        if (trainerSnap.exists() && branchSnap.exists() && gymSnap.exists()) {
            const trainerData = trainerSnap.data();
            setTrainerInfo({
                name: trainerData.fullName,
                branchName: branchSnap.data().name
            });
            
            // Check for birthday
            const dob = (trainerData.dob as Timestamp)?.toDate();
            if (dob) {
                const today = new Date();
                if (dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth()) {
                    const gymName = gymSnap.data().name || "the gym";
                    setBirthdayMessage(`Happy Birthday, Coach! 🏋️‍♂️🎂 Thank you for inspiring us every day. Here’s to another year of strength, motivation, and achievements! From ${gymName}`);
                }
            }

        } else {
             toast({ title: "Error", description: "Could not find trainer details.", variant: "destructive" });
             router.push('/');
             return;
        }

        // Fetch assigned classes
        const classesCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'classes');
        const q = query(classesCollection, where("trainerId", "==", trainerId), where("dateTime", ">=", new Date()));
        const classesSnapshot = await getDocs(q);

        const classesListPromises = classesSnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const bookingsCollection = collection(docSnap.ref, 'bookings');
          const bookingsSnapshot = await getDocs(bookingsCollection);

          return {
            id: docSnap.id,
            className: data.className,
            dateTime: (data.dateTime as Timestamp).toDate(),
            capacity: data.capacity,
            location: data.location,
            booked: bookingsSnapshot.size,
          };
        });
        
        const classesList = await Promise.all(classesListPromises);
        classesList.sort((a,b) => a.dateTime.getTime() - b.dateTime.getTime()); // Sort by date
        setAssignedClasses(classesList);
      } catch (error) {
        console.error("Error fetching trainer data:", error);
        toast({ title: "Error", description: "Failed to fetch dashboard data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchTrainerData();
  }, [router, toast]);
  
  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };


  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
        {birthdayMessage && (
            <Alert className="mb-6 border-amber-500 text-amber-700 bg-amber-50">
                <Cake className="h-4 w-4 !text-amber-700" />
                <AlertTitle className="text-amber-800 font-bold">Happy Birthday!</AlertTitle>
                <AlertDescription className="text-amber-700">
                   {birthdayMessage}
                </AlertDescription>
            </Alert>
        )}
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-bold">Trainer Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {trainerInfo?.name}! Here are your upcoming classes at {trainerInfo?.branchName}.</p>
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
                <User className="h-5 w-5" />
                <span className="sr-only">User Menu</span>
            </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => router.push('/dashboard/trainer/profile')}>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
                <Card>
                    <CardHeader>
                    <CardTitle>My Schedule</CardTitle>
                    <CardDescription>A list of your upcoming assigned classes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Class Name</TableHead>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Bookings</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {assignedClasses.length > 0 ? (
                            assignedClasses.map((cls) => (
                            <TableRow key={cls.id}>
                                <TableCell className="font-medium">{cls.className}</TableCell>
                                <TableCell>{cls.dateTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</TableCell>
                                <TableCell>{cls.location}</TableCell>
                                <TableCell>{cls.booked} / {cls.capacity}</TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                You have no upcoming classes assigned.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-1 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                         <Link href="/dashboard/attendance" passHref>
                           <Button className="w-full justify-start"><QrCode className="mr-2"/> Mark Attendance</Button>
                         </Link>
                         <Link href="/dashboard/gym-profile" passHref>
                            <Button className="w-full justify-start" variant="outline"><Building className="mr-2"/> View Gym Profile</Button>
                         </Link>
                         <Link href="/dashboard/trainer/maintenance" passHref>
                            <Button className="w-full justify-start" variant="outline"><Wrench className="mr-2"/> Maintenance Tasks</Button>
                         </Link>
                         <Link href="/dashboard/trainer/complaints" passHref>
                            <Button className="w-full justify-start" variant="outline"><MessageSquare className="mr-2"/> Complaints</Button>
                         </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}
