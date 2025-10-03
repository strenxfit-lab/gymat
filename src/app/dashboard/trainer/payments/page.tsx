"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, Timestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, IndianRupee } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Settlement {
    id: string;
    month: string;
    year: number;
    total: number;
    status: 'Paid' | 'Unpaid';
    settledAt: string;
}

export default function TrainerPaymentsPage() {
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const userDocId = localStorage.getItem('userDocId');
        const activeBranchId = localStorage.getItem('activeBranch');
        const trainerId = localStorage.getItem('trainerId');

        if (!userDocId || !activeBranchId || !trainerId) {
            toast({ title: 'Error', description: 'Session invalid.', variant: 'destructive' });
            setLoading(false);
            return;
        }

        const fetchSettlements = async () => {
            try {
                const settlementsRef = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'trainers', trainerId, 'settlements');
                const settlementsSnap = await getDocs(query(settlementsRef, orderBy('settledAt', 'desc')));
                setSettlements(settlementsSnap.docs.map(d => ({ id: d.id, ...d.data(), settledAt: (d.data().settledAt as Timestamp).toDate().toLocaleDateString() } as Settlement)));
            } catch (error) {
                console.error("Error fetching payments:", error);
                toast({ title: 'Error', description: 'Could not fetch payment history.', variant: 'destructive' });
            } finally {
                setLoading(false);
            }
        };

        fetchSettlements();
    }, [toast]);

    if (loading) {
        return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="container mx-auto py-10">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold">My Payments</h1>
                    <p className="text-muted-foreground">A history of your salary and commission payments.</p>
                </div>
                <Link href="/dashboard/trainer" passHref>
                    <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Month/Year</TableHead>
                                <TableHead>Total Paid</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {settlements.length > 0 ? (
                                settlements.map(s => (
                                    <TableRow key={s.id}>
                                        <TableCell>{s.settledAt}</TableCell>
                                        <TableCell>{s.month} {s.year}</TableCell>
                                        <TableCell className="font-medium">₹{s.total.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <Badge variant={s.status === 'Paid' ? 'default' : 'destructive'}>
                                                {s.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No payment history found.
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
