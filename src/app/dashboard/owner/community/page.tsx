"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from 'date-fns';

interface Post {
    id: string;
    authorName: string;
    authorId: string;
    gymId: string;
    text: string;
    createdAt: Date;
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

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

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPost.trim() === "") return;

    const gymId = localStorage.getItem('userDocId');
    const authorName = "Gym Owner"; // In a real app, this would come from user's profile
    const authorId = localStorage.getItem('userDocId');

    if (!gymId || !authorId) {
        toast({ title: "Error", description: "You must be logged in to post.", variant: "destructive" });
        return;
    }
    
    setIsSubmitting(true);
    try {
        await addDoc(collection(db, "posts"), {
            authorName,
            authorId,
            gymId,
            text: newPost,
            createdAt: serverTimestamp(),
            visibility: 'global', // For now, all posts are global
        });
        setNewPost("");
    } catch (error) {
        console.error("Error creating post: ", error);
        toast({ title: "Error", description: "Could not create post.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Community</h1>
          <p className="text-muted-foreground">
            Engage with your gym members and trainers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {/* Post Composer */}
          <Card className="mb-6">
            <CardHeader>
                <CardTitle>Create a Post</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handlePostSubmit} className="space-y-4">
                    <Textarea 
                        placeholder="What's on your mind?"
                        value={newPost}
                        onChange={(e) => setNewPost(e.target.value)}
                        className="min-h-[100px]"
                    />
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                            Post
                        </Button>
                    </div>
                </form>
            </CardContent>
          </Card>

          {/* Feed */}
          <div className="space-y-4">
            {isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>
            ) : posts.length > 0 ? (
                posts.map(post => (
                    <Card key={post.id}>
                        <CardHeader className="flex flex-row items-center gap-4">
                            <Avatar>
                                <AvatarFallback>{post.authorName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-base">{post.authorName}</CardTitle>
                                <CardDescription>
                                    {post.createdAt ? `${formatDistanceToNow(post.createdAt)} ago` : 'just now'}
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="whitespace-pre-wrap">{post.text}</p>
                        </CardContent>
                    </Card>
                ))
            ) : (
                <p className="text-muted-foreground text-center py-8">No posts yet. Be the first to start a conversation!</p>
            )}
          </div>
        </div>

        <div className="md:col-span-1">
            {/* Placeholder for future features like Trending, etc. */}
        </div>
      </div>
    </div>
  );
}
