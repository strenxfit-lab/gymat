
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, User, Edit, Rss, Image as ImageIcon, Video } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BottomNavbar } from '@/components/ui/bottom-navbar';
import { LayoutDashboard, Search } from 'lucide-react';

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
    createdAt: Timestamp;
    mediaUrls?: { url: string, type: 'image' | 'video' }[];
}

export default function MemberCommunityProfilePage() {
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ posts: 0, followers: 0, following: 0 });
  const [posts, setPosts] = useState<Post[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfileData = async () => {
      const storedUsername = localStorage.getItem('communityUsername');
      const userId = localStorage.getItem('memberId');

      if (!storedUsername || !userId) {
        toast({ title: 'Error', description: 'Community profile not found.', variant: 'destructive' });
        router.push('/dashboard/member/community');
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
        const userPosts = postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
        
        userPosts.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
        
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

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
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
                     <Link href="/dashboard/member/profile/edit" passHref>
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
                        <div key={post.id} className="relative aspect-square bg-muted">
                            {post.mediaUrls && post.mediaUrls.length > 0 ? (
                                <Image src={post.mediaUrls[0].url} alt="Post" layout="fill" className="object-cover"/>
                            ) : (
                                <div className="flex items-center justify-center h-full"><ImageIcon className="h-8 w-8 text-muted-foreground"/></div>
                            )}
                            {post.mediaUrls && post.mediaUrls.length > 0 && post.mediaUrls[0].type === 'video' && <Video className="absolute bottom-2 right-2 h-5 w-5 text-white"/>}
                        </div>
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
          { label: "Dashboard", href: "/dashboard/member", icon: <LayoutDashboard /> },
          { label: "Search", href: "/dashboard/search", icon: <Search /> },
          { label: "Feed", href: "/dashboard/member/community", icon: <Rss /> },
          { label: "Profile", href: "/dashboard/member/profile", icon: <User /> },
        ]}
      />
    </div>
  );
}
