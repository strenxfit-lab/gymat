"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dumbbell } from 'lucide-react';
import LoginForm from '@/components/login-form';
import TrialKeyDialog from '@/components/trial-key-dialog';

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4 font-body">
      <div className="absolute top-4 right-4 md:top-6 md:right-6">
        <TrialKeyDialog />
      </div>

      <main>
        <Tabs defaultValue="member" className="w-full max-w-md">
          <Card className="overflow-hidden rounded-xl shadow-lg">
            <CardHeader className="text-center bg-card p-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Dumbbell className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-3xl font-headline font-bold tracking-tight">GymLogin Pro</CardTitle>
              <CardDescription className="pt-1">Select your role to sign in to your account</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 bg-card">
              <TabsList className="grid w-full grid-cols-3 mb-6 h-auto bg-muted">
                <TabsTrigger value="owner" className="py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">Owner</TabsTrigger>
                <TabsTrigger value="trainer" className="py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">Trainer</TabsTrigger>
                <TabsTrigger value="member" className="py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">Member</TabsTrigger>
              </TabsList>
              <TabsContent value="owner">
                <LoginForm role="Gym Owner" />
              </TabsContent>
              <TabsContent value="trainer">
                <LoginForm role="Trainer" />
              </TabsContent>
              <TabsContent value="member">
                <LoginForm role="Member" />
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      </main>

      <footer className="absolute bottom-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} GymLogin Pro. All rights reserved.
      </footer>
    </div>
  );
}
