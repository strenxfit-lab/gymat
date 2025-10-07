
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, getDocs, Timestamp, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from "@/components/ui/input";
import { Loader2, PlusCircle, ArrowLeft, MoreHorizontal, Edit, Trash, Image as ImageIcon, Link2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Image from 'next/image';

const bannerSchema = z.object({
  imageUrl: z.string().min(1, 'Banner image is required.'),
  linkUrl: z.string().url('Please enter a valid URL.'),
  targetRoles: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You have to select at least one role.",
  }),
  displayLocations: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You have to select at least one display location.",
  }),
  status: z.enum(['active', 'inactive']),
});

interface Banner extends z.infer<typeof bannerSchema> {
  id: string;
}

const roles = [{ id: 'owner', label: 'Owner' }, { id: 'trainer', label: 'Trainer' }, { id: 'member', label: 'Member' }];
const locations = [{ id: 'dashboard', label: 'Dashboard' }, { id: 'community', label: 'Community' }];

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof bannerSchema>>({
    resolver: zodResolver(bannerSchema),
    defaultValues: { imageUrl: '', linkUrl: '', targetRoles: [], displayLocations: [], status: 'active' },
  });

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const bannersCollection = collection(db, 'banners');
      const bannersSnapshot = await getDocs(bannersCollection);
      const bannersList = bannersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner));
      setBanners(bannersList);
    } catch (error) {
      console.error("Error fetching banners:", error);
      toast({ title: "Error", description: "Failed to fetch banners.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, [toast]);

  useEffect(() => {
    if (editingBanner) {
      form.reset(editingBanner);
      setIsFormDialogOpen(true);
    } else {
      form.reset({ imageUrl: '', linkUrl: 'https://', targetRoles: [], displayLocations: [], status: 'active' });
    }
  }, [editingBanner, form]);

  const handleFormDialogStateChange = (open: boolean) => {
    setIsFormDialogOpen(open);
    if (!open) {
      setEditingBanner(null);
    }
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('imageUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (values: z.infer<typeof bannerSchema>) => {
    if (editingBanner) {
      await onUpdateBanner(values);
    } else {
      await onAddBanner(values);
    }
  };

  const onAddBanner = async (values: z.infer<typeof bannerSchema>) => {
    try {
      await addDoc(collection(db, 'banners'), { ...values, createdAt: serverTimestamp() });
      toast({ title: 'Success!', description: 'New banner has been created.' });
      handleFormDialogStateChange(false);
      await fetchBanners();
    } catch (error) {
      console.error("Error adding banner:", error);
      toast({ title: 'Error', description: 'Could not create banner.', variant: 'destructive' });
    }
  };

  const onUpdateBanner = async (values: z.infer<typeof bannerSchema>) => {
    if (!editingBanner) return;
    try {
      const bannerRef = doc(db, 'banners', editingBanner.id);
      await updateDoc(bannerRef, values);
      toast({ title: 'Success!', description: 'Banner details have been updated.' });
      handleFormDialogStateChange(false);
      await fetchBanners();
    } catch (error) {
      console.error("Error updating banner:", error);
      toast({ title: 'Error', description: 'Could not update banner.', variant: 'destructive' });
    }
  };

  const onDeleteBanner = async (bannerId: string) => {
    try {
      await deleteDoc(doc(db, 'banners', bannerId));
      toast({ title: "Banner Deleted", description: "The banner has been removed." });
      await fetchBanners();
    } catch (error) {
      console.error("Error deleting banner:", error);
      toast({ title: "Error", description: "Could not delete banner.", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Banner Management</h1>
          <p className="text-muted-foreground">Create, edit, and manage promotional banners.</p>
        </div>
        <div className="flex items-center gap-2">
            <Dialog open={isFormDialogOpen} onOpenChange={handleFormDialogStateChange}>
                <DialogTrigger asChild>
                    <Button><PlusCircle className="mr-2 h-4 w-4" />Create New Banner</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingBanner ? 'Edit Banner' : 'Create a New Banner'}</DialogTitle>
                        <DialogDescription>Fill in the details for your banner.</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                            <FormField control={form.control} name="imageUrl" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Banner Image</FormLabel>
                                    <FormControl>
                                        <Input type="file" accept="image/*" onChange={handleImageUpload} />
                                    </FormControl>
                                    {field.value && <Image src={field.value} alt="Banner preview" width={200} height={100} className="rounded-md border object-contain mt-2"/>}
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="linkUrl" render={({ field }) => ( <FormItem><FormLabel>Clickable Link</FormLabel><FormControl><Input placeholder="https://example.com/promo" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="targetRoles" render={() => (
                                <FormItem>
                                <FormLabel>Target Roles</FormLabel>
                                <div className="flex flex-wrap gap-4 rounded-md border p-4">
                                {roles.map((item) => (
                                    <FormField key={item.id} control={form.control} name="targetRoles" render={({ field }) => (
                                        <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl><Checkbox checked={field.value?.includes(item.id)} onCheckedChange={(checked) => {
                                                return checked ? field.onChange([...(field.value || []), item.id]) : field.onChange(field.value?.filter((value) => value !== item.id));
                                            }} /></FormControl>
                                            <FormLabel className="font-normal">{item.label}</FormLabel>
                                        </FormItem>
                                    )}/>
                                ))}
                                </div>
                                <FormMessage />
                            </FormItem>
                            )}/>
                             <FormField control={form.control} name="displayLocations" render={() => (
                                <FormItem>
                                <FormLabel>Display Locations</FormLabel>
                                <div className="flex flex-wrap gap-4 rounded-md border p-4">
                                {locations.map((item) => (
                                    <FormField key={item.id} control={form.control} name="displayLocations" render={({ field }) => (
                                        <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl><Checkbox checked={field.value?.includes(item.id)} onCheckedChange={(checked) => {
                                                return checked ? field.onChange([...(field.value || []), item.id]) : field.onChange(field.value?.filter((value) => value !== item.id));
                                            }} /></FormControl>
                                            <FormLabel className="font-normal">{item.label}</FormLabel>
                                        </FormItem>
                                    )}/>
                                ))}
                                </div>
                                <FormMessage />
                            </FormItem>
                            )}/>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => handleFormDialogStateChange(false)}>Cancel</Button>
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : (editingBanner ? 'Save Changes' : 'Create Banner')}
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
          <CardTitle>All Banners</CardTitle>
          <CardDescription>A list of all promotional banners.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {banners.length > 0 ? banners.map(banner => (
                    <div key={banner.id} className="border rounded-lg p-4 space-y-3">
                        <Image src={banner.imageUrl} alt="Banner" width={400} height={200} className="rounded-md w-full object-contain"/>
                        <p className="text-sm flex items-center gap-2 truncate"><Link2 className="h-4 w-4"/> <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{banner.linkUrl}</a></p>
                        <div className="flex gap-2">Roles: {banner.targetRoles.map(r => <span key={r} className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded-full">{r}</span>)}</div>
                        <div className="flex gap-2">Locations: {banner.displayLocations.map(l => <span key={l} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{l}</span>)}</div>
                        <div className="flex justify-end gap-2">
                             <Button variant="outline" size="sm" onClick={() => setEditingBanner(banner)}><Edit className="mr-2 h-4 w-4"/> Edit</Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash className="mr-2 h-4 w-4"/> Delete</Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete this banner.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => onDeleteBanner(banner.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                )) : <p className="text-muted-foreground col-span-2 text-center py-8">No banners created yet.</p>}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
