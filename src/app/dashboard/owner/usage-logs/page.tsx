
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, getDocs, Timestamp, doc, updateDoc, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PlusCircle, ArrowLeft, Phone, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


const usageLogSchema = z.object({
  itemId: z.string().min(1, 'Please select an item.'),
  quantityUsed: z.coerce.number().min(1, 'Quantity must be at least 1.'),
  dateOfIssue: z.string().min(1, 'Date is required.'),
  notes: z.string().optional(),
});

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
}

interface UsageLog {
  id: string;
  itemName: string;
  quantityUsed: number;
  remainingStock: number;
  dateOfIssue: string;
  notes?: string;
}

interface LimitDialogInfo {
    members?: number;
    trainers?: number;
    payments?: number;
    equipment?: number;
    classes?: number;
    expenses?: number;
    inventory?: number;
    maintenance?: number;
    offers?: number;
    usageLogs?: number;
}

function LimitReachedDialog({ isOpen, onOpenChange, limits }: { isOpen: boolean; onOpenChange: (open: boolean) => void, limits: LimitDialogInfo }) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>You've reached the limit of your trial account</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 pt-2">
            {limits.members !== undefined && <p>Members ({limits.members}/3)</p>}
            {limits.trainers !== undefined && <p>Trainers ({limits.trainers}/2)</p>}
            {limits.payments !== undefined && <p>Payments ({limits.payments}/5 per member)</p>}
            {limits.equipment !== undefined && <p>Equipment ({limits.equipment}/1)</p>}
            {limits.classes !== undefined && <p>Classes ({limits.classes}/1)</p>}
            {limits.expenses !== undefined && <p>Expenses ({limits.expenses}/2)</p>}
            {limits.inventory !== undefined && <p>Inventory ({limits.inventory}/1)</p>}
            {limits.maintenance !== undefined && <p>Maintenance ({limits.maintenance}/1)</p>}
            {limits.offers !== undefined && <p>Offers ({limits.offers}/1)</p>}
            {limits.usageLogs !== undefined && <p>Usage Logs ({limits.usageLogs}/1)</p>}
            <p className="font-semibold pt-2">Upgrade to a full Account to continue managing without restrictions.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col space-y-2">
            <p className="font-bold text-center">Contact Strenxfit Support</p>
            <a href="https://wa.me/917988487892" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 p-3 rounded-md hover:bg-accent transition-colors">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <span>+91 79884 87892</span>
            </a>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function UsageLogsPage() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [limitInfo, setLimitInfo] = useState<LimitDialogInfo>({});
  const { toast } = useToast();

  const form = useForm<z.infer<typeof usageLogSchema>>({
    resolver: zodResolver(usageLogSchema),
    defaultValues: { itemId: '', quantityUsed: 1, dateOfIssue: format(new Date(), 'yyyy-MM-dd'), notes: '' },
  });

  const fetchAllData = async () => {
    setLoading(true);
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');

    if (!userDocId || !activeBranchId) {
      toast({ title: "Error", description: "Branch not selected.", variant: "destructive" });
      setLoading(false);
      return;
    }
    
    const gymRef = doc(db, 'gyms', userDocId);
    const gymSnap = await getDoc(gymRef);
    if (gymSnap.exists() && gymSnap.data().isTrial) {
        setIsTrial(true);
    }
    
    try {
      // Fetch Inventory Items
      const inventoryCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'inventory');
      const inventorySnapshot = await getDocs(inventoryCollection);
      const itemsList = inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
      setInventoryItems(itemsList);

      // Fetch Usage Logs
      const logsCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'usageLogs');
      const logsSnapshot = await getDocs(logsCollection);
      const logsList = logsSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          dateOfIssue: (data.dateOfIssue as Timestamp).toDate().toLocaleDateString(),
        } as UsageLog;
      });

      logsList.sort((a, b) => new Date(b.dateOfIssue).getTime() - new Date(a.dateOfIssue).getTime());
      setLogs(logsList);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Error", description: "Failed to fetch usage logs data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllData();
  }, [toast]);

  const handleFormSubmit = async (values: z.infer<typeof usageLogSchema>) => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId) return;

    if (isTrial) {
        if (logs.length >= 1) {
            setLimitInfo({ usageLogs: logs.length });
            setLimitDialogOpen(true);
            return;
        }
    }

    try {
      const selectedItem = inventoryItems.find(item => item.id === values.itemId);
      if (!selectedItem) {
        toast({ title: "Error", description: "Selected item not found.", variant: "destructive" });
        return;
      }
      if (selectedItem.quantity < values.quantityUsed) {
        toast({ title: "Insufficient Stock", description: `Only ${selectedItem.quantity} units of ${selectedItem.name} available.`, variant: "destructive" });
        return;
      }

      await runTransaction(db, async (transaction) => {
        const itemRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'inventory', values.itemId);
        const logRef = doc(collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'usageLogs'));
        
        const itemDoc = await transaction.get(itemRef);
        if (!itemDoc.exists()) {
          throw "Item does not exist!";
        }

        const newQuantity = itemDoc.data().quantity - values.quantityUsed;
        transaction.update(itemRef, { quantity: newQuantity });
        
        transaction.set(logRef, {
            itemName: selectedItem.name,
            quantityUsed: values.quantityUsed,
            remainingStock: newQuantity,
            dateOfIssue: Timestamp.fromDate(new Date(values.dateOfIssue)),
            notes: values.notes || '',
            createdAt: Timestamp.now(),
        });
      });

      toast({ title: 'Success!', description: 'Usage has been logged and stock updated.' });
      setIsFormDialogOpen(false);
      form.reset();
      await fetchAllData();
    } catch (error) {
      console.error("Error logging usage:", error);
      toast({ title: 'Error', description: 'Could not log usage. Please try again.', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
      <LimitReachedDialog isOpen={limitDialogOpen} onOpenChange={setLimitDialogOpen} limits={limitInfo} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Inventory Usage Logs</h1>
          <p className="text-muted-foreground">Track all consumption of inventory items.</p>
        </div>
        <div className="flex items-center gap-2">
            <Link href="/dashboard/owner/inventory-tracking" passHref>
                <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back</Button>
            </Link>
            <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Log New Usage
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                <DialogTitle>Log Inventory Usage</DialogTitle>
                <DialogDescription>Record an item that has been used or consumed.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
                    <FormField control={form.control} name="itemId" render={({ field }) => (
                    <FormItem><FormLabel>Item Used</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select an item" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {inventoryItems.map(item => <SelectItem key={item.id} value={item.id}>{item.name} (Qty: {item.quantity})</SelectItem>)}
                        </SelectContent>
                        </Select>
                    <FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="quantityUsed" render={({ field }) => ( <FormItem><FormLabel>Quantity Used</FormLabel><FormControl><Input type="number" placeholder="1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="dateOfIssue" render={({ field }) => ( <FormItem><FormLabel>Date of Issue</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                    <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Issued to cleaning staff" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    
                    <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsFormDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Log Usage'}
                    </Button>
                    </DialogFooter>
                </form>
                </Form>
            </DialogContent>
            </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage History</CardTitle>
          <CardDescription>A log of all recorded inventory usage.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Quantity Used</TableHead>
                <TableHead>Stock Remaining</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.itemName}</TableCell>
                    <TableCell>{log.dateOfIssue}</TableCell>
                    <TableCell>{log.quantityUsed}</TableCell>
                    <TableCell>{log.remainingStock}</TableCell>
                    <TableCell>{log.notes}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No usage has been logged yet.
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

    