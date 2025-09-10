
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Loader2 } from 'lucide-react';
import LoginForm from '@/components/login-form';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { KeyRound } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const userDocId = localStorage.getItem('userDocId');
    const userRole = localStorage.getItem('userRole');

    if (userDocId && userRole) {
      if (userRole === 'owner') {
        router.replace('/dashboard/owner');
      } else if (userRole === 'member') {
        router.replace('/dashboard/member');
      } else if (userRole === 'trainer') {
        router.replace('/dashboard/trainer');
      }
       else {
        setIsCheckingAuth(false);
      }
    } else {
      setIsCheckingAuth(false);
    }
  }, [router]);

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Checking authentication...</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4 font-body">
      <main>
        <Card className="w-full max-w-md overflow-hidden rounded-xl shadow-lg">
          <CardHeader className="text-center bg-card p-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Dumbbell className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-headline font-bold tracking-tight">Strenx GymLogin</CardTitle>
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
            <LoginForm />
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
        © {new Date().getFullYear()} GymLogin Pro. All rights reserved.
      </footer>
    </div>
  );
}
