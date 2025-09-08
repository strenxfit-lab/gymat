
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QrReader } from '@leecheuk/react-qr-reader';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, QrCode, VideoOff } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function AttendancePage() {
  const [loading, setLoading] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        setHasCameraPermission(true);
        stream.getTracks().forEach(track => track.stop()); // Stop using the camera immediately
      })
      .catch(err => {
        console.error("Camera permission error:", err);
        setHasCameraPermission(false);
      });
  }, []);

  const handleScanResult = async (result: any, error: any) => {
    if (!!result && !loading) {
      setLoading(true);
      const qrData = result?.text;

      try {
        const { gymId, branchId } = JSON.parse(qrData);
        const storedGymId = localStorage.getItem('userDocId');

        if (!gymId || !branchId || gymId !== storedGymId) {
          toast({ title: "Invalid QR Code", description: "This QR code is not valid for this gym.", variant: "destructive" });
          setLoading(false);
          return;
        }

        const userRole = localStorage.getItem('userRole');
        const userId = localStorage.getItem(userRole === 'member' ? 'memberId' : 'trainerId');
        const userName = localStorage.getItem('userName');
        const userPhone = localStorage.getItem('userPhone');

        if (!userRole || !userId) {
          throw new Error("User session not found.");
        }
        
        // Duplicate check
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const attendanceRef = collection(db, "attendance");
        const q = query(
            attendanceRef,
            where("gymId", "==", gymId),
            where("branchId", "==", branchId),
            where("userId", "==", userId),
            where("scanTime", ">=", tenMinutesAgo),
            orderBy("scanTime", "desc"),
            limit(1)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            toast({ title: "Already Checked In", description: "You have already marked your attendance recently.", variant: "default" });
            router.back();
            return;
        }

        // Add new attendance record
        await addDoc(attendanceRef, {
            gymId,
            branchId,
            userId,
            userRole,
            userName: userName || 'N/A',
            userPhone: userPhone || 'N/A',
            scanTime: serverTimestamp(),
            method: "QR",
        });

        toast({
          title: "✅ Attendance marked successfully",
          description: `Welcome, ${userName || 'User'}!`,
        });
        
        router.back();

      } catch (e) {
        console.error("Scan processing error:", e);
        toast({ title: "Scan Error", description: "Could not process the QR code. Please try again.", variant: "destructive" });
        setLoading(false);
      }
    }

    if (!!error) {
      // console.info(error);
    }
  };

  const getBackLink = () => {
    const role = localStorage.getItem('userRole');
    if (role === 'member') return '/dashboard/member';
    if (role === 'trainer') return '/dashboard/trainer';
    return '/';
  }

  return (
    <div className="container mx-auto py-10 flex justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>QR Attendance</CardTitle>
          <CardDescription>Scan the QR code at the reception to mark your attendance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="aspect-square w-full bg-muted rounded-lg overflow-hidden flex items-center justify-center">
            {hasCameraPermission === null && <Loader2 className="h-8 w-8 animate-spin" />}
            {hasCameraPermission === false && (
              <Alert variant="destructive">
                <VideoOff className="h-4 w-4" />
                <AlertTitle>Camera Access Denied</AlertTitle>
                <AlertDescription>
                  Please enable camera permissions in your browser settings to use this feature.
                </AlertDescription>
              </Alert>
            )}
            {hasCameraPermission === true && (
              <div className="relative w-full h-full">
                <QrReader
                  onResult={handleScanResult}
                  constraints={{ facingMode: 'environment' }}
                  videoStyle={{objectFit: 'cover'}}
                  containerStyle={{width: '100%', height: '100%'}}
                />
                {loading && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                        <Loader2 className="h-10 w-10 animate-spin mb-4" />
                        <p>Processing...</p>
                    </div>
                )}
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-60 h-60 border-4 border-primary/50 rounded-lg" style={{boxShadow: '0 0 0 4000px rgba(0,0,0,0.5)'}}></div>
                </div>
              </div>
            )}
          </div>
          <Button variant="outline" className="w-full" onClick={() => router.push(getBackLink())}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
