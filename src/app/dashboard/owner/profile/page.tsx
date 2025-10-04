
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, User, Edit, Rss, Image as ImageIcon, Video, ThumbsUp, MessageSquare, Repeat, Share2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BottomNavbar } from '@/components/ui/bottom-navbar';
import { LayoutDashboard, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProfileStats {
  posts: number;
  followers: number;
  following: number;
}

interface CommunityProfile {
    bio?: string;
    gender?: string;
    photoUrl?: string;
}

interface Post {
    id: string;
    text: string;
    authorName: string;
    authorId: string;
    authorPhotoUrl?: string;
    createdAt: Timestamp;
    mediaUrls?: { url: string, type: 'image' | 'video' }[];
    likes?: string[];
    comments?: any[];
    repost?: any;
    visibility: 'local' | 'global';
}

export default function OwnerCommunityProfilePage() {
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ posts: 0, followers: 0, following: 0 });
  const [posts, setPosts] = useState<Post[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfileData = async () => {
      const storedUsername = localStorage.getItem('communityUsername');
      const userId = localStorage.getItem('userDocId');

      if (!storedUsername || !userId) {
        toast({ title: 'Error', description: 'Community profile not found.', variant: 'destructive' });
        router.push('/dashboard/owner/community');
        return;
      }
      setUsername(storedUsername);

      try {
        const profileRef = doc(db, 'userCommunity', storedUsername);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          setProfile(profileSnap.data() as CommunityProfile);
        }

        const postsQuery = query(collection(db, 'gymRats'), where('authorId', '==', userId));
        const postsSnap = await getDocs(postsQuery);
        const userPosts = postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post))
            .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
        
        setStats(prev => ({ ...prev, posts: userPosts.length }));
        setPosts(userPosts);
        
      } catch (error) {
        console.error("Error fetching profile data:", error);
        toast({ title: 'Error', description: 'Failed to fetch profile details.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [router, toast]);

  const userId = typeof window !== 'undefined' ? localStorage.getItem('userDocId') : null;

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Dialog onOpenChange={(isOpen) => !isOpen && setSelectedPost(null)}>
      <div className="flex flex-col min-h-screen">
        <main className="flex-1 container mx-auto py-10 space-y-6">
          <div className="flex items-center gap-8">
              <Avatar className="h-24 w-24 border-4 border-primary">
                  <AvatarImage src={profile?.photoUrl} alt={username || 'User'}/>
                  <AvatarFallback className="text-3xl">{username?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                      <h1 className="text-2xl font-bold">{username}</h1>
                      <Link href="/dashboard/owner/profile/edit" passHref>
                          <Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4"/>Edit Profile</Button>
                      </Link>
                  </div>
                  <div className="flex space-x-6">
                      <div><span className="font-bold">{stats.posts}</span> posts</div>
                      <div><span className="font-bold">{stats.followers}</span> followers</div>
                      <div><span className="font-bold">{stats.following}</span> following</div>
                  </div>
                  <div className="mt-2">
                      <p className="text-sm">{profile?.bio || 'No bio yet.'}</p>
                      <p className="text-xs text-muted-foreground capitalize">{profile?.gender}</p>
                  </div>
              </div>
          </div>
          
          <div className="border-t pt-6">
              <h2 className="text-xl font-bold text-center mb-4">Posts</h2>
              {posts.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1">
                      {posts.map(post => (
                          <DialogTrigger asChild key={post.id} onClick={() => setSelectedPost(post)}>
                            <div className="relative aspect-square bg-muted cursor-pointer">
                                {post.mediaUrls && post.mediaUrls.length > 0 ? (
                                    <Image src={post.mediaUrls[0].url} alt="Post" layout="fill" className="object-cover"/>
                                ) : (
                                    <div className="flex items-center justify-center h-full"><ImageIcon className="h-8 w-8 text-muted-foreground"/></div>
                                )}
                                {post.mediaUrls && post.mediaUrls.length > 0 && post.mediaUrls[0].type === 'video' && <Video className="absolute bottom-2 right-2 h-5 w-5 text-white"/>}
                            </div>
                          </DialogTrigger>
                      ))}
                  </div>
              ) : (
                  <div className="text-center text-muted-foreground mt-8">
                      <p>Your posts will appear here.</p>
                  </div>
              )}
          </div>

        </main>
        <BottomNavbar
          navItems={[
            { label: "Dashboard", href: "/dashboard/owner", icon: <LayoutDashboard /> },
            { label: "Search", href: "/dashboard/search", icon: <Search /> },
            { label: "Feed", href: "/dashboard/owner/community", icon: <Rss /> },
            { label: "Profile", href: "/dashboard/owner/profile", icon: <User /> },
          ]}
        />
        {selectedPost && (
            <DialogContent className="max-w-2xl">
                 <DialogHeader>
                    <DialogTitle>Post by {selectedPost.authorName}</DialogTitle>
                </DialogHeader>
                <Card className="border-0 shadow-none">
                     <CardHeader className="flex flex-row items-start gap-4">
                        <Avatar>
                            <AvatarImage src={selectedPost.authorPhotoUrl} />
                            <AvatarFallback>{selectedPost.authorName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <CardTitle className="text-base">{selectedPost.authorName}</CardTitle>
                            <p className="text-xs text-muted-foreground">
                                {selectedPost.createdAt ? `${formatDistanceToNow(selectedPost.createdAt.toDate())} ago` : 'just now'}
                            </p>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {selectedPost.text && <p className="whitespace-pre-wrap mb-4">{selectedPost.text}</p>}
                        {selectedPost.mediaUrls && selectedPost.mediaUrls.length > 0 && (
                             <div className={cn("grid gap-2", selectedPost.mediaUrls.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                                {selectedPost.mediaUrls.map((media, index) => (
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
                            <Button variant="ghost" size="sm">
                                <ThumbsUp className={cn("mr-2 h-4 w-4", selectedPost.likes?.includes(userId!) && "fill-primary text-primary")}/> 
                                {selectedPost.likes?.length || 0} Likes
                            </Button>
                            <Button variant="ghost" size="sm">
                                <MessageSquare className="mr-2 h-4 w-4"/> 
                                {selectedPost.comments?.length || 0} Comments
                            </Button>
                            <Button variant="ghost" size="sm">
                                <Repeat className="mr-2 h-4 w-4"/> Repost
                            </Button>
                            <Button variant="ghost" size="sm">
                                <Share2 className="mr-2 h-4 w-4" /> Share
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </DialogContent>
        )}
      </div>
    </Dialog>
  );
}
