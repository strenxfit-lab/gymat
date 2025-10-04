
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, Timestamp, query, orderBy, doc, updateDoc, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, IndianRupee, HandCoins, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';

type SettlementStatus = 'Pending' | 'Completed' | 'Failed';

interface Settlement {
  id: string;
  gymId: string;
  gymName: string;
  amount: number;
  status: SettlementStatus;
  requestedAt: string;
  transactionId?: string;
  mode: 'Normal' | 'Instant';
  accountDetails?: any;
}

const getStatusVariant = (status: SettlementStatus) => {
    switch(status) {
        case 'Pending': return 'secondary';
        case 'Completed': return 'default';
        case 'Failed': return 'destructive';
        default: return 'outline';
    }
}

const StatCard = ({ title, value, count, onClick }: { title: string, value: string, count?: number, onClick?: () => void }) => (
    <Card className={onClick ? 'cursor-pointer hover:bg-accent' : ''} onClick={onClick}>
        <CardHeader>
            <CardTitle className="text-md font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-3xl font-bold">{value}</p>
            {count !== undefined && <p className="text-sm text-muted-foreground">{count} requests</p>}
        </CardContent>
    </Card>
);

export default function SuperAdminSettlementsPage() {
  const [allSettlements, setAllSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const router = useRouter();
  const { toast } = useToast();

  const fetchSettlements = async () => {
    setLoading(true);
    try {
        const gymsCollection = collection(db, 'gyms');
        const gymsSnapshot = await getDocs(gymsCollection);
        const gymsMap = new Map(gymsSnapshot.docs.map(doc => [doc.id, doc.data().name]));

        const settlementsQuery = query(collectionGroup(db, 'settlements'), orderBy('requestedAt', 'desc'));
        const settlementsSnap = await getDocs(settlementsQuery);

        const settlementsList: Settlement[] = [];
        for (const settlementDoc of settlementsSnap.docs) {
            const data = settlementDoc.data();
            const gymId = settlementDoc.ref.parent.parent?.id; // gyms/{gymId}/settlements/{settlementId}
            if (gymId) {
                const gymName = gymsMap.get(gymId) || 'Unknown Gym';
                settlementsList.push({
                    id: settlementDoc.id,
                    gymId,
                    gymName,
                    ...data,
                    requestedAt: (data.requestedAt as Timestamp)?.toDate().toLocaleString() || 'N/A',
                } as Settlement);
            }
        }
        setAllSettlements(settlementsList);

    } catch (error) {
        console.error("Error fetching settlements:", error);
        toast({ title: "Error", description: "Could not fetch settlements data.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, [toast]);

  const handleMarkAsCompleted = async () => {
    if (!selectedSettlement) return;

    try {
        const settlementRef = doc(db, 'gyms', selectedSettlement.gymId, 'settlements', selectedSettlement.id);
        await updateDoc(settlementRef, { status: 'Completed' });
        toast({ title: 'Success!', description: 'Settlement marked as completed.'});
        setIsDetailOpen(false);
        await fetchSettlements(); // Refresh data
    } catch(error) {
        console.error("Error updating settlement status:", error);
        toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive'});
    }
  }
  
  const handleViewDetails = async (settlement: Settlement) => {
    try {
        const bankRef = doc(db, 'gyms', settlement.gymId, 'account_details', 'bankAccount');
        const bankSnap = await getDoc(bankRef);
        
        const upiRef = doc(db, 'gyms', settlement.gymId, 'account_details', 'upi');
        const upiSnap = await getDoc(upiRef);

        const details = settlement.mode === 'Instant' && upiSnap.exists() ? upiSnap.data() : (bankSnap.exists() ? bankSnap.data() : null);

        setSelectedSettlement({ ...settlement, accountDetails: details });
        setIsDetailOpen(true);
    } catch (error) {
        console.error("Error fetching account details:", error);
        toast({ title: "Error", description: "Could not fetch account details for this gym.", variant: "destructive" });
    }
  }


  const today = format(new Date(), 'yyyy-MM-dd');
  const pendingToday = allSettlements.filter(s => s.status === 'Pending' && s.requestedAt.startsWith(format(new Date(s.requestedAt), 'M/d/yyyy')));
  const instantPending = allSettlements.filter(s => s.status === 'Pending' && s.mode === 'Instant');
  const totalPaid = allSettlements.filter(s => s.status === 'Completed').reduce((sum, s) => sum + s.amount, 0);

  const pendingSettlements = allSettlements.filter(s => s.status === 'Pending');
  const completedSettlements = allSettlements.filter(s => s.status === 'Completed');
  
  const renderTable = (data: Settlement[]) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Gym Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {data.length > 0 ? data.map(s => (
                <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.gymName}</TableCell>
                    <TableCell>{s.requestedAt}</TableCell>
                    <TableCell>₹{s.amount.toLocaleString()}</TableCell>
                    <TableCell>{s.mode}</TableCell>
                    <TableCell><Badge variant={getStatusVariant(s.status)}>{s.status}</Badge></TableCell>
                    <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(s)}>View Details</Button>
                    </TableCell>
                </TableRow>
            )) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">No settlements in this category.</TableCell></TableRow>
            )}
        </TableBody>
    </Table>
  );

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
        <div className="mb-6">
            <h1 className="text-3xl font-bold">Settlement Dashboard</h1>
            <p className="text-muted-foreground">Manage and process payouts for all gyms.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <StatCard title="Total Settlement Today" value={`₹${pendingToday.reduce((sum, s) => sum + s.amount, 0).toLocaleString()}`} count={pendingToday.length} onClick={() => setActiveTab('pending')}/>
            <StatCard title="Instant Settlement Requests" value={`₹${instantPending.reduce((sum, s) => sum + s.amount, 0).toLocaleString()}`} count={instantPending.length} onClick={() => setActiveTab('pending')}/>
            <StatCard title="Total Paid Out" value={`₹${totalPaid.toLocaleString()}`} onClick={() => setActiveTab('completed')}/>
        </div>
        
        <Card>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <CardHeader>
                    <TabsList>
                        <TabsTrigger value="pending">Pending</TabsTrigger>
                        <TabsTrigger value="completed">Completed</TabsTrigger>
                    </TabsList>
                </CardHeader>
                <CardContent>
                    <TabsContent value="pending">
                        {renderTable(pendingSettlements)}
                    </TabsContent>
                    <TabsContent value="completed">
                        {renderTable(completedSettlements)}
                    </TabsContent>
                </CardContent>
            </Tabs>
        </Card>

        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Settlement Details</DialogTitle>
                    <DialogDescription>
                        Gym: {selectedSettlement?.gymName} ({selectedSettlement?.mode} Settlement)
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="flex justify-between font-bold text-lg">
                        <span>Amount:</span>
                        <span>₹{selectedSettlement?.amount.toLocaleString()}</span>
                    </div>
                    {selectedSettlement?.accountDetails ? (
                        <div className="space-y-2 border-t pt-4">
                            <h4 className="font-semibold">{selectedSettlement.mode === 'Instant' ? 'UPI Details' : 'Bank Account Details'}</h4>
                            {selectedSettlement.mode === 'Instant' ? (
                                <>
                                    <p><span className="font-medium">UPI ID:</span> {selectedSettlement.accountDetails.upiId}</p>
                                    <p><span className="font-medium">Name:</span> {selectedSettlement.accountDetails.upiName}</p>
                                </>
                            ) : (
                                <>
                                    <p><span className="font-medium">Account Name:</span> {selectedSettlement.accountDetails.accountHolderName}</p>
                                    <p><span className="font-medium">Account Number:</span> {selectedSettlement.accountDetails.accountNumber}</p>
                                    <p><span className="font-medium">Bank Name:</span> {selectedSettlement.accountDetails.bankName}</p>
                                    <p><span className="font-medium">IFSC Code:</span> {selectedSettlement.accountDetails.ifscCode}</p>
                                </>
                            )}
                        </div>
                    ) : (
                         <p className="text-sm text-destructive">Account details for this gym are not available.</p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Close</Button>
                    {selectedSettlement?.status === 'Pending' && (
                        <Button onClick={handleMarkAsCompleted}>
                            <CheckCircle className="mr-2 h-4 w-4"/>
                            Mark as Completed
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
