
"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, Timestamp, collection, getDocs, collectionGroup, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ThumbsUp, MessageSquare, Send, MoreVertical, Edit, Trash, Image as ImageIcon, Video, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';


interface Comment {
    id: string;
    authorId: string;
    authorName: string;
    text: string;
    createdAt: Date;
}

interface Post {
    id: string;
    text: string;
    authorName: string;
    authorId: string;
    authorPhotoUrl?: string;
    authorRole?: 'owner' | 'member' | 'trainer';
    createdAt: Timestamp;
    mediaUrls?: { url: string, type: 'image' | 'video' }[];
    likes?: string[];
    comments?: Comment[];
    visibility: 'local' | 'global';
}

const commentSchema = z.object({
    text: z.string().min(1, "Comment cannot be empty."),
});
type CommentFormData = z.infer<typeof commentSchema>;

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


export default function PostPage() {
    const params = useParams();
    const postId = params.postId as string;
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [backLink, setBackLink] = useState('/dashboard/owner/community');
    const router = useRouter();
    const { toast } = useToast();
    const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mediaPreviews, setMediaPreviews] = useState<{url: string, type: 'image' | 'video'}[]>([]);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const [editingPost, setEditingPost] = useState<Post | null>(null);

    const postForm = useForm<PostFormData>({
      resolver: zodResolver(postSchema),
      defaultValues: {
        text: "",
        visibility: "local",
        mediaUrls: [],
      },
    });

    const commentForm = useForm<CommentFormData>({
        resolver: zodResolver(commentSchema),
        defaultValues: { text: "" },
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
    
    const fetchPost = async () => {
         try {
            const postRef = doc(db, 'gymRats', postId);
            const postSnap = await getDoc(postRef);

            if (postSnap.exists()) {
                const postData = postSnap.data() as Omit<Post, 'id' | 'authorRole'>;
                
                const fullPostData = { id: postSnap.id, ...postData } as Post;
                setPost(fullPostData);
                
                setBackLink(`/profile/${postData.authorName}`);

            } else {
                toast({ title: 'Error', description: 'Post not found.', variant: 'destructive' });
                router.push('/dashboard/owner/community');
            }
        } catch (error) {
            console.error("Error fetching post:", error);
            toast({ title: 'Error', description: 'Failed to fetch post.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (postId) {
            fetchPost();
        }
    }, [postId, router, toast]);

    const handleLike = async () => {
        if (!post) return;
        const role = localStorage.getItem('userRole');
        const userId = role === 'owner' ? localStorage.getItem('userDocId') : (role === 'member' ? localStorage.getItem('memberId') : localStorage.getItem('trainerId'));

        if (!userId) return;

        const postRef = doc(db, 'gymRats', post.id);
        const isLiked = post.likes?.includes(userId);

        try {
            await updateDoc(postRef, {
                likes: isLiked ? arrayRemove(userId) : arrayUnion(userId)
            });
            await fetchPost();
        } catch (error) {
            console.error("Error liking post:", error);
            toast({ title: 'Error', description: 'Could not update like status.', variant: 'destructive' });
        }
    };

    const handleCommentSubmit = async (data: CommentFormData) => {
        if (!post) return;
        const role = localStorage.getItem('userRole');
        const authorId = role === 'owner' ? localStorage.getItem('userDocId') : (role === 'member' ? localStorage.getItem('memberId') : localStorage.getItem('trainerId'));
        const authorName = localStorage.getItem('communityUsername') || localStorage.getItem('userName') || 'User';
        
        if (!authorId || !authorName) return;

        const postRef = doc(db, 'gymRats', postId);
        const newComment = {
            id: new Date().toISOString(),
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
            await fetchPost();
        } catch (error) {
            console.error("Error adding comment:", error);
            toast({ title: 'Error', description: 'Could not post comment.', variant: 'destructive' });
        }
    };

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
        } else {
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
    };

    const handlePostSubmit = async (values: PostFormData) => {
        if (!editingPost) return;
        setIsSubmitting(true);
        try {
            const postRef = doc(db, 'gymRats', editingPost.id);
            await updateDoc(postRef, {
                text: values.text,
                visibility: values.visibility,
                mediaUrls: values.mediaUrls || [],
            });
            toast({ title: "Success!", description: "Your post has been updated." });
            setIsPostDialogOpen(false);
            setEditingPost(null);
            await fetchPost();
        } catch (error) {
            console.error("Error updating post: ", error);
            toast({ title: "Error", description: "Could not save post.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeletePost = async () => {
        if (!post) return;
        try {
            await deleteDoc(doc(db, 'gymRats', post.id));
            toast({ title: "Post Deleted", description: "Your post has been successfully removed." });
            router.push(backLink);
        } catch (error) {
            console.error("Error deleting post: ", error);
            toast({ title: "Error", description: "Could not delete post.", variant: "destructive" });
        }
    };
    
    const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
    const userId = role === 'owner' ? (typeof window !== 'undefined' ? localStorage.getItem('userDocId') : null) : (role === 'member' ? (typeof window !== 'undefined' ? localStorage.getItem('memberId') : null) : (typeof window !== 'undefined' ? localStorage.getItem('trainerId') : null));
    const isAuthor = post?.authorId === userId;


    if (loading) {
        return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!post) {
        return <div className="flex min-h-screen items-center justify-center bg-background">Post not found.</div>;
    }

    return (
        <Dialog open={isPostDialogOpen} onOpenChange={(open) => {
            if (!open) setEditingPost(null);
            setIsPostDialogOpen(open);
        }}>
            <div className="container mx-auto py-10 max-w-2xl">
                <div className="mb-4">
                    <Link href={backLink} passHref>
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                        </Button>
                    </Link>
                </div>
                <Card>
                    <CardHeader className="flex flex-row items-start gap-4">
                        <Avatar>
                            <AvatarImage src={post.authorPhotoUrl} />
                            <AvatarFallback>{post.authorName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <CardTitle className="text-base">{post.authorName}</CardTitle>
                            <p className="text-xs text-muted-foreground">
                                {post.createdAt ? `${formatDistanceToNow(post.createdAt.toDate())} ago` : 'just now'}
                            </p>
                        </div>
                        {isAuthor && (
                            <AlertDialog>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreVertical className="h-4 w-4"/>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onSelect={() => setEditingPost(post)}>
                                            <Edit className="mr-2 h-4 w-4" /> Edit
                                        </DropdownMenuItem>
                                        <AlertDialogTrigger asChild>
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                <Trash className="mr-2 h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>This action cannot be undone. This will permanently delete your post.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeletePost}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
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
                    <CardFooter className="flex flex-col items-start gap-4">
                        <div className="flex gap-4">
                            <Button variant="ghost" size="sm" onClick={handleLike}>
                                <ThumbsUp className={cn("mr-2 h-4 w-4", post.likes?.includes(userId!) && "fill-primary text-primary")}/> 
                                {post.likes?.length || 0} Likes
                            </Button>
                            <Button variant="ghost" size="sm">
                                <MessageSquare className="mr-2 h-4 w-4"/> 
                                {post.comments?.length || 0} Comments
                            </Button>
                        </div>

                        <div className="w-full pl-4 border-l-2">
                            <Form {...commentForm}>
                                <form onSubmit={commentForm.handleSubmit(handleCommentSubmit)} className="flex gap-2 mb-4">
                                    <FormField control={commentForm.control} name="text" render={({field}) => (
                                        <FormItem className="flex-1">
                                            <FormControl><Input placeholder="Write a comment..." {...field} /></FormControl>
                                        </FormItem>
                                    )}/>
                                    <Button type="submit" size="icon" disabled={commentForm.formState.isSubmitting}>
                                        {commentForm.formState.isSubmitting ? <Loader2 className="animate-spin h-4 w-4"/> : <Send className="h-4 w-4"/>}
                                    </Button>
                                </form>
                            </Form>
                            <div className="space-y-4">
                                {post.comments && [...post.comments].sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()).map(comment => (
                                    <div key={comment.id} className="text-sm">
                                        <p><span className="font-semibold">{comment.authorName}</span>: {comment.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardFooter>
                </Card>
            </div>
            
             <DialogContent>
               <DialogHeader>
                  <DialogTitle>Edit Post</DialogTitle>
                  <DialogDescription>Edit your post below.</DialogDescription>
              </DialogHeader>
               <Form {...postForm}>
                  <form onSubmit={postForm.handleSubmit(handlePostSubmit)} className="space-y-4">
                      <FormField control={postForm.control} name="text" render={({ field }) => (
                              <FormItem>
                              <FormControl><Textarea placeholder="What's on your mind?" className="min-h-[120px]" {...field} /></FormControl>
                              <FormMessage />
                              </FormItem>
                          )} />
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
                       <FormField control={postForm.control} name="visibility" render={({ field }) => (
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
                              {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Send className="mr-2 h-4 w-4"/>} Save Changes
                          </Button>
                      </DialogFooter>
                  </form>
              </Form>
          </DialogContent>
        </Dialog>
    );
}

    