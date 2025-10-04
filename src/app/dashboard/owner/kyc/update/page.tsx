
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Loader2, User, Fingerprint, ArrowLeft, Search, Check, Upload } from 'lucide-react';
import Image from 'next/image';

const kycSchema = z.object({
  role: z.enum(['member', 'trainer'], { required_error: 'Please select a role.' }),
  userId: z.string().min(1, 'Please select a user.'),
  idType: z.enum(['aadhar', 'pan'], { required_error: 'Please select an ID type.' }),
  idNumber: z.string().min(1, 'ID number is required.'),
  aadharFront: z.any().optional(),
  aadharBack: z.any().optional(),
  panCard: z.any().optional(),
  selfie: z.any().optional(),
  qualification: z.any().optional(),
  notes: z.string().optional(),
}).refine(data => {
    if (data.idType === 'aadhar') return !!data.aadharFront && !!data.aadharBack;
    return true;
}, {
    message: 'Aadhar front and back images are required.',
    path: ['aadharFront'],
}).refine(data => {
    if (data.idType === 'pan') return !!data.panCard;
    return true;
}, {
    message: 'PAN card image is required.',
    path: ['panCard'],
});

type KycFormData = z.infer<typeof kycSchema>;

interface UserOption {
  id: string;
  name: string;
}

export default function UpdateKycPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<Record<string, string | null>>({});

  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<KycFormData>({
    resolver: zodResolver(kycSchema),
    defaultValues: { role: undefined, userId: '', idType: undefined, idNumber: '' },
  });

  const selectedRole = form.watch('role');
  const selectedIdType = form.watch('idType');

  useEffect(() => {
    const fetchUsers = async () => {
      if (!selectedRole) {
        setUserOptions([]);
        return;
      }
      const userDocId = localStorage.getItem('userDocId');
      const activeBranchId = localStorage.getItem('activeBranch');
      if (!userDocId || !activeBranchId) return;

      const collectionName = selectedRole === 'member' ? 'members' : 'trainers';
      const usersCollection = collection(db, 'gyms', userDocId, 'branches', activeBranchId, collectionName);
      const usersSnapshot = await getDocs(usersCollection);
      setUserOptions(usersSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().fullName })));
    };
    fetchUsers();
  }, [selectedRole]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof KycFormData) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        form.setValue(fieldName, result);
        setImagePreviews(prev => ({ ...prev, [fieldName]: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: KycFormData) => {
    setIsLoading(true);
    const userDocId = localStorage.getItem('userDocId');
    const activeBranchId = localStorage.getItem('activeBranch');
    if (!userDocId || !activeBranchId) {
      toast({ title: 'Error', description: 'Session data missing.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    try {
        const collectionName = data.role === 'member' ? 'members' : 'trainers';
        const userRef = doc(db, 'gyms', userDocId, 'branches', activeBranchId, collectionName, data.userId);
        const kycCollection = collection(userRef, 'kyc');
        const kycDocRef = doc(kycCollection, 'details'); // Use a consistent doc ID

        const kycData = {
            idType: data.idType,
            idNumber: data.idNumber,
            aadharFrontUrl: data.aadharFront || null,
            aadharBackUrl: data.aadharBack || null,
            panUrl: data.panCard || null,
            selfieUrl: data.selfie || null,
            qualificationUrl: data.qualification || null,
            notes: data.notes || '',
            updatedAt: serverTimestamp(),
        };

        await setDoc(kycDocRef, kycData);
        toast({ title: 'Success!', description: 'KYC details have been saved.' });
        router.push('/dashboard/owner');

    } catch (error) {
      console.error("Error saving KYC:", error);
      toast({ title: 'Error', description: 'Could not save KYC details.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const FileUpload = ({ name, label, required, acceptedTypes }: { name: keyof KycFormData, label: string, required?: boolean, acceptedTypes?: string }) => (
      <FormField
          control={form.control}
          name={name}
          render={({ field }) => (
              <FormItem>
                  <FormLabel>{label} {required && <span className="text-destructive">*</span>}</FormLabel>
                   <div className="flex items-center gap-4">
                        {imagePreviews[name] && <Image src={imagePreviews[name]!} alt={`${label} preview`} width={80} height={50} className="rounded-md border object-cover"/>}
                        <Input id={name} type="file" accept={acceptedTypes || "image/*"} onChange={(e) => handleFileChange(e, name)} className="hidden"/>
                        <Button type="button" variant="outline" asChild>
                            <label htmlFor={name} className="cursor-pointer flex items-center gap-2"><Upload className="h-4 w-4"/>Upload</label>
                        </Button>
                    </div>
                  <FormMessage />
              </FormItem>
          )}
      />
  );

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-2xl mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Fingerprint /> Update KYC</CardTitle>
              <CardDescription>Upload and save KYC documents for a member or trainer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="role" render={({ field }) => (
                        <FormItem><FormLabel>Select Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                            <SelectContent><SelectItem value="member">Member</SelectItem><SelectItem value="trainer">Trainer</SelectItem></SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="userId" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Select User</FormLabel>
                        <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                        {field.value ? userOptions.find(u => u.id === field.value)?.name : "Select user"}
                                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command><CommandInput placeholder="Search user..."/><CommandList><CommandEmpty>No users found.</CommandEmpty>
                                    <CommandGroup>
                                        {userOptions.map((user) => (
                                            <CommandItem value={user.name} key={user.id} onSelect={() => { form.setValue('userId', user.id); setIsDropdownOpen(false);}}>
                                                <Check className={cn("mr-2 h-4 w-4", user.id === field.value ? "opacity-100" : "opacity-0")} />{user.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList></Command>
                            </PopoverContent>
                        </Popover><FormMessage />
                        </FormItem>
                    )} />
                </div>
                 <FormField control={form.control} name="idType" render={({ field }) => (
                    <FormItem className="space-y-3"><FormLabel>ID Type</FormLabel>
                    <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                            <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="aadhar" /></FormControl><FormLabel className="font-normal">Aadhar Card</FormLabel></FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="pan" /></FormControl><FormLabel className="font-normal">PAN Card</FormLabel></FormItem>
                        </RadioGroup>
                    </FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="idNumber" render={({ field }) => ( <FormItem><FormLabel>ID Number</FormLabel><FormControl><Input placeholder="Enter Aadhar or PAN number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                
                <div className="space-y-4">
                    {selectedIdType === 'aadhar' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FileUpload name="aadharFront" label="Aadhar Front" required/>
                            <FileUpload name="aadharBack" label="Aadhar Back" required/>
                        </div>
                    )}
                    {selectedIdType === 'pan' && <FileUpload name="panCard" label="PAN Card" required/>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FileUpload name="selfie" label="Selfie (Optional)"/>
                        {selectedRole === 'trainer' && <FileUpload name="qualification" label="Qualification Cert. (Optional)" />}
                    </div>
                </div>

                <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes / Remarks</FormLabel><FormControl><Textarea placeholder="Any notes..." {...field} /></FormControl><FormMessage /></FormItem> )} />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Link href="/dashboard/owner">
                <Button variant="outline" type="button"><ArrowLeft className="mr-2 h-4 w-4" />Cancel</Button>
              </Link>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : 'Save KYC Details'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
