
"use client";

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlusCircle, Wrench, ShieldCheck, BarChart } from 'lucide-react';

export default function EquipmentMaintenancePage() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Equipment Maintenance</h1>
          <p className="text-muted-foreground">Manage and track your gym's valuable equipment.</p>
        </div>
        <Link href="/dashboard/owner" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Dashboard</Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <PlusCircle className="h-8 w-8 text-primary" />
              <CardTitle>Add Equipment</CardTitle>
            </div>
            <CardDescription>
              Log new equipment into your system to begin tracking.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">Add New Equipment</Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
             <div className="flex items-center gap-3 mb-2">
              <Wrench className="h-8 w-8 text-primary" />
              <CardTitle>Maintenance Schedule</CardTitle>
            </div>
            <CardDescription>
              Schedule and view upcoming maintenance tasks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">View Schedule</Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
             <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="h-8 w-8 text-primary" />
              <CardTitle>Equipment Status</CardTitle>
            </div>
            <CardDescription>
              See the current status of all your equipment at a glance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">Check Status</Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
             <div className="flex items-center gap-3 mb-2">
              <BarChart className="h-8 w-8 text-primary" />
              <CardTitle>Maintenance Analytics</CardTitle>
            </div>
            <CardDescription>
              Analyze maintenance history and costs over time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">View Analytics</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
