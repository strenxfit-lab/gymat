
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const formSchema = z.object({
  privacy: z.enum(['public', 'private']).default('public'),
});

type FormData = z.infer<typeof formSchema>;

export default function TrainerProfileSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
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

      try {
        const profileRef = doc(db, 'userCommunity', storedUsername);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          const data = profileSnap.data();
          form.reset({
            privacy: data.privacy || 'public',
          });
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
    const storedUsername = localStorage.getItem('communityUsername');
    if (!storedUsername) {
      toast({ title: "Error", description: "Session expired.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    
    try {
      const profileRef = doc(db, 'userCommunity', storedUsername);
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
