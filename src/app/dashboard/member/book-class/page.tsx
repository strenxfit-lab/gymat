
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, Timestamp, doc, addDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Calendar, Clock, Users, User, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface ClassInfo {
  id: string;
  className: string;
  trainerName: string;
  dateTime: Date;
  capacity: number;
  location: string;
  booked: number;
  isBookedByMe: boolean;
  isFull: boolean;
}

interface Trainer {
  id: string;
  name: string;
}

export default function BookClassPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingStatus, setBookingStatus] = useState<Record<string, 'booking' | 'cancelling' | null>>({});
  const router = useRouter();
  const { toast } = useToast();

  const fetchClasses = async () => {
    setLoading(true);
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    const memberId = localStorage.getItem('memberId');

    if (!userDocId || !activeBranchId || !memberId) {
      toast({ title: "Error", description: "Session invalid. Please log in again.", variant: "destructive" });
      router.push('/');
      return;
    }

    try {
      const trainersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers');
      const trainersSnapshot = await getDocs(trainersCollection);
      const trainersList = trainersSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().fullName }));

      const classesCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'classes');
      const q = collection(classesCollection);
      const classesSnapshot = await getDocs(q);

      const now = new Date();
      const classesListPromises = classesSnapshot.docs
        .filter(docSnap => (docSnap.data().dateTime as Timestamp).toDate() > now)
        .map(async (docSnap) => {
          const data = docSnap.data();
          const trainer = trainersList.find(t => t.id === data.trainerId);
          
          const bookingsCollection = collection(docSnap.ref, 'bookings');
          const bookingsSnapshot = await getDocs(bookingsCollection);
          const bookedCount = bookingsSnapshot.size;
          
          const memberBookingDoc = doc(bookingsCollection, memberId);
          const memberBookingSnap = await getDoc(memberBookingDoc);

          return {
            id: docSnap.id,
            className: data.className,
            trainerName: trainer?.name || 'Unknown',
            dateTime: (data.dateTime as Timestamp).toDate(),
            capacity: data.capacity,
            location: data.location,
            booked: bookedCount,
            isBookedByMe: memberBookingSnap.exists(),
            isFull: bookedCount >= data.capacity,
          };
      });

      const classesList = await Promise.all(classesListPromises);
      classesList.sort((a,b) => a.dateTime.getTime() - b.dateTime.getTime()); // Sort by date
      setClasses(classesList);
    } catch (error) {
      console.error("Error fetching classes:", error);
      toast({ title: "Error", description: "Failed to fetch classes.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleBooking = async (classId: string, isBooked: boolean) => {
    setBookingStatus(prev => ({...prev, [classId]: isBooked ? 'cancelling' : 'booking'}));
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    const memberId = localStorage.getItem('memberId');

    if (!userDocId || !activeBranchId || !memberId) {
        toast({ title: 'Error', description: 'Session expired.', variant: 'destructive'});
        setBookingStatus(prev => ({...prev, [classId]: null}));
        return;
    }
    
    try {
        const bookingRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'classes', classId, 'bookings', memberId);
        
        if (isBooked) { // Cancel booking
            await doc(bookingRef).delete();
            toast({ title: 'Cancellation Successful', description: 'Your spot has been cancelled.'});
        } else { // Create booking
            await setDoc(bookingRef, { bookedAt: Timestamp.now() });
            toast({ title: 'Booking Confirmed!', description: 'Your spot is reserved.'});
        }
        await fetchClasses(); // Refresh list
    } catch (error) {
        console.error("Booking error:", error);
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'destructive'});
    } finally {
        setBookingStatus(prev => ({...prev, [classId]: null}));
    }
  }


  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Book a Class</h1>
        <Link href="/dashboard/member" passHref>
            <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.length > 0 ? (
          classes.map((cls) => (
            <Card key={cls.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{cls.className}</CardTitle>
                <CardDescription>With {cls.trainerName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 flex-grow">
                <div className="flex items-center text-sm text-muted-foreground"><Calendar className="mr-2 h-4 w-4" /> {cls.dateTime.toLocaleDateString()}</div>
                <div className="flex items-center text-sm text-muted-foreground"><Clock className="mr-2 h-4 w-4" /> {cls.dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="flex items-center text-sm text-muted-foreground"><User className="mr-2 h-4 w-4" /> {cls.location}</div>
                <div className="flex items-center text-sm text-muted-foreground"><Users className="mr-2 h-4 w-4" /> {cls.booked} / {cls.capacity} spots filled</div>
              </CardContent>
              <CardFooter>
                {cls.isBookedByMe ? (
                     <Button 
                        variant="destructive" 
                        className="w-full" 
                        onClick={() => handleBooking(cls.id, true)}
                        disabled={bookingStatus[cls.id] === 'cancelling'}
                     >
                        {bookingStatus[cls.id] === 'cancelling' ? <Loader2 className="animate-spin" /> : <><XCircle className="mr-2" /> Cancel Booking</>}
                    </Button>
                ) : (
                    <Button 
                        className="w-full" 
                        onClick={() => handleBooking(cls.id, false)}
                        disabled={cls.isFull || bookingStatus[cls.id] === 'booking'}
                    >
                        {bookingStatus[cls.id] === 'booking' ? <Loader2 className="animate-spin" /> : (cls.isFull ? 'Class Full' : <><CheckCircle className="mr-2" />Book Now</>)}
                    </Button>
                )}
              </CardFooter>
            </Card>
          ))
        ) : (
          <p className="col-span-full text-center text-muted-foreground py-10">No upcoming classes available to book.</p>
        )}
      </div>
    </div>
  );
}
