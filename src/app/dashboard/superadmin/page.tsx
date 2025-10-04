
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, Timestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, IndianRupee, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { startOfMonth } from 'date-fns';

interface GymCustomer {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: 'Active' | 'Expired' | 'Trial';
  expiryDate?: string;
}

interface PlatformPayment {
    id: string;
    gymName: string;
    planName: string;
    amount: number;
    paymentDate: string;
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
  const [platformPayments, setPlatformPayments] = useState<PlatformPayment[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [thisMonthsRevenue, setThisMonthsRevenue] = useState(0);
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

    const fetchAllData = async () => {
        try {
            // Fetch Gym Customers
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

            // Fetch Platform Payments
            const paymentsCollection = collection(db, 'platform_payments');
            const paymentsQuery = query(paymentsCollection, orderBy('paymentDate', 'desc'));
            const paymentsSnap = await getDocs(paymentsQuery);
            const startOfThisMonth = startOfMonth(now);
            let monthlyRevenue = 0;
            let allTimeRevenue = 0;

            const paymentsList = paymentsSnap.docs.map(doc => {
                const data = doc.data();
                const paymentDate = (data.paymentDate as Timestamp).toDate();

                allTimeRevenue += data.amount;
                if (paymentDate >= startOfThisMonth) {
                    monthlyRevenue += data.amount;
                }

                return {
                    id: doc.id,
                    gymName: data.gymName,
                    planName: data.planName,
                    amount: data.amount,
                    paymentDate: paymentDate.toLocaleDateString(),
                }
            });
            setPlatformPayments(paymentsList);
            setTotalRevenue(allTimeRevenue);
            setThisMonthsRevenue(monthlyRevenue);

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ title: "Error", description: "Could not fetch dashboard data.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }
    
    fetchAllData();
  }, [router, toast]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-4">Loading Dashboard Data...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
        <div className="mb-6">
            <h1 className="text-3xl font-bold">Superadmin Dashboard</h1>
            <p className="text-muted-foreground">An overview of all your gym owner customers and platform revenue.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users /> Total Customers</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold">{customers.length}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><IndianRupee/> This Month's Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold">₹{thisMonthsRevenue.toLocaleString()}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><IndianRupee/> All-Time Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold">₹{totalRevenue.toLocaleString()}</p>
                </CardContent>
            </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                <TableHead>Plan</TableHead>
                                <TableHead>Expiry</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {customers.length > 0 ? (
                                customers.map((customer) => (
                                    <TableRow key={customer.id}>
                                        <TableCell className="font-medium">{customer.name}</TableCell>
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
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No customers found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Recent Subscription Payments</CardTitle>
                    <CardDescription>Latest subscription payments from gym owners.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Gym Name</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {platformPayments.length > 0 ? (
                                platformPayments.slice(0, 10).map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell className="font-medium">{payment.gymName}</TableCell>
                                        <TableCell>{payment.planName}</TableCell>
                                        <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                                        <TableCell>{payment.paymentDate}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No platform payments recorded yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
