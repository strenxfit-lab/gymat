
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, getDocs, Timestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
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
import { Loader2, PlusCircle, ArrowLeft, MoreHorizontal, Edit, Trash, IndianRupee } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

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

const expenseCategories = [
    "Rent/Lease",
    "Salaries",
    "Utilities",
    "Equipment Maintenance",
    "Marketing & Advertising",
    "Miscellaneous"
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { name: '', category: '', amount: 0, date: '', description: '' },
  });
  
  const fetchExpenses = async () => {
    setLoading(true);
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');

    if (!userDocId || !activeBranchId) {
      toast({ title: "Error", description: "Branch not selected.", variant: "destructive" });
      setLoading(false);
      return;
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

    } catch (error) {
        console.error("Error fetching expenses:", error);
        toast({ title: "Error", description: "Failed to fetch expenses data.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }

  useEffect(() => {
    fetchExpenses();
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

    try {
      const expensesCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'expenses');
      
      await addDoc(expensesCollection, {
        ...values,
        date: Timestamp.fromDate(new Date(values.date)),
        createdAt: Timestamp.now(),
      });

      toast({ title: 'Success!', description: 'New expense has been added.' });
      handleFormDialogStateChange(false);
      await fetchExpenses();
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
        await fetchExpenses();
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
        await fetchExpenses();
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Expense Management</h1>
          <p className="text-muted-foreground">Track and manage all your business expenses.</p>
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
