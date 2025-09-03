
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlusCircle, Wrench, ShieldCheck, BarChart, AlertTriangle, Loader2 } from 'lucide-react';
import { collection, getDocs, Timestamp, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface Equipment {
  id: string;
  name: string;
  warrantyExpiryDate?: Date;
  maintenanceCount?: number;
}

interface MaintenanceTask {
    id: string;
    equipmentId: string;
    status: 'Pending' | 'Completed';
}

export default function EquipmentMaintenancePage() {
    const [loading, setLoading] = useState(true);
    const [expiringWarranties, setExpiringWarranties] = useState<Equipment[]>([]);
    const [problematicMachines, setProblematicMachines] = useState<Equipment[]>([]);
    const [pendingTasks, setPendingTasks] = useState(0);
    const [completedTasks, setCompletedTasks] = useState(0);
    const { toast } = useToast();

    useEffect(() => {
        const fetchAnalyticsData = async () => {
            const userDocId = localStorage.getItem('userDocId');
            const activeBranchId = localStorage.getItem('activeBranch');

            if (!userDocId || !activeBranchId) {
                toast({ title: "Error", description: "Branch not selected.", variant: "destructive" });
                setLoading(false);
                return;
            }

            try {
                // Fetch Equipment
                const equipmentCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'equipment');
                const equipmentSnapshot = await getDocs(equipmentCollection);
                const equipmentList: Equipment[] = equipmentSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        name: data.name,
                        warrantyExpiryDate: data.warrantyExpiryDate ? (data.warrantyExpiryDate as Timestamp).toDate() : undefined,
                        maintenanceCount: 0,
                    };
                });

                // Fetch Maintenance Tasks
                const maintenanceCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'maintenance');
                const maintenanceSnapshot = await getDocs(maintenanceCollection);
                const taskList: MaintenanceTask[] = maintenanceSnapshot.docs.map(doc => doc.data() as MaintenanceTask);

                // Process Analytics
                const now = new Date();
                const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                
                const expiring = equipmentList.filter(e => e.warrantyExpiryDate && e.warrantyExpiryDate > now && e.warrantyExpiryDate <= next30Days);
                setExpiringWarranties(expiring);

                let pending = 0;
                let completed = 0;
                taskList.forEach(task => {
                    const equipment = equipmentList.find(e => e.id === task.equipmentId);
                    if (equipment) {
                        equipment.maintenanceCount = (equipment.maintenanceCount || 0) + 1;
                    }
                    if(task.status === 'Completed') completed++;
                    else pending++;
                });

                setPendingTasks(pending);
                setCompletedTasks(completed);
                
                const problematic = [...equipmentList].sort((a, b) => (b.maintenanceCount || 0) - (a.maintenanceCount || 0)).slice(0, 5);
                setProblematicMachines(problematic.filter(m => (m.maintenanceCount || 0) > 0));

            } catch (error) {
                console.error("Error fetching analytics:", error);
                toast({ title: "Error", description: "Could not load analytics data.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        fetchAnalyticsData();
    }, [toast]);

  if (loading) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-muted-foreground">Loading Analytics...</p>
        </div>
    )
  }

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

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{pendingTasks}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
                <ShieldCheck className="h-4 w-4 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{completedTasks}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Warranties Expiring Soon</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{expiringWarranties.length}</div>
            </CardContent>
        </Card>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
            <CardHeader>
                <CardTitle>Navigation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Link href="/dashboard/owner/equipment" passHref>
                    <Button className="w-full justify-start"><PlusCircle className="mr-2"/>Add & View Equipment</Button>
                </Link>
                <Link href="/dashboard/owner/maintenance-schedule" passHref>
                    <Button className="w-full justify-start"><Wrench className="mr-2"/>Maintenance Schedule</Button>
                </Link>
                 <Link href="/dashboard/owner/equipment" passHref>
                    <Button className="w-full justify-start"><ShieldCheck className="mr-2"/>Check Full Status</Button>
                </Link>
            </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Maintenance Analytics</CardTitle>
            <CardDescription>Key insights into your equipment health.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
                <h3 className="font-semibold mb-2">Most Problematic Machines</h3>
                {problematicMachines.length > 0 ? (
                    <ul className="space-y-2">
                        {problematicMachines.map(e => (
                            <li key={e.id} className="text-sm flex justify-between items-center">
                                <span>{e.name}</span>
                                <Badge>{e.maintenanceCount} issues</Badge>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-muted-foreground">No recurring maintenance issues found.</p>}
            </div>
            <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Warranties Expiring (Next 30 Days)</h3>
                 {expiringWarranties.length > 0 ? (
                    <ul className="space-y-2">
                        {expiringWarranties.map(e => (
                            <li key={e.id} className="text-sm flex justify-between items-center">
                                <span>{e.name}</span>
                                <span className="text-muted-foreground">{e.warrantyExpiryDate?.toLocaleDateString()}</span>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-muted-foreground">No warranties expiring soon.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
