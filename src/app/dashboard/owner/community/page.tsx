"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Plus, Image as ImageIcon, Video } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

interface Post {
    id: string;
    authorName: string;
    authorId: string;
    gymId: string;
    text: string;
    createdAt: Date;
}

const postSchema = z.object({
  text: z.string().min(1, "Post content cannot be empty."),
  visibility: z.enum(['local', 'global'], { required_error: "You must select a visibility option."}),
  // mediaUrl: z.string().optional(), // For future use
});

type PostFormData = z.infer<typeof postSchema>;

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      text: "",
      visibility: "local",
    },
  });

  useEffect(() => {
    // Note: This currently fetches all posts for the "Global" feed.
    // Filtering for "Your Gym" would be a future step.
    const q = query(collection(db, "gymRats"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const postsData: Post[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        postsData.push({
          id: doc.id,
          ...data,
          createdAt: (data.createdAt as Timestamp)?.toDate(),
        } as Post);
      });
      setPosts(postsData);
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching posts: ", error);
        toast({ title: "Error", description: "Could not fetch community posts.", variant: "destructive" });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handlePostSubmit = async (values: PostFormData) => {
    setIsSubmitting(true);
    const gymId = localStorage.getItem('userDocId');
    const authorName = "Gym Owner"; // In a real app, this would be dynamic
    const authorId = localStorage.getItem('userDocId');

    if (!gymId || !authorId) {
        toast({ title: "Error", description: "You must be logged in to post.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    
    try {
        await addDoc(collection(db, "gymRats"), {
            authorName,
            authorId,
            gymId,
            description: values.text,
            visibility: values.visibility,
            mediaUrl: '', // Placeholder for now
            createdAt: serverTimestamp(),
        });
        toast({ title: "Success!", description: "Your post has been published."});
        form.reset();
        setIsPostDialogOpen(false);
    } catch (error) {
        console.error("Error creating post: ", error);
        toast({ title: "Error", description: "Could not create post.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <div className="h-full w-full flex flex-col relative">
        <Tabs defaultValue="global" className="flex-1 flex flex-col">
            <header className="p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Community</h1>
                    <TabsList>
                        <TabsTrigger value="your_gym">Your Gym</TabsTrigger>
                        <TabsTrigger value="global">Global</TabsTrigger>
                    </TabsList>
                </div>
            </header>
            
            <TabsContent value="global" className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="max-w-2xl mx-auto w-full">
                    {isLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>
                    ) : posts.length > 0 ? (
                        posts.map(post => (
                            <Card key={post.id} className="mb-4">
                                <CardHeader className="flex flex-row items-center gap-4">
                                    <Avatar>
                                        <AvatarFallback>{post.authorName?.charAt(0) || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <CardTitle className="text-base">{post.authorName}</CardTitle>
                                        <p className="text-xs text-muted-foreground">
                                            {post.createdAt ? `${formatDistanceToNow(post.createdAt)} ago` : 'just now'}
                                        </p>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="whitespace-pre-wrap">{post.text}</p>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">No posts yet.</p>
                            <p className="text-sm text-muted-foreground">Be the first to start a conversation!</p>
                        </div>
                    )}
                </div>
            </TabsContent>
            <TabsContent value="your_gym" className="flex-1 overflow-y-auto p-4">
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">"Your Gym" feed coming soon!</p>
            </div>
            </TabsContent>
        </Tabs>
        
        <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
            <DialogTrigger asChild>
                <Button className="absolute bottom-6 right-6 h-14 w-14 rounded-full shadow-lg">
                    <Plus className="h-6 w-6" />
                    <span className="sr-only">Create Post</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                 <DialogHeader>
                    <DialogTitle>Create a New Post</DialogTitle>
                    <DialogDescription>
                        Share an update, photo, or video with the community.
                    </DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(handlePostSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="text"
                            render={({ field }) => (
                                <FormItem>
                                <FormControl>
                                    <Textarea
                                        placeholder="What's on your mind?"
                                        className="min-h-[120px]"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex gap-2">
                             <Button type="button" variant="outline" disabled>
                                <ImageIcon className="mr-2 h-4 w-4"/> Add Photo
                            </Button>
                             <Button type="button" variant="outline" disabled>
                                <Video className="mr-2 h-4 w-4"/> Add Video
                            </Button>
                        </div>
                         <FormField
                            control={form.control}
                            name="visibility"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel>Visibility</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="local" /></FormControl><FormLabel className="font-normal">Your Gym</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="global" /></FormControl><FormLabel className="font-normal">Global</FormLabel></FormItem>
                                    </RadioGroup>
                                </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsPostDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Send className="mr-2 h-4 w-4"/>} Post
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    </div>
  );
}
