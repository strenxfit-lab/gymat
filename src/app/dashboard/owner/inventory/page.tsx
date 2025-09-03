
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
import { Loader2, PlusCircle, ArrowLeft, MoreHorizontal, Edit, Trash } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const inventorySchema = z.object({
  name: z.string().min(1, 'Item name is required.'),
  category: z.string().min(1, 'Please select a category.'),
  quantity: z.coerce.number().min(0, 'Quantity cannot be negative.'),
  unit: z.string().min(1, 'Please select a unit.'),
  purchasePrice: z.coerce.number().optional(),
  sellingPrice: z.coerce.number().optional(),
  supplier: z.string().optional(),
});

interface InventoryItem extends z.infer<typeof inventorySchema> {
  id: string;
}

const itemCategories = [
    "Supplements",
    "Apparel",
    "Accessories",
    "Equipment Spare Parts",
    "Cleaning Supplies",
    "Office Supplies",
    "Other"
];

const itemUnits = ["pcs", "kg", "grams", "liters", "ml", "box", "bottle"];

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof inventorySchema>>({
    resolver: zodResolver(inventorySchema),
    defaultValues: { name: '', category: '', quantity: 0, unit: '', purchasePrice: 0, sellingPrice: 0, supplier: '' },
  });
  
  const fetchInventory = async () => {
    setLoading(true);
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');

    if (!userDocId || !activeBranchId) {
      toast({ title: "Error", description: "Branch not selected.", variant: "destructive" });
      setLoading(false);
      return;
    }
    try {
        const inventoryCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'inventory');
        const inventorySnapshot = await getDocs(inventoryCollection);

        const fetchedList = inventorySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
            } as InventoryItem;
        });

        fetchedList.sort((a,b) => a.name.localeCompare(b.name));
        setInventory(fetchedList);

    } catch (error) {
        console.error("Error fetching inventory:", error);
        toast({ title: "Error", description: "Failed to fetch inventory data.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }

  useEffect(() => {
    fetchInventory();
  }, [toast]);
  
  useEffect(() => {
    if (editingItem) {
        form.reset(editingItem);
        setIsFormDialogOpen(true);
    } else {
        form.reset({ name: '', category: '', quantity: 0, unit: '', purchasePrice: 0, sellingPrice: 0, supplier: '' });
    }
  }, [editingItem, form]);

  const handleFormDialogStateChange = (open: boolean) => {
      setIsFormDialogOpen(open);
      if (!open) {
          setEditingItem(null);
      }
  }

  const handleFormSubmit = async (values: z.infer<typeof inventorySchema>) => {
    if (editingItem) {
        await onUpdateItem(values);
    } else {
        await onAddItem(values);
    }
  };

  const onAddItem = async (values: z.infer<typeof inventorySchema>) => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId) return;

    try {
      const inventoryCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'inventory');
      
      await addDoc(inventoryCollection, {
        ...values,
        createdAt: Timestamp.now(),
      });

      toast({ title: 'Success!', description: 'New item has been added to inventory.' });
      handleFormDialogStateChange(false);
      await fetchInventory();
    } catch (error) {
      console.error("Error adding item:", error);
      toast({ title: 'Error', description: 'Could not add item. Please try again.', variant: 'destructive' });
    }
  };

  const onUpdateItem = async (values: z.infer<typeof inventorySchema>) => {
      if (!editingItem) return;
      const userDocId = localStorage.getItem('userDocId');
      const activeBranchId = localStorage.getItem('activeBranch');
      if (!userDocId || !activeBranchId) return;

      try {
        const itemRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'inventory', editingItem.id);

        await updateDoc(itemRef, { ...values });
        
        toast({ title: 'Success!', description: 'Item details have been updated.' });
        handleFormDialogStateChange(false);
        await fetchInventory();
      } catch (error) {
          console.error("Error updating item:", error);
          toast({ title: 'Error', description: 'Could not update item.', variant: 'destructive'});
      }
  }
  
  const onDeleteItem = async (itemId: string) => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId) return;
    
    try {
        const itemRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'inventory', itemId);
        await deleteDoc(itemRef);
        toast({ title: "Item Deleted", description: "The item has been removed from your inventory."});
        await fetchInventory();
    } catch (error) {
        console.error("Error deleting item:", error);
        toast({ title: "Error", description: "Could not delete item.", variant: "destructive"});
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">Add and manage all your sellable products and supplies.</p>
        </div>
        <div className="flex items-center gap-2">
            <Link href="/dashboard/owner/inventory-tracking" passHref>
                <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back</Button>
            </Link>
            <Dialog open={isFormDialogOpen} onOpenChange={handleFormDialogStateChange}>
            <DialogTrigger asChild>
                <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Item
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item to Inventory'}</DialogTitle>
                <DialogDescription>{editingItem ? 'Update the details for this item.' : 'Fill in the details to add a new item to your inventory.'}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Item Name</FormLabel><FormControl><Input placeholder="e.g., Whey Protein" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {itemCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                        </Select>
                    <FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="quantity" render={({ field }) => ( <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" placeholder="10" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="unit" render={({ field }) => (
                        <FormItem><FormLabel>Unit</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {itemUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                            </Select>
                        <FormMessage /></FormItem>
                        )} />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="purchasePrice" render={({ field }) => ( <FormItem><FormLabel>Purchase Price (₹)</FormLabel><FormControl><Input type="number" placeholder="1000" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="sellingPrice" render={({ field }) => ( <FormItem><FormLabel>Selling Price (₹)</FormLabel><FormControl><Input type="number" placeholder="1200" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                    <FormField control={form.control} name="supplier" render={({ field }) => ( <FormItem><FormLabel>Supplier / Vendor</FormLabel><FormControl><Input placeholder="e.g., HealthFirst Suppliers" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    
                    <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => handleFormDialogStateChange(false)}>Cancel</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : (editingItem ? 'Save Changes' : 'Add Item')}
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
          <CardTitle>Inventory List</CardTitle>
          <CardDescription>A list of all inventory items for your branch.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Purchase Price</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.length > 0 ? (
                inventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.quantity} {item.unit}</TableCell>
                    <TableCell>₹{item.purchasePrice?.toLocaleString() || 'N/A'}</TableCell>
                    <TableCell>₹{item.sellingPrice?.toLocaleString() || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                       <AlertDialog>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setEditingItem(item)}><Edit className="mr-2 h-4 w-4"/> Edit</DropdownMenuItem>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash className="mr-2 h-4 w-4"/> Delete</DropdownMenuItem>
                              </AlertDialogTrigger>
                            </DropdownMenuContent>
                          </DropdownMenu>
                           <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete this item from your inventory.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDeleteItem(item.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No items in inventory yet.
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

    