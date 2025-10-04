
"use client";

import { useState, useEffect, useRef } from "react";
import { collection, addDoc, query, onSnapshot, serverTimestamp, Timestamp, where, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Plus, Image as ImageIcon, Video, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";


interface Post {
    id: string;
    authorName: string;
    authorId: string;
    gymId: string;
    text: string;
    mediaUrls?: { url: string, type: 'image' | 'video' }[];
    createdAt: Date;
    visibility: 'local' | 'global';
}

const postSchema = z.object({
  text: z.string().min(1, "Post content cannot be empty.").or(z.literal('')),
  visibility: z.enum(['local', 'global'], { required_error: "You must select a visibility option."}),
  mediaUrls: z.array(z.object({
      url: z.string(),
      type: z.enum(['image', 'video'])
  })).optional(),
}).refine(data => !!data.text || (data.mediaUrls && data.mediaUrls.length > 0), {
    message: "Post must contain either text or media.",
    path: ["text"],
});

type PostFormData = z.infer<typeof postSchema>;

const usernameSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters.").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores."),
});
type UsernameFormData = z.infer<typeof usernameSchema>;


export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('global');
  const [hasCommunityProfile, setHasCommunityProfile] = useState(true);
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const [mediaPreviews, setMediaPreviews] = useState<{url: string, type: 'image' | 'video'}[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);


  const postForm = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      text: "",
      visibility: "local",
      mediaUrls: [],
    },
  });

  const usernameForm = useForm<UsernameFormData>({
    resolver: zodResolver(usernameSchema),
    defaultValues: { username: "" },
  });
  
  useEffect(() => {
    const communityUsername = localStorage.getItem('communityUsername');
    const role = localStorage.getItem('userRole');
    if (!communityUsername && role) {
        setHasCommunityProfile(false);
        setIsUsernameDialogOpen(true);
    } else {
        setHasCommunityProfile(true);
    }
  }, []);

  useEffect(() => {
    if (!hasCommunityProfile) return;
    
    setIsLoading(true);
    const gymId = localStorage.getItem('userDocId');
    if (!gymId) {
        setIsLoading(false);
        return;
    }

    let q;
    if (activeTab === 'global') {
        q = query(collection(db, "gymRats"), where("visibility", "==", "global"));
    } else { // 'your_gym'
        q = query(collection(db, "gymRats"), where("gymId", "==", gymId));
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const postsData: Post[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.createdAt) { // Ensure createdAt exists before processing
          postsData.push({
            id: doc.id,
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate(),
          } as Post);
        }
      });
      // Sort posts on the client-side
      postsData.sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return b.createdAt.getTime() - a.createdAt.getTime()
      });
      setPosts(postsData);
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching posts: ", error);
        toast({ title: "Error", description: "Could not fetch community posts.", variant: "destructive" });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [activeTab, toast, hasCommunityProfile]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const files = e.target.files;
    if (!files) return;

    if (type === 'video') {
        const file = files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            const newMedia = [{ url: result, type: 'video' }];
            setMediaPreviews(newMedia);
            postForm.setValue('mediaUrls', newMedia);
        };
        reader.readAsDataURL(file);
    } else { // image
        const imageFiles = Array.from(files);
        const currentImageCount = mediaPreviews.filter(m => m.type === 'image').length;

        if (currentImageCount + imageFiles.length > 3) {
            toast({ title: "Limit Exceeded", description: "You can upload a maximum of 3 photos.", variant: "destructive" });
            return;
        }

        const newPreviews = [...mediaPreviews.filter(m => m.type === 'image')];

        let filesProcessed = 0;
        imageFiles.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                newPreviews.push({ url: result, type: 'image' });
                filesProcessed++;
                if(filesProcessed === imageFiles.length) {
                    setMediaPreviews(newPreviews);
                    postForm.setValue('mediaUrls', newPreviews);
                }
            };
            reader.readAsDataURL(file);
        });
    }
  };
  
  const clearMedia = (index?: number) => {
      if (typeof index === 'number') {
        const newPreviews = mediaPreviews.filter((_, i) => i !== index);
        setMediaPreviews(newPreviews);
        postForm.setValue('mediaUrls', newPreviews);
      } else {
        setMediaPreviews([]);
        postForm.setValue('mediaUrls', []);
      }
      if(imageInputRef.current) imageInputRef.current.value = "";
      if(videoInputRef.current) videoInputRef.current.value = "";
  }

  const handlePostSubmit = async (values: PostFormData) => {
    setIsSubmitting(true);
    const gymId = localStorage.getItem('userDocId');
    const authorName = localStorage.getItem('communityUsername') || localStorage.getItem('userName');
    const authorId = localStorage.getItem('trainerId');

    if (!gymId || !authorId || !authorName) {
        toast({ title: "Error", description: "You must be logged in to post.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    
    try {
        await addDoc(collection(db, "gymRats"), {
            authorName,
            authorId,
            gymId,
            text: values.text,
            visibility: values.visibility,
            mediaUrls: values.mediaUrls || [],
            createdAt: serverTimestamp(),
        });
        toast({ title: "Success!", description: "Your post has been published."});
        postForm.reset();
        clearMedia();
        setIsPostDialogOpen(false);
    } catch (error) {
        console.error("Error creating post: ", error);
        toast({ title: "Error", description: "Could not create post.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

  const onUsernameSubmit = async (data: UsernameFormData) => {
    setIsSubmitting(true);
    const username = data.username.toLowerCase();
    const userId = localStorage.getItem('trainerId');
    if (!userId) {
        toast({ title: "Error", description: "User session not found.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    try {
        const usernameRef = doc(db, 'userCommunity', username);
        const usernameSnap = await getDoc(usernameRef);
        if (usernameSnap.exists()) {
            usernameForm.setError('username', { type: 'manual', message: 'Username already taken.'});
            return;
        }

        await setDoc(usernameRef, { userId: userId, createdAt: serverTimestamp() });
        localStorage.setItem('communityUsername', username);
        toast({ title: 'Welcome!', description: `Your username "${username}" has been set.`});
        setIsUsernameDialogOpen(false);
        setHasCommunityProfile(true);
    } catch (error) {
        console.error("Error setting username:", error);
        toast({ title: 'Error', description: 'Could not set username. Please try again.', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const renderFeed = () => {
    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>;
    }

    if (posts.length === 0) {
        return (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No posts yet.</p>
                <p className="text-sm text-muted-foreground">Be the first to start a conversation!</p>
            </div>
        );
    }

    return posts.map(post => (
        <Card key={post.id} className="mb-4">
            <CardHeader className="flex flex-row items-center gap-4">
                <Avatar>
                    <AvatarFallback>{post.authorName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-base">{post.authorName}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                        {post.createdAt ? `${formatDistanceToNow(post.createdAt)} ago` : 'just now'}
                    </p>
                </div>
            </CardHeader>
            <CardContent>
                {post.text && <p className="whitespace-pre-wrap mb-4">{post.text}</p>}
                {post.mediaUrls && post.mediaUrls.length > 0 && (
                    <div className={cn("grid gap-2", post.mediaUrls.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                        {post.mediaUrls.map((media, index) => (
                            <div key={index} className="rounded-lg overflow-hidden border">
                                {media.type === 'image' ? (
                                    <Image src={media.url} alt={`Post media ${index + 1}`} width={500} height={500} className="w-full h-auto object-cover"/>
                                ) : (
                                    <video src={media.url} controls className="w-full h-auto"/>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    ));
  };
  
  if (!hasCommunityProfile) {
    return (
        <Dialog open={isUsernameDialogOpen} onOpenChange={setIsUsernameDialogOpen}>
            <DialogContent onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>Create Your Community Username</DialogTitle>
                    <DialogDescription>
                        Choose a unique username to participate in the community. This cannot be changed later.
                    </DialogDescription>
                </DialogHeader>
                 <Form {...usernameForm}>
                    <form onSubmit={usernameForm.handleSubmit(onUsernameSubmit)} className="space-y-4">
                         <FormField
                            control={usernameForm.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., gymlover99" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : null}
                                Continue
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
  }


  return (
    <div className="h-full w-full flex flex-col relative">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
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
                    {renderFeed()}
                </div>
            </TabsContent>
            <TabsContent value="your_gym" className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="max-w-2xl mx-auto w-full">
                    {renderFeed()}
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
                 <Form {...postForm}>
                    <form onSubmit={postForm.handleSubmit(handlePostSubmit)} className="space-y-4">
                        <FormField
                            control={postForm.control}
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
                        
                        <div className="flex flex-wrap gap-2">
                            {mediaPreviews.map((media, index) => (
                                <div key={index} className="relative">
                                    {media.type === 'image' ? (
                                        <Image src={media.url} alt="preview" width={80} height={80} className="rounded-md object-cover h-20 w-20"/>
                                    ) : (
                                        <video src={media.url} className="w-full h-auto rounded-md" />
                                    )}
                                    <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 bg-black/50 hover:bg-black/75 text-white" onClick={() => clearMedia(index)}>
                                        <X className="h-4 w-4"/>
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                             <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()} disabled={mediaPreviews.some(m => m.type === 'video') || mediaPreviews.filter(m => m.type === 'image').length >= 3}>
                                <ImageIcon className="mr-2 h-4 w-4"/> Add Photo(s)
                            </Button>
                            <input type="file" ref={imageInputRef} multiple accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'image')} />
                            
                             <Button type="button" variant="outline" onClick={() => videoInputRef.current?.click()} disabled={mediaPreviews.length > 0}>
                                <Video className="mr-2 h-4 w-4"/> Add Video
                            </Button>
                            <input type="file" ref={videoInputRef} accept="video/*" className="hidden" onChange={(e) => handleFileChange(e, 'video')} />
                        </div>

                         <FormField
                            control={postForm.control}
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
