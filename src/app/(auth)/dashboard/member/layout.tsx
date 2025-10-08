"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Loader2, Clock } from 'lucide-react';
import LoginForm from '@/components/login-form';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { KeyRound } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

function AuthChecker({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const userRole = localStorage.getItem('userRole');
    if (userRole) {
      router.replace(`/dashboard/${userRole}`);
    } else {
      setIsChecking(false);
    }
  }, [router]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Checking authentication...</p>
      </div>
    );
  }

  return <>{children}</>;
}


export default function Home() {
  const [isExpiredDialogOpen, setIsExpiredDialogOpen] = useState(false);
  const [expiredGymId, setExpiredGymId] = useState<string | null>(null);

  const handleExpiredLogin = (gymId: string) => {
    setExpiredGymId(gymId);
    setIsExpiredDialogOpen(true);
  }

  return (
    <AuthChecker>
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4 font-body">
        <Dialog open={isExpiredDialogOpen} onOpenChange={setIsExpiredDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle className="flex items-center gap-2"><Clock className="text-destructive"/> Membership Expired</DialogTitle>
                  <DialogDescription>
                      Your gym owner plan has expired. Please renew your subscription to regain access to your dashboard and continue managing your gym.
                  </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsExpiredDialogOpen(false)}>Close</Button>
                  <Link href={`/renew?gymId=${expiredGymId}`} passHref>
                      <Button>Renew Now</Button>
                  </Link>
              </DialogFooter>
          </DialogContent>
        </Dialog>
        <main>
          <Card className="w-full max-w-md overflow-hidden rounded-xl shadow-lg">
            <CardHeader className="text-center bg-card p-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Dumbbell className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-3xl font-headline font-bold tracking-tight">Strenx</CardTitle>
              <CardDescription className="pt-1">Sign in to your account</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 bg-card">
              <Alert className="mb-4">
                <KeyRound className="h-4 w-4"/>
                <AlertTitle>Trial User?</AlertTitle>
                <AlertDescription>
                  Enter your trial key in the first field and the word <span className="font-bold">trial</span> as the password.
                </AlertDescription>
              </Alert>
              <LoginForm onExpired={handleExpiredLogin} />
            </CardContent>
            <div className="p-6 pt-0 text-center">
              <Link href="/activate-trial" passHref>
                <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">
                  Don't have a key? Activate Trial
                </Button>
              </Link>
            </div>
          </Card>
        </main>

        <footer className="absolute bottom-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Strenx. All rights reserved.
        </footer>
      </div>
    </AuthChecker>
  );
}