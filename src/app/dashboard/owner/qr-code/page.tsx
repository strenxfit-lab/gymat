
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, QrCode, Download } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export default function QrCodePage() {
  const [loading, setLoading] = useState(true);
  const [qrValue, setQrValue] = useState('');
  const [branchName, setBranchName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const fetchBranchInfo = async () => {
      const gymId = localStorage.getItem('userDocId');
      const branchId = localStorage.getItem('activeBranch');

      if (!gymId || !branchId) {
        toast({ title: "Error", description: "No active branch found.", variant: "destructive" });
        setLoading(false);
        return;
      }

      try {
        const branchRef = doc(db, 'gyms', gymId, 'branches', branchId);
        const branchSnap = await getDoc(branchRef);
        if (branchSnap.exists()) {
          setBranchName(branchSnap.data().name);
        }
        setQrValue(JSON.stringify({ gymId, branchId }));
      } catch (error) {
        console.error("Error fetching branch info:", error);
        toast({ title: "Error", description: "Could not load QR code data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchBranchInfo();
  }, [toast]);

  const handleDownload = () => {
    const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `${branchName}-qr-code.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Branch QR Code</h1>
          <p className="text-muted-foreground">Display or print this code for members to scan for attendance.</p>
        </div>
        <Link href="/dashboard/owner" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Button>
        </Link>
      </div>

      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <QrCode className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="text-2xl mt-2">{branchName}</CardTitle>
          <CardDescription>Attendance QR Code</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-6">
          {qrValue ? (
            <QRCode
              id="qr-code-canvas"
              value={qrValue}
              size={256}
              level={"H"}
              includeMargin={true}
            />
          ) : (
            <div className="h-[256px] w-[256px] bg-muted rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">Could not generate QR code.</p>
            </div>
          )}
          <Button onClick={handleDownload} disabled={!qrValue}>
            <Download className="mr-2 h-4 w-4" />
            Download as PNG
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

    