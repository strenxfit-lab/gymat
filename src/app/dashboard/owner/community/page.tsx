"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    const authorName = "Gym Owner"; 
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
    <div className="flex h-full bg-background">
      <div className="flex-1 flex flex-col">
        <header className="p-4 border-b">
          <h1 className="text-2xl font-bold">Community</h1>
        </header>
        <Tabs defaultValue="global" className="flex-1 flex flex-col">
          <TabsList className="m-4">
            <TabsTrigger value="global">Global</TabsTrigger>
            <TabsTrigger value="your_gym" disabled>Your Gym</TabsTrigger>
          </TabsList>
          <TabsContent value="global" className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="max-w-2xl mx-auto w-full">
                <Card>
                    <CardHeader>
                        <CardTitle>Create a Post</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePostSubmit} className="space-y-4">
                            <Textarea 
                                placeholder="What's on your mind? Share an update with the community..."
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

                <div className="space-y-4 mt-6">
                    {isLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>
                    ) : posts.length > 0 ? (
                        posts.map(post => (
                            <Card key={post.id}>
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
              </div>
          </TabsContent>
          <TabsContent value="your_gym" className="flex-1 overflow-y-auto p-4">
             <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">"Your Gym" feed coming soon!</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}