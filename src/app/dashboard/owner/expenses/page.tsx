
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, getDocs, Timestamp, deleteDoc, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
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
import { Loader2, PlusCircle, ArrowLeft, MoreHorizontal, IndianRupee, PieChart, Edit, Trash, Boxes, Phone, Mail } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ResponsiveContainer, Pie, Cell, Tooltip, Legend } from 'recharts';
import { startOfMonth } from 'date-fns';

const expenseSchema = z.object({
  name: z.string().min(1, 'Expense name is required.'),
  category: z.string().min(1, 'Please select a category.'),
  amount: z.coerce.number().min(1, 'Amount must be greater than 0.'),
  date: z.string().min(1, 'Date is required.'),
  description: z.string().optional(),
});

interface Expense extends z.infer<typeof expenseSchema> {
  id: string;
}

interface ChartData {
    name: string;
    value: number;
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

const expenseCategories = [
    "Rent/Lease",
    "Salaries",
    "Utilities",
    "Equipment Maintenance",
    "Marketing & Advertising",
    "Miscellaneous"
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943', '#FF4F81'];

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

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [thisMonthsExpenses, setThisMonthsExpenses] = useState(0);
  const [totalInventoryValue, setTotalInventoryValue] = useState(0);
  const [categoryChartData, setCategoryChartData] = useState<ChartData[]>([]);
  const [isTrial, setIsTrial] = useState(false);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [limitInfo, setLimitInfo] = useState<LimitDialogInfo>({});
  const { toast } = useToast();

  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { name: '', category: '', amount: 0, date: '', description: '' },
  });
  
  const fetchExpensesAndInventory = async () => {
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
        const expensesCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'expenses');
        const expensesSnapshot = await getDocs(expensesCollection);

        const expensesList = expensesSnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                date: (data.date as Timestamp).toDate().toISOString().split('T')[0],
            } as Expense;
        });

        expensesList.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setExpenses(expensesList);

        const inventoryCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'inventory');
        const inventorySnapshot = await getDocs(inventoryCollection);
        let inventoryValue = 0;
        inventorySnapshot.forEach(doc => {
            const item = doc.data();
            inventoryValue += (item.purchasePrice || 0) * (item.quantity || 0);
        });
        setTotalInventoryValue(inventoryValue);

        // Calculate summaries
        const now = new Date();
        const startOfThisMonth = startOfMonth(now);
        let monthTotal = 0;
        const categoryTotals: Record<string, number> = {};

        expensesList.forEach(expense => {
            if (new Date(expense.date) >= startOfThisMonth) {
                monthTotal += expense.amount;
            }
            categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
        });
        
        setThisMonthsExpenses(monthTotal);
        
        const chartData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
        if(inventoryValue > 0) {
            chartData.push({ name: 'Inventory Value', value: inventoryValue });
        }
        setCategoryChartData(chartData);

    } catch (error) {
        console.error("Error fetching data:", error);
        toast({ title: "Error", description: "Failed to fetch financial data.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }

  useEffect(() => {
    fetchExpensesAndInventory();
  }, [toast]);
  
  useEffect(() => {
    if (editingExpense) {
        form.reset(editingExpense);
        setIsFormDialogOpen(true);
    } else {
        form.reset({ name: '', category: '', amount: 0, date: new Date().toISOString().split('T')[0], description: '' });
    }
  }, [editingExpense, form]);

  const handleFormDialogStateChange = (open: boolean) => {
      setIsFormDialogOpen(open);
      if (!open) {
          setEditingExpense(null);
      }
  }

  const handleFormSubmit = async (values: z.infer<typeof expenseSchema>) => {
    if (editingExpense) {
        await onUpdateExpense(values);
    } else {
        await onAddExpense(values);
    }
  };

  const onAddExpense = async (values: z.infer<typeof expenseSchema>) => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId) return;

    if(isTrial) {
        if (expenses.length >= 2) {
            setLimitInfo({ expenses: expenses.length });
            setLimitDialogOpen(true);
            return;
        }
    }

    try {
      const expensesCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'expenses');
      
      await addDoc(expensesCollection, {
        ...values,
        date: Timestamp.fromDate(new Date(values.date)),
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Success!', description: 'New expense has been added.' });
      handleFormDialogStateChange(false);
      await fetchExpensesAndInventory();
    } catch (error) {
      console.error("Error adding expense:", error);
      toast({ title: 'Error', description: 'Could not add expense. Please try again.', variant: 'destructive' });
    }
  };

  const onUpdateExpense = async (values: z.infer<typeof expenseSchema>) => {
      if (!editingExpense) return;
      const userDocId = localStorage.getItem('userDocId');
      const activeBranchId = localStorage.getItem('activeBranch');
      if (!userDocId || !activeBranchId) return;

      try {
        const expenseRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'expenses', editingExpense.id);

        await updateDoc(expenseRef, {
            ...values,
            date: Timestamp.fromDate(new Date(values.date)),
        });
        
        toast({ title: 'Success!', description: 'Expense details have been updated.' });
        handleFormDialogStateChange(false);
        await fetchExpensesAndInventory();
      } catch (error) {
          console.error("Error updating expense:", error);
          toast({ title: 'Error', description: 'Could not update expense.', variant: 'destructive'});
      }
  }
  
  const onDeleteExpense = async (expenseId: string) => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId) return;
    
    try {
        const expenseRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'expenses', expenseId);
        await deleteDoc(expenseRef);
        toast({ title: "Expense Deleted", description: "The expense has been removed."});
        await fetchExpensesAndInventory();
    } catch (error) {
        console.error("Error deleting expense:", error);
        toast({ title: "Error", description: "Could not delete expense.", variant: "destructive"});
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
          <h1 className="text-3xl font-bold">Expense & Inventory Analytics</h1>
          <p className="text-muted-foreground">Track and manage all your business expenses and stock value.</p>
        </div>
        <Dialog open={isFormDialogOpen} onOpenChange={handleFormDialogStateChange}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add a New Expense'}</DialogTitle>
              <DialogDescription>{editingExpense ? 'Update the details for this expense.' : 'Fill in the details for the new expense entry.'}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Expense Name</FormLabel><FormControl><Input placeholder="e.g., Monthly Rent" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem><FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {expenseCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="amount" render={({ field }) => ( <FormItem><FormLabel>Amount (₹)</FormLabel><FormControl><Input type="number" placeholder="50000" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="date" render={({ field }) => ( <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="Any additional notes..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => handleFormDialogStateChange(false)}>Cancel</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : (editingExpense ? 'Save Changes' : 'Add Expense')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mb-6">
            <Card className="col-span-full lg:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><IndianRupee />This Month's Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold">₹{thisMonthsExpenses.toLocaleString()}</p>
                </CardContent>
            </Card>
             <Card className="col-span-full lg:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Boxes />Total Inventory Value</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold">₹{totalInventoryValue.toLocaleString()}</p>
                </CardContent>
            </Card>
            <Card className="col-span-full lg:col-span-3">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PieChart />Financial Snapshot</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={categoryChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                {categoryChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
       </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense History</CardTitle>
          <CardDescription>A list of all recorded expenses for your branch.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Expense</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length > 0 ? (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.name}</TableCell>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                    <TableCell>₹{expense.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                       <AlertDialog>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setEditingExpense(expense)}><Edit className="mr-2 h-4 w-4"/> Edit</DropdownMenuItem>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash className="mr-2 h-4 w-4"/> Delete</DropdownMenuItem>
                              </AlertDialogTrigger>
                            </DropdownMenuContent>
                          </DropdownMenu>
                           <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete this expense entry.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDeleteExpense(expense.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No expenses recorded yet.
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
