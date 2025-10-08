
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GymCustomer {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: 'Active' | 'Expired' | 'Trial';
  expiryDate?: string;
}

const getStatusVariant = (status: GymCustomer['status']) => {
    switch (status) {
        case 'Active': return 'default';
        case 'Expired': return 'destructive';
        case 'Trial': return 'secondary';
        default: return 'outline';
    }
}

export default function SuperAdminDashboard() {
  const [customers, setCustomers] = useState<GymCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (role !== 'superadmin') {
        toast({ title: "Access Denied", description: "You do not have permission to view this page.", variant: "destructive" });
        router.push('/');
        return;
    }

    const fetchCustomers = async () => {
        try {
            const gymsCollection = collection(db, 'gyms');
            const gymsSnapshot = await getDocs(gymsCollection);
            const now = new Date();

            const customersList = gymsSnapshot.docs.map(doc => {
                const data = doc.data();
                const expiry = (data.expiry_at as Timestamp)?.toDate();
                let status: GymCustomer['status'] = 'Active';

                if (data.isTrial) {
                    status = 'Trial';
                } else if (expiry && expiry < now) {
                    status = 'Expired';
                }

                return {
                    id: doc.id,
                    name: data.name,
                    email: data.email,
                    plan: data.membershipType || (data.isTrial ? 'Trial' : 'N/A'),
                    status: status,
                    expiryDate: expiry?.toLocaleDateString()
                };
            });
            
            customersList.sort((a,b) => a.name.localeCompare(b.name));
            setCustomers(customersList);

        } catch (error) {
            console.error("Error fetching customers:", error);
            toast({ title: "Error", description: "Could not fetch customer data.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }
    
    fetchCustomers();
  }, [router, toast]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-4">Loading Customer Data...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
        <div className="mb-6">
            <h1 className="text-3xl font-bold">Superadmin Dashboard</h1>
            <p className="text-muted-foreground">An overview of all your gym owner customers.</p>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>All Gym Customers</CardTitle>
                <CardDescription>A list of all registered gyms on the platform.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Gym Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Expiry Date</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {customers.length > 0 ? (
                            customers.map((customer) => (
                                <TableRow key={customer.id}>
                                    <TableCell className="font-medium">{customer.name}</TableCell>
                                    <TableCell>{customer.email}</TableCell>
                                    <TableCell>{customer.plan}</TableCell>
                                    <TableCell>{customer.expiryDate || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(customer.status)}>
                                            {customer.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No customers found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
