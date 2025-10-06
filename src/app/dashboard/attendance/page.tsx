
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, QrCode, Video, VideoOff, CheckCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Webcam from 'react-webcam';
import jsQR from 'jsqr';

export default function ScanAttendancePage() {
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [isScanned, setIsScanned] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const webcamRef = useRef<Webcam>(null);
  const router = useRouter();
  const { toast } = useToast();

   useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        if (webcamRef.current && webcamRef.current.video) {
            webcamRef.current.video.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
        setHasCameraPermission(false);
      }
    };

    getCameraPermission();
  }, [facingMode]);

  useEffect(() => {
    if (!hasCameraPermission || isScanned) return;

    const intervalId = setInterval(() => {
      capture();
    }, 500); // Scan every 500ms

    return () => clearInterval(intervalId);
  }, [hasCameraPermission, isScanned]);

  const capture = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        const image = new Image();
        image.src = imageSrc;
        image.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          const ctx = canvas.getContext('2d');
          if(ctx) {
            ctx.drawImage(image, 0, 0, image.width, image.height);
            const imageData = ctx.getImageData(0, 0, image.width, image.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
              handleScan(code.data);
            }
          }
        };
      }
    }
  };

  const handleFlipCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleScan = async (data: string) => {
    if (isScanned) return; // Prevent multiple scans
    setIsScanned(true);
    setLoading(true);
    setScanResult(data);

    try {
      const qrData = JSON.parse(data);
      const memberGymId = localStorage.getItem('userDocId');
      const memberBranchId = localStorage.getItem('activeBranch');

      if (qrData.gymId === memberGymId && qrData.branchId === memberBranchId) {
        await markAttendance();
      } else {
        toast({ title: "Invalid QR Code", description: "This QR code is not for this gym branch.", variant: "destructive" });
        router.push(getBackLink());
      }
    } catch (e) {
      toast({ title: "Invalid QR Code", description: "The scanned QR code is not valid.", variant: "destructive" });
      router.push(getBackLink());
    }
  };
  
  const markAttendance = async () => {
    const gymId = localStorage.getItem('userDocId');
    const branchId = localStorage.getItem('activeBranch');
    const userRole = localStorage.getItem('userRole');
    const userId = userRole === 'member' ? localStorage.getItem('memberId') : localStorage.getItem('trainerId');
    const userName = localStorage.getItem('userName');
    const userPhone = localStorage.getItem('userPhone');

    if (!gymId || !branchId || !userId || !userName || !userPhone || !userRole) {
        toast({ title: "Session Error", description: "Your session is invalid. Please log in again.", variant: "destructive"});
        setLoading(false);
        return;
    }

    try {
        if (userRole === 'member') {
            const memberRef = doc(db, 'gyms', gymId, 'branches', branchId, 'members', userId);
            const memberSnap = await getDoc(memberRef);

            if (!memberSnap.exists()) {
                 toast({ title: "Error", description: "Member record not found.", variant: "destructive"});
                 setLoading(false);
                 return;
            }

            const memberData = memberSnap.data();
            const endDate = (memberData.endDate as Timestamp)?.toDate();
            if (!endDate || endDate < new Date()) {
                setIsExpired(true);
                setLoading(false);
                return;
            }
        }
        
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const attendanceRef = collection(db, 'attendance');
        const q = query(attendanceRef, where("userId", "==", userId), where("scanTime", ">=", Timestamp.fromDate(tenMinutesAgo)));
        const recentScans = await getDocs(q);

        if (!recentScans.empty) {
            toast({ title: "Already Checked In", description: "You have already checked in recently." });
            localStorage.setItem('lastCheckIn', new Date().toISOString());
            router.push(getBackLink());
            return;
        }

        await addDoc(attendanceRef, {
            gymId,
            branchId,
            userId: userId,
            userRole: userRole,
            userName: userName,
            userPhone: userPhone,
            scanTime: Timestamp.now(),
            method: "QR Scan",
        });

        toast({ title: "Check-in Successful!", description: `Welcome, ${userName}!` });
        localStorage.setItem('lastCheckIn', new Date().toISOString());
        router.push(getBackLink());
    } catch (error) {
        console.error("Error marking attendance:", error);
        toast({ title: "Error", description: "Could not mark attendance.", variant: "destructive"});
        setLoading(false);
    }
  }
  
  const getBackLink = () => {
    const role = localStorage.getItem('userRole');
    if (role === 'member') return '/dashboard/member';
    if (role === 'trainer') return '/dashboard/trainer';
    return '/';
  }

  const videoConstraints = {
    facingMode: facingMode
  };

  return (
    <div className="container mx-auto py-10 flex justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><QrCode/> Scan for Attendance</CardTitle>
          <CardDescription>Position the gym's QR code in front of your camera.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           {isExpired ? (
              <Alert variant="destructive">
                <AlertTitle>Membership Expired</AlertTitle>
                <AlertDescription>
                  Your membership has expired. Please renew your plan to check in.
                </AlertDescription>
              </Alert>
           ) : (
              <div className="relative aspect-square w-full bg-muted rounded-lg overflow-hidden">
                <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={videoConstraints}
                    className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 border-8 border-primary/50 rounded-lg" />
                 {loading && !isExpired && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                        <CheckCircle className="h-12 w-12 text-green-500 mb-4"/>
                        <p className="font-bold text-lg">QR Code Detected!</p>
                        <p>Verifying your check-in...</p>
                        <Loader2 className="mt-4 h-8 w-8 animate-spin" />
                    </div>
                )}
                 <Button onClick={handleFlipCamera} variant="outline" size="icon" className="absolute bottom-4 right-4 bg-background/50 backdrop-blur-sm">
                    <RefreshCw className="h-5 w-5"/>
                    <span className="sr-only">Flip camera</span>
                 </Button>
              </div>
            )}
            {!hasCameraPermission && (
                 <Alert variant="destructive">
                    <VideoOff className="h-4 w-4" />
                    <AlertTitle>Camera Access Denied</AlertTitle>
                    <AlertDescription>Please enable camera permissions in your browser to scan the QR code.</AlertDescription>
                </Alert>
            )}
             <Button variant="outline" className="w-full" onClick={() => router.push(getBackLink())}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
