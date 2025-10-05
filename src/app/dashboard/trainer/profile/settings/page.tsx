
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, setDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, ArrowLeft, Lock, Ban } from 'lucide-react';
import Link from 'next/link';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


const formSchema = z.object({
  privacy: z.enum(['public', 'private']).default('public'),
});

type FormData = z.infer<typeof formSchema>;

export default function TrainerProfileSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      privacy: 'public',
    },
  });

  useEffect(() => {
    const fetchSettingsData = async () => {
      const storedUsername = localStorage.getItem('communityUsername');
      if (!storedUsername) {
        toast({ title: 'Error', description: 'Community profile not found.', variant: 'destructive' });
        router.push('/dashboard/trainer/profile');
        return;
      }
      setUsername(storedUsername);

      try {
        const profileRef = doc(db, 'userCommunity', storedUsername);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          const data = profileSnap.data();
          form.reset({
            privacy: data.privacy || 'public',
          });
          setBlockedUsers(data.blockedUsers || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ title: 'Error', description: 'Failed to fetch your settings.', variant: 'destructive' });
      } finally {
        setIsFetching(false);
      }
    };

    fetchSettingsData();
  }, [router, toast, form]);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    if (!username) {
      toast({ title: "Error", description: "Session expired.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    
    try {
      const profileRef = doc(db, 'userCommunity', username);
      await setDoc(profileRef, { privacy: data.privacy }, { merge: true });
      toast({ title: 'Success!', description: 'Your privacy settings have been updated.' });
      router.push('/dashboard/trainer/profile');
    } catch (error) {
      console.error("Error updating settings:", error);
      toast({ title: 'Error', description: 'Could not save settings.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUnblock = async (userToUnblock: string) => {
    if (!username) return;

    try {
      const currentUserRef = doc(db, 'userCommunity', username);
      await updateDoc(currentUserRef, { blockedUsers: arrayRemove(userToUnblock) });

      setBlockedUsers(prev => prev.filter(u => u !== userToUnblock));
      toast({ title: 'User Unblocked', description: `${userToUnblock} is no longer blocked.`});
    } catch (error) {
       console.error("Error unblocking user:", error);
       toast({ title: "Error", description: "Could not unblock user.", variant: "destructive" });
    }
  };


  if (isFetching) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>Manage your account's privacy and other settings.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-8">
              <FormField
                control={form.control}
                name="privacy"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-base font-semibold">Account Privacy</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="public" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Public - Anyone can see your posts and profile details.
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="private" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Private - Only followers you approve can see your posts.
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <div className="space-y-4">
                <h3 className="text-base font-semibold">Blocked Users</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto rounded-md border p-2">
                    {blockedUsers.length > 0 ? (
                        blockedUsers.map(user => (
                            <div key={user} className="flex items-center justify-between p-2">
                                <span className="font-medium text-sm">{user}</span>
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" size="sm">Unblock</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Unblock {user}?</AlertDialogTitle>
                                            <AlertDialogDescription>They will be able to see your profile and posts, and follow you.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleUnblock(user)}>Unblock</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center p-4">You haven't blocked anyone.</p>
                    )}
                </div>
              </div>

            </CardContent>
            <CardFooter className="flex justify-between">
              <Link href="/dashboard/trainer/profile" passHref>
                <Button variant="outline" type="button"><ArrowLeft className="mr-2 h-4 w-4"/> Cancel</Button>
              </Link>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : 'Save Settings'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
