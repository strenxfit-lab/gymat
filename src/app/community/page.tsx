
"use client";

import { useState, useEffect, useRef } from "react";
import { collection, addDoc, query, onSnapshot, serverTimestamp, Timestamp, where, getDocs, doc, setDoc, updateDoc, arrayUnion, arrayRemove, limit, startAt, endAt, orderBy, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Plus, Image as ImageIcon, Video, X, ThumbsUp, MessageSquare, MoreVertical, Flag, Repeat, Share2, Search, User, Rss, LayoutDashboard, Edit, Trash } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { BottomNavbar } from "@/components/ui/bottom-navbar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Link from "next/link";


interface Comment {
    id: string;
    authorId: string;
    authorName: string;
    text: string;
    createdAt: Date;
}

interface Post {
    id: string;
    authorName: string;
    authorId: string;
    authorPhotoUrl?: string;
    gymId: string;
    text: string;
    mediaUrls?: { url: string, type: 'image' | 'video' }[];
    createdAt: Date;
    visibility: 'local' | 'global';
    likes?: string[];
    comments?: Comment[];
    repost?: {
        originalAuthorName: string;
        originalAuthorId: string;
        originalText?: string;
        originalMediaUrls?: { url: string, type: 'image' | 'video' }[];
    }
}

interface Chat {
    id: string;
    participants: string[];
    otherParticipant?: string;
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

const commentSchema = z.object({
    text: z.string().min(1, "Comment cannot be empty."),
});
type CommentFormData = z.infer<typeof commentSchema>;

const repostSchema = z.object({
  caption: z.string().optional(),
  visibility: z.enum(['local', 'global']),
});
type RepostFormData = z.infer<typeof repostSchema>;


export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('global');
  const [hasCommunityProfile, setHasCommunityProfile] = useState<boolean | null>(null);
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const [mediaPreviews, setMediaPreviews] = useState<{url: string, type: 'image' | 'video'}[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  
  const [repostingPost, setRepostingPost] = useState<Post | null>(null);
  const [isRepostDialogOpen, setIsRepostDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [userChats, setUserChats] = useState<Chat[]>([]);
  const [isFetchingChats, setIsFetchingChats] = useState(false);

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

  const commentForm = useForm<CommentFormData>({
      resolver: zodResolver(commentSchema),
      defaultValues: { text: "" },
  });

  const repostForm = useForm<RepostFormData>({
    resolver: zodResolver(repostSchema),
    defaultValues: { caption: '', visibility: "local" },
  });

  useEffect(() => {
    if (editingPost) {
        postForm.reset({
            text: editingPost.text,
            visibility: editingPost.visibility,
            mediaUrls: editingPost.mediaUrls || [],
        });
        setMediaPreviews(editingPost.mediaUrls || []);
        setIsPostDialogOpen(true);
    } else {
        postForm.reset({ text: '', visibility: 'local', mediaUrls: []});
        setMediaPreviews([]);
    }
  }, [editingPost, postForm]);
  
  useEffect(() => {
    const checkCommunityProfile = async () => {
      const userId = localStorage.getItem('memberId');
      if (!userId) {
        setHasCommunityProfile(false);
        setIsLoading(false);
        return;
      }
      
      const storedUsername = localStorage.getItem('communityUsername');
      if (storedUsername) {
        setHasCommunityProfile(true);
        return;
      }

      const q = query(collection(db, 'userCommunity'), where('userId', '==', userId), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const username = querySnapshot.docs[0].id;
        localStorage.setItem('communityUsername', username);
        setHasCommunityProfile(true);
      } else {
        setHasCommunityProfile(false);
        setIsUsernameDialogOpen(true);
      }
    };
    checkCommunityProfile();
  }, []);

  useEffect(() => {
    if (hasCommunityProfile !== true) return;

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
    const authorId = localStorage.getItem('memberId');

    if (!gymId || !authorId || !authorName) {
        toast({ title: "Error", description: "You must be logged in to post.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    
    try {
      if (editingPost) {
        const postRef = doc(db, 'gymRats', editingPost.id);
        await updateDoc(postRef, {
            text: values.text,
            visibility: values.visibility,
            mediaUrls: values.mediaUrls || [],
        });
        toast({ title: "Success!", description: "Your post has been updated." });
    } else {
        await addDoc(collection(db, "gymRats"), {
            authorName,
            authorId,
            gymId,
            text: values.text,
            visibility: values.visibility,
            mediaUrls: values.mediaUrls || [],
            createdAt: serverTimestamp(),
            likes: [],
            comments: [],
        });
        toast({ title: "Success!", description: "Your post has been published."});
    }
    postForm.reset();
    clearMedia();
    setIsPostDialogOpen(false);
    setEditingPost(null);
    } catch (error) {
        console.error("Error creating/updating post: ", error);
        toast({ title: "Error", description: "Could not save post.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

  const onUsernameSubmit = async (data: UsernameFormData) => {
    setIsSubmitting(true);
    const username = data.username.toLowerCase();
    const userId = localStorage.getItem('memberId');
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
            setIsSubmitting(false);
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
        setIsSubmitting(false);
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const handleLike = async (postId: string) => {
    const userId = localStorage.getItem('memberId');
    if (!userId) return;

    const postRef = doc(db, 'gymRats', postId);
    const post = posts.find(p => p.id === postId);
    const isLiked = post?.likes?.includes(userId);

    try {
        await updateDoc(postRef, {
            likes: isLiked ? arrayRemove(userId) : arrayUnion(userId)
        });
    } catch (error) {
        console.error("Error liking post:", error);
        toast({ title: 'Error', description: 'Could not update like status.', variant: 'destructive' });
    }
  };

  const handleCommentSubmit = async (postId: string, data: CommentFormData) => {
    const authorId = localStorage.getItem('memberId');
    const authorName = localStorage.getItem('communityUsername') || localStorage.getItem('userName');
    if (!authorId || !authorName) return;

    const postRef = doc(db, 'gymRats', postId);
    const newComment = {
        id: new Date().toISOString(), // Simple unique ID
        authorId,
        authorName,
        text: data.text,
        createdAt: new Date(),
    };

    try {
        await updateDoc(postRef, {
            comments: arrayUnion(newComment)
        });
        commentForm.reset();
    } catch (error) {
        console.error("Error adding comment:", error);
        toast({ title: 'Error', description: 'Could not post comment.', variant: 'destructive' });
    }
  };
  
  const handleReportPost = async (postId: string) => {
    toast({ title: "Post Reported", description: "Thank you for your feedback. We will review this post."});
  }

  const handleDeletePost = async (postId: string) => {
      try {
          await deleteDoc(doc(db, 'gymRats', postId));
          toast({ title: "Post Deleted", description: "Your post has been successfully removed." });
      } catch (error) {
          console.error("Error deleting post: ", error);
          toast({ title: "Error", description: "Could not delete post.", variant: "destructive" });
      }
  };

  const handleRepostSubmit = async (values: RepostFormData) => {
    if (!repostingPost) return;
    setIsSubmitting(true);

    const gymId = localStorage.getItem('userDocId');
    const authorName = localStorage.getItem('communityUsername') || localStorage.getItem('userName');
    const authorId = localStorage.getItem('memberId');
    if (!gymId || !authorId || !authorName) {
      toast({ title: "Error", description: "You must be logged in to repost.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(db, "gymRats"), {
        authorName,
        authorId,
        gymId,
        text: values.caption || '',
        visibility: values.visibility,
        createdAt: serverTimestamp(),
        likes: [],
        comments: [],
        repost: {
            originalAuthorName: repostingPost.authorName,
            originalAuthorId: repostingPost.authorId,
            originalText: repostingPost.text,
            originalMediaUrls: repostingPost.mediaUrls || [],
        }
      });
      toast({ title: "Success!", description: "Post has been reposted." });
      setIsRepostDialogOpen(false);
      setRepostingPost(null);
      repostForm.reset();
    } catch (error) {
      console.error("Error reposting post: ", error);
      toast({ title: "Error", description: "Could not repost.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleShare = async (post: Post) => {
    setSharingPost(post);
    setIsFetchingChats(true);
    setIsShareDialogOpen(true);

    const loggedInUsername = localStorage.getItem('communityUsername');
    if (!loggedInUsername) {
        setIsFetchingChats(false);
        return;
    }

    try {
        const chatsRef = collection(db, 'chats');
        const q = query(chatsRef, where('participants', 'array-contains', loggedInUsername));
        const querySnapshot = await getDocs(q);
        const chatsData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const otherParticipant = data.participants.find((p: string) => p !== loggedInUsername);
            return {
                id: doc.id,
                ...data,
                otherParticipant: otherParticipant || 'Unknown',
            } as Chat;
        });
        setUserChats(chatsData);
    } catch (error) {
        console.error("Error fetching chats:", error);
        toast({ title: "Error", description: "Could not fetch your chats.", variant: "destructive" });
    } finally {
        setIsFetchingChats(false);
    }
  };

  const handleShareToChat = async (chatId: string) => {
      if (!sharingPost) return;

      const message = {
          text: `Check out this post from ${sharingPost.authorName}!`,
          sharedPost: {
              postId: sharingPost.id,
              authorName: sharingPost.authorName,
              textSnippet: sharingPost.text.substring(0, 100),
          },
          senderId: localStorage.getItem('memberId'),
          senderName: localStorage.getItem('communityUsername'),
          timestamp: serverTimestamp(),
      };

      try {
          const messagesRef = collection(db, 'chats', chatId, 'messages');
          await addDoc(messagesRef, message);
          toast({ title: "Post Shared!", description: "The post has been sent to your chat." });
          setIsShareDialogOpen(false);
      } catch (error) {
          console.error("Error sharing post to chat:", error);
          toast({ title: "Error", description: "Could not share post.", variant: "destructive" });
      }
  };


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

    const userId = localStorage.getItem('memberId');

    return posts.map(post => (
        <Card key={post.id} className="mb-4">
            <CardHeader className="flex flex-row items-start gap-4">
                <Avatar>
                    <AvatarImage src={post.authorPhotoUrl} />
                    <AvatarFallback>{post.authorName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <div>
                             <Link href={`/profile/${post.authorName}`} className="hover:underline">
                                <CardTitle className="text-base">{post.authorName}</CardTitle>
                             </Link>
                            <p className="text-xs text-muted-foreground">
                                {post.createdAt ? `${formatDistanceToNow(post.createdAt)} ago` : 'just now'}
                            </p>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {post.authorId === userId && (
                                    <>
                                        <DropdownMenuItem onSelect={() => setEditingPost(post)}>
                                            <Edit className="mr-2 h-4 w-4" /> Edit
                                        </DropdownMenuItem>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                    <Trash className="mr-2 h-4 w-4" /> Delete
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>This action cannot be undone. This will permanently delete your post.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeletePost(post.id)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                        <DropdownMenuSeparator />
                                    </>
                                )}
                                <DropdownMenuItem onSelect={() => handleReportPost(post.id)}>
                                    <Flag className="mr-2"/> Report Post
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {post.text && <p className="whitespace-pre-wrap mb-4">{post.text}</p>}
                
                {post.repost ? (
                    <div className="border rounded-md p-4 mt-2">
                         <div className="flex items-center gap-2 mb-2">
                             <Avatar className="h-6 w-6">
                                <AvatarFallback>{post.repost.originalAuthorName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-semibold">{post.repost.originalAuthorName}</span>
                         </div>
                         {post.repost.originalText && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{post.repost.originalText}</p>}
                         {post.repost.originalMediaUrls && post.repost.originalMediaUrls.length > 0 && (
                            <div className={cn("grid gap-2 mt-2", post.repost.originalMediaUrls.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                                {post.repost.originalMediaUrls.map((media, index) => (
                                    <div key={index} className="rounded-lg overflow-hidden border">
                                        {media.type === 'image' ? (
                                            <Image src={media.url} alt={`Post media ${index + 1}`} width={300} height={300} className="w-full h-auto object-cover"/>
                                        ) : (
                                            <video src={media.url} controls className="w-full h-auto"/>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    post.mediaUrls && post.mediaUrls.length > 0 && (
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
                    )
                )}
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-4">
                 <div className="flex gap-4">
                    <Button variant="ghost" size="sm" onClick={() => handleLike(post.id)}>
                        <ThumbsUp className={cn("mr-2 h-4 w-4", post.likes?.includes(userId!) && "fill-primary text-primary")}/> 
                        {post.likes?.length || 0} Likes
                    </Button>
                     <Button variant="ghost" size="sm" onClick={() => setOpenComments(prev => ({...prev, [post.id]: !prev[post.id]}))}>
                        <MessageSquare className="mr-2 h-4 w-4"/> 
                        {post.comments?.length || 0} Comments
                    </Button>
                     <Button variant="ghost" size="sm" onClick={() => { setRepostingPost(post); setIsRepostDialogOpen(true); }}>
                        <Repeat className="mr-2 h-4 w-4"/> Repost
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleShare(post)}>
                        <Share2 className="mr-2 h-4 w-4" /> Share
                    </Button>
                </div>
                 {openComments[post.id] && (
                     <div className="w-full pl-4 border-l-2">
                        <Form {...commentForm}>
                            <form onSubmit={commentForm.handleSubmit((data) => handleCommentSubmit(post.id, data))} className="flex gap-2 mb-4">
                                <FormField control={commentForm.control} name="text" render={({field}) => (
                                    <FormItem className="flex-1">
                                        <FormControl><Input placeholder="Write a comment..." {...field} /></FormControl>
                                    </FormItem>
                                )}/>
                                <Button type="submit" size="icon"><Send className="h-4 w-4"/></Button>
                            </form>
                        </Form>
                        <div className="space-y-4">
                            {post.comments?.map(comment => (
                                <div key={comment.id} className="text-sm">
                                    <p><span className="font-semibold">{comment.authorName}</span>: {comment.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                 )}
            </CardFooter>
        </Card>
    ));
  };
  
  if (hasCommunityProfile === null) {
      return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>;
  }

  if (hasCommunityProfile === false) {
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
    <div className="h-screen w-screen flex flex-col">
       <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Post</DialogTitle>
            <DialogDescription>Select a chat to share this post with.</DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-2 py-4">
            {isFetchingChats ? (
              <div className="flex justify-center"><Loader2 className="animate-spin" /></div>
            ) : userChats.length > 0 ? (
              userChats.map(chat => (
                <div key={chat.id} onClick={() => handleShareToChat(chat.id)} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer">
                  <Avatar>
                    <AvatarFallback>{chat.otherParticipant?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <p className="font-semibold">{chat.otherParticipant}</p>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground">You have no active chats.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isRepostDialogOpen} onOpenChange={setIsRepostDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Repost</DialogTitle>
                <DialogDescription>Add a caption and share this post with the community.</DialogDescription>
            </DialogHeader>
            <Form {...repostForm}>
                <form onSubmit={repostForm.handleSubmit(handleRepostSubmit)} className="space-y-4">
                    <FormField control={repostForm.control} name="caption" render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Textarea placeholder="Add a caption..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <div className="my-4 p-4 border rounded-md bg-muted/50 max-h-48 overflow-y-auto">
                         <div className="flex items-center gap-2 mb-2">
                             <Avatar className="h-6 w-6">
                                <AvatarFallback>{repostingPost?.authorName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-semibold">{repostingPost?.authorName}</span>
                         </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{repostingPost?.text}</p>
                    </div>
                    
                    <FormField
                        control={repostForm.control}
                        name="visibility"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                            <FormLabel>Share To</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="local" /></FormControl><FormLabel className="font-normal">Your Gym</FormLabel></FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="global" /></FormControl><FormLabel className="font-normal">Global</FormLabel></FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                     <DialogFooter className="mt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsRepostDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Repeat className="mr-2 h-4 w-4"/>} Repost
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
      
      <div className="flex-1 flex flex-col">
        <Dialog open={isPostDialogOpen} onOpenChange={(open) => {
            if (!open) {
                setEditingPost(null);
            }
            setIsPostDialogOpen(open);
        }}>
          <Tabs defaultValue="global" value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
            <header className="p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold">Community</h1>
                  <div className="flex items-center gap-2">
                      <TabsList className="bg-orange-500/20 text-orange-700 dark:text-orange-300">
                          <TabsTrigger value="your_gym">Your Gym</TabsTrigger>
                          <TabsTrigger value="global">Global</TabsTrigger>
                      </TabsList>
                      <Link href="/dashboard/messages" passHref>
                           <Button variant="ghost" size="icon">
                               <MessageSquare className="h-6 w-6"/>
                           </Button>
                       </Link>
                      <DialogTrigger asChild>
                      <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Post
                      </Button>
                      </DialogTrigger>
                  </div>
              </div>
            </header>
          
            <main className="flex-1 overflow-y-auto p-4 pb-20 space-y-4">
                <div className="max-w-2xl mx-auto w-full">
                    {renderFeed()}
                </div>
            </main>
          </Tabs>
          <DialogContent>
               <DialogHeader>
                  <DialogTitle>{editingPost ? "Edit Post" : "Create a New Post"}</DialogTitle>
                  <DialogDescription>
                    {editingPost ? "Edit your post below." : "Share an update, photo, or video with the community."}
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
                              {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Send className="mr-2 h-4 w-4"/>} {editingPost ? "Save Changes" : "Post"}
                          </Button>
                      </DialogFooter>
                  </form>
              </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <BottomNavbar
        navItems={[
          { label: "Dashboard", href: "/dashboard/member", icon: <LayoutDashboard /> },
          { label: "Search", href: "/dashboard/search", icon: <Search /> },
          { label: "Feed", href: "/dashboard/member/community", icon: <Rss /> },
          { label: "Profile", href: "/dashboard/member/profile", icon: <User /> },
        ]}
      />
    </div>
  );
}

    

    