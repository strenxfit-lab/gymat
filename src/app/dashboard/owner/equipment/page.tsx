
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

const equipmentSchema = z.object({
  name: z.string().min(1, 'Equipment name is required.'),
  category: z.string().min(1, 'Please select a category.'),
  purchaseDate: z.string().optional(),
  vendor: z.string().optional(),
  warrantyExpiryDate: z.string().optional(),
  serialNumber: z.string().optional(),
});

interface Equipment extends z.infer<typeof equipmentSchema> {
  id: string;
}

const equipmentCategories = [
    "Cardio",
    "Strength",
    "Free Weights",
    "Functional Training",
    "Accessories",
    "Other"
];

export default function EquipmentPage() {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof equipmentSchema>>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: { name: '', category: '', purchaseDate: '', vendor: '', warrantyExpiryDate: '', serialNumber: '' },
  });
  
  const fetchEquipment = async () => {
    setLoading(true);
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');

    if (!userDocId || !activeBranchId) {
      toast({ title: "Error", description: "Branch not selected.", variant: "destructive" });
      setLoading(false);
      return;
    }
    try {
        const equipmentCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'equipment');
        const equipmentSnapshot = await getDocs(equipmentCollection);

        const fetchedList = equipmentSnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                purchaseDate: data.purchaseDate ? (data.purchaseDate as Timestamp).toDate().toISOString().split('T')[0] : '',
                warrantyExpiryDate: data.warrantyExpiryDate ? (data.warrantyExpiryDate as Timestamp).toDate().toISOString().split('T')[0] : '',
            } as Equipment;
        });

        fetchedList.sort((a,b) => a.name.localeCompare(b.name));
        setEquipmentList(fetchedList);

    } catch (error) {
        console.error("Error fetching equipment:", error);
        toast({ title: "Error", description: "Failed to fetch equipment data.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }

  useEffect(() => {
    fetchEquipment();
  }, [toast]);
  
  useEffect(() => {
    if (editingEquipment) {
        form.reset(editingEquipment);
        setIsFormDialogOpen(true);
    } else {
        form.reset({ name: '', category: '', purchaseDate: '', vendor: '', warrantyExpiryDate: '', serialNumber: '' });
    }
  }, [editingEquipment, form]);

  const handleFormDialogStateChange = (open: boolean) => {
      setIsFormDialogOpen(open);
      if (!open) {
          setEditingEquipment(null);
      }
  }

  const handleFormSubmit = async (values: z.infer<typeof equipmentSchema>) => {
    if (editingEquipment) {
        await onUpdateEquipment(values);
    } else {
        await onAddEquipment(values);
    }
  };

  const onAddEquipment = async (values: z.infer<typeof equipmentSchema>) => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId) return;

    try {
      const equipmentCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, 'equipment');
      
      await addDoc(equipmentCollection, {
        ...values,
        purchaseDate: values.purchaseDate ? Timestamp.fromDate(new Date(values.purchaseDate)) : null,
        warrantyExpiryDate: values.warrantyExpiryDate ? Timestamp.fromDate(new Date(values.warrantyExpiryDate)) : null,
        createdAt: Timestamp.now(),
      });

      toast({ title: 'Success!', description: 'New equipment has been added.' });
      handleFormDialogStateChange(false);
      await fetchEquipment();
    } catch (error) {
      console.error("Error adding equipment:", error);
      toast({ title: 'Error', description: 'Could not add equipment. Please try again.', variant: 'destructive' });
    }
  };

  const onUpdateEquipment = async (values: z.infer<typeof equipmentSchema>) => {
      if (!editingEquipment) return;
      const userDocId = localStorage.getItem('userDocId');
      const activeBranchId = localStorage.getItem('activeBranch');
      if (!userDocId || !activeBranchId) return;

      try {
        const equipmentRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'equipment', editingEquipment.id);

        await updateDoc(equipmentRef, {
            ...values,
            purchaseDate: values.purchaseDate ? Timestamp.fromDate(new Date(values.purchaseDate)) : null,
            warrantyExpiryDate: values.warrantyExpiryDate ? Timestamp.fromDate(new Date(values.warrantyExpiryDate)) : null,
        });
        
        toast({ title: 'Success!', description: 'Equipment details have been updated.' });
        handleFormDialogStateChange(false);
        await fetchEquipment();
      } catch (error) {
          console.error("Error updating equipment:", error);
          toast({ title: 'Error', description: 'Could not update equipment.', variant: 'destructive'});
      }
  }
  
  const onDeleteEquipment = async (equipmentId: string) => {
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId) return;
    
    try {
        const equipmentRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, 'equipment', equipmentId);
        await deleteDoc(equipmentRef);
        toast({ title: "Equipment Deleted", description: "The equipment has been removed from the list."});
        await fetchEquipment();
    } catch (error) {
        console.error("Error deleting equipment:", error);
        toast({ title: "Error", description: "Could not delete equipment.", variant: "destructive"});
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Equipment Inventory</h1>
          <p className="text-muted-foreground">Add and manage all your gym equipment.</p>
        </div>
        <div className="flex items-center gap-2">
            <Link href="/dashboard/owner/equipment-maintenance" passHref>
                <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back</Button>
            </Link>
            <Dialog open={isFormDialogOpen} onOpenChange={handleFormDialogStateChange}>
            <DialogTrigger asChild>
                <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Equipment
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                <DialogTitle>{editingEquipment ? 'Edit Equipment' : 'Add New Equipment'}</DialogTitle>
                <DialogDescription>{editingEquipment ? 'Update the details for this piece of equipment.' : 'Fill in the details to add new equipment to your inventory.'}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Equipment Name</FormLabel><FormControl><Input placeholder="e.g., Treadmill" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {equipmentCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                        </Select>
                    <FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="vendor" render={({ field }) => ( <FormItem><FormLabel>Vendor / Manufacturer</FormLabel><FormControl><Input placeholder="e.g., StrenxFit" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="purchaseDate" render={({ field }) => ( <FormItem><FormLabel>Purchase Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="warrantyExpiryDate" render={({ field }) => ( <FormItem><FormLabel>Warranty Expiry</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                    <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number / Asset ID</FormLabel><FormControl><Input placeholder="SN12345" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    
                    <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => handleFormDialogStateChange(false)}>Cancel</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : (editingEquipment ? 'Save Changes' : 'Add Equipment')}
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
          <CardTitle>Equipment List</CardTitle>
          <CardDescription>A list of all registered equipment for your branch.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead>Warranty Expiry</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipmentList.length > 0 ? (
                equipmentList.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>{item.warrantyExpiryDate ? new Date(item.warrantyExpiryDate).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                       <AlertDialog>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setEditingEquipment(item)}><Edit className="mr-2 h-4 w-4"/> Edit</DropdownMenuItem>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash className="mr-2 h-4 w-4"/> Delete</DropdownMenuItem>
                              </AlertDialogTrigger>
                            </DropdownMenuContent>
                          </DropdownMenu>
                           <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete this equipment entry.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDeleteEquipment(item.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No equipment added yet.
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
