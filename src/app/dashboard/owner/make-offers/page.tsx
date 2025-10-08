
"use client";

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, UserCheck } from 'lucide-react';

export default function MakeOffersPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Make Offers</h1>
          <p className="text-muted-foreground">Create and manage special offers for your community.</p>
        </div>
        <Link href="/dashboard/owner" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Dashboard</Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-8 w-8 text-primary" />
              <CardTitle>Offers for Members</CardTitle>
            </div>
            <CardDescription>
              Create special discounts, package deals, or renewal offers to engage and retain your members.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/owner/offers-members" passHref>
                <Button className="w-full">Create Member Offer</Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
             <div className="flex items-center gap-3 mb-2">
              <UserCheck className="h-8 w-8 text-primary" />
              <CardTitle>Offers for Trainers</CardTitle>
            </div>
            <CardDescription>
              Design incentive programs, performance bonuses, or special benefits for your training staff.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" disabled>Create Trainer Offer</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
