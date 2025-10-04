
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ThumbsUp, MessageSquare, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';

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
}

const commentSchema = z.object({
    text: z.string().min(1, "Comment cannot be empty."),
});
type CommentFormData = z.infer<typeof commentSchema>;

export default function PostPage() {
    const params = useParams();
    const postId = params.postId as string;
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [backLink, setBackLink] = useState('/dashboard/owner/community');
    const router = useRouter();
    const { toast } = useToast();

    const commentForm = useForm<CommentFormData>({
        resolver: zodResolver(commentSchema),
        defaultValues: { text: "" },
    });
    
    const fetchPost = async () => {
         try {
            const postRef = doc(db, 'gymRats', postId);
            const postSnap = await getDoc(postRef);

            if (postSnap.exists()) {
                const postData = postSnap.data();
                const authorId = postData.authorId;
                let authorRole: Post['authorRole'] = 'member'; // Default

                const ownerQuery = query(collection(db, 'gyms'), where('__name__', '==', authorId));
                const ownerSnap = await getDocs(ownerQuery);
                if (!ownerSnap.empty) {
                    authorRole = 'owner';
                } else {
                    const memberQuery = query(collectionGroup(db, 'members'), where('__name__', '==', authorId));
                    const memberSnap = await getDocs(memberQuery);
                     if (!memberSnap.empty) {
                        authorRole = 'member';
                    } else {
                        const trainerQuery = query(collectionGroup(db, 'trainers'), where('__name__', '==', authorId));
                        const trainerSnap = await getDocs(trainerQuery);
                        if(!trainerSnap.empty) {
                            authorRole = 'trainer';
                        }
                    }
                }

                setPost({ id: postSnap.id, ...postData, authorRole } as Post);

                const currentUserRole = localStorage.getItem('userRole');
                if (authorRole === currentUserRole) {
                    setBackLink(`/dashboard/${currentUserRole}/profile`);
                } else {
                    setBackLink(`/dashboard/${currentUserRole}/community`);
                }

            } else {
                toast({ title: 'Error', description: 'Post not found.', variant: 'destructive' });
                router.back();
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
            // Re-fetch post for updated data
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
            // Re-fetch post for updated data
            await fetchPost();
        } catch (error) {
            console.error("Error adding comment:", error);
            toast({ title: 'Error', description: 'Could not post comment.', variant: 'destructive' });
        }
    };
    
    const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
    const userId = role === 'owner' ? (typeof window !== 'undefined' ? localStorage.getItem('userDocId') : null) : (role === 'member' ? (typeof window !== 'undefined' ? localStorage.getItem('memberId') : null) : (typeof window !== 'undefined' ? localStorage.getItem('trainerId') : null));


    if (loading) {
        return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!post) {
        return <div className="flex min-h-screen items-center justify-center bg-background">Post not found.</div>;
    }

    return (
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
    );
}
