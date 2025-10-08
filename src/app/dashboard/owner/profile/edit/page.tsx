
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button, buttonVariants } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, ArrowLeft, User, Upload } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const formSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters long.").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores."),
  photoUrl: z.string().optional(),
  bio: z.string().max(160, "Bio cannot be longer than 160 characters.").optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']).optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function EditOwnerCommunityProfilePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      photoUrl: '',
      bio: '',
      gender: undefined,
    },
  });

  useEffect(() => {
    const fetchProfileData = async () => {
      const storedUsername = localStorage.getItem('communityUsername');
      if (!storedUsername) {
        toast({ title: 'Error', description: 'Community profile not found.', variant: 'destructive' });
        router.push('/dashboard/owner/profile');
        return;
      }

      try {
        const profileRef = doc(db, 'userCommunity', storedUsername);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          const data = profileSnap.data();
          form.reset({
            username: storedUsername,
            photoUrl: data.photoUrl || '',
            bio: data.bio || '',
            gender: data.gender || undefined,
          });
          if (data.photoUrl) {
              setImagePreview(data.photoUrl);
          }
        } else {
             form.setValue('username', storedUsername);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ title: 'Error', description: 'Failed to fetch your details.', variant: 'destructive' });
      } finally {
        setIsFetching(false);
      }
    };

    fetchProfileData();
  }, [router, toast, form]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        form.setValue('photoUrl', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    const oldUsername = localStorage.getItem('communityUsername');
    const userId = localStorage.getItem('userDocId');
    if (!oldUsername || !userId) {
        toast({ title: "Error", description: "Session expired. Please log in again.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    
    const newUsername = data.username.toLowerCase();

    try {
        // If username has changed, check for availability and migrate document
        if (newUsername !== oldUsername) {
            const newUsernameRef = doc(db, 'userCommunity', newUsername);
            const newUsernameSnap = await getDoc(newUsernameRef);
            if (newUsernameSnap.exists()) {
                form.setError('username', { type: 'manual', message: 'Username is already taken.' });
                setIsLoading(false);
                return;
            }
            // Create new doc and delete old one
            const oldUsernameRef = doc(db, 'userCommunity', oldUsername);
            await setDoc(newUsernameRef, { ...data, userId });
            await deleteDoc(oldUsernameRef);
            localStorage.setItem('communityUsername', newUsername);
        } else {
            // Just update the existing document
            const profileRef = doc(db, 'userCommunity', oldUsername);
            await setDoc(profileRef, { ...data, userId }, { merge: true });
        }

      toast({
        title: 'Success!',
        description: 'Your profile has been updated.',
      });
      router.push('/dashboard/owner/profile');
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isFetching) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Edit Community Profile</CardTitle>
          <CardDescription>Update your public profile information.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-8">
               <div className="flex flex-col items-center gap-4 sm:flex-row">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={imagePreview || undefined} />
                        <AvatarFallback><User className="h-10 w-10"/></AvatarFallback>
                    </Avatar>
                    <FormField
                        control={form.control}
                        name="photoUrl"
                        render={() => (
                            <FormItem>
                            <FormLabel htmlFor="photo-upload" className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer")}>
                                <Upload className="mr-2 h-4 w-4" /> Upload Photo
                            </FormLabel>
                            <FormControl>
                                <Input id="photo-upload" type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
              
              <FormField control={form.control} name="username" render={({ field }) => ( <FormItem><FormLabel>Username</FormLabel><FormControl><Input placeholder="your_username" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="bio" render={({ field }) => ( <FormItem><FormLabel>Bio</FormLabel><FormControl><Textarea placeholder="Tell us a bit about yourself" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="gender" render={({ field }) => (
                <FormItem><FormLabel>Gender</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select your gender" /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
              )} />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Link href="/dashboard/owner/profile" passHref>
                <Button variant="outline" type="button"><ArrowLeft className="mr-2 h-4 w-4"/> Cancel</Button>
              </Link>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : 'Save Changes'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
