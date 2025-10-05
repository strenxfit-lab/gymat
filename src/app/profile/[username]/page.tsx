"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, Timestamp, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Loader2, User, ArrowLeft, Rss, Image as ImageIcon, Video, Settings, Lock, Edit, UserPlus, UserCheck } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
    privacy?: 'public' | 'private';
    userId: string;
    followers?: string[];
    following?: string[];
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


export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ posts: 0, followers: 0, following: 0 });
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [backLink, setBackLink] = useState('/dashboard/owner/community');
  const [followStatus, setFollowStatus] = useState<'not_following' | 'following' | 'requested'>('not_following');
  const [isUpdatingFollow, setIsUpdatingFollow] = useState(false);

  const loggedInUsername = typeof window !== 'undefined' ? localStorage.getItem('communityUsername') : null;

  const fetchProfileData = async () => {
    if (!username) return;

    const loggedInUserRole = localStorage.getItem('userRole');
    const loggedInUserId = loggedInUserRole === 'owner' ? localStorage.getItem('userDocId') : (loggedInUserRole === 'member' ? localStorage.getItem('memberId') : localStorage.getItem('trainerId'));
    
    if(loggedInUserRole === 'owner') setBackLink('/dashboard/owner/community');
    else if(loggedInUserRole === 'member') setBackLink('/dashboard/member/community');
    else if(loggedInUserRole === 'trainer') setBackLink('/dashboard/trainer/community');


    try {
      const profileRef = doc(db, 'userCommunity', username);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const profileData = profileSnap.data() as CommunityProfile;
        setProfile(profileData);
        
        const ownProfile = profileData.userId === loggedInUserId;
        setIsOwnProfile(ownProfile);

        if (!ownProfile && loggedInUsername) {
            if (profileData.followers?.includes(loggedInUsername)) {
                setFollowStatus('following');
            } else {
                const requestQuery = query(collection(profileRef, 'followRequests'), where('username', '==', loggedInUsername));
                const requestSnap = await getDocs(requestQuery);
                if (!requestSnap.empty) {
                    setFollowStatus('requested');
                } else {
                    setFollowStatus('not_following');
                }
            }
        }
        
        setStats(prev => ({ 
            ...prev, 
            followers: profileData.followers?.length || 0,
            following: profileData.following?.length || 0,
        }));

        const postsQuery = query(collection(db, 'gymRats'), where('authorId', '==', profileData.userId));
        const postsSnap = await getDocs(postsQuery);
        const userPosts = postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post))
            .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
        
        setStats(prev => ({ ...prev, posts: userPosts.length }));
        setPosts(userPosts);
      
      } else {
          toast({ title: 'Not Found', description: 'This user profile does not exist.', variant: 'destructive'});
          router.back();
      }

    } catch (error) {
      console.error("Error fetching profile data:", error);
      toast({ title: 'Error', description: 'Failed to fetch profile details.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [username, router, toast]);

  const handleFollow = async () => {
      if (!profile || !loggedInUsername || isOwnProfile) return;
      setIsUpdatingFollow(true);

      const targetUserRef = doc(db, 'userCommunity', username);
      const currentUserRef = doc(db, 'userCommunity', loggedInUsername);

      try {
          if (profile.privacy === 'private') {
              const requestRef = doc(collection(targetUserRef, 'followRequests'), loggedInUsername);
              await setDoc(requestRef, {
                  username: loggedInUsername,
                  requestedAt: serverTimestamp(),
              });
              setFollowStatus('requested');
              toast({ title: "Request Sent" });
          } else {
              await updateDoc(targetUserRef, { followers: arrayUnion(loggedInUsername) });
              await updateDoc(currentUserRef, { following: arrayUnion(username) });
              setFollowStatus('following');
              setStats(prev => ({...prev, followers: prev.followers + 1}));
          }
      } catch (error) {
          console.error("Error following user: ", error);
          toast({ title: "Error", description: "Could not complete action.", variant: "destructive" });
      } finally {
          setIsUpdatingFollow(false);
      }
  }

  const handleUnfollow = async () => {
      if (!profile || !loggedInUsername || isOwnProfile) return;
      setIsUpdatingFollow(true);

      const targetUserRef = doc(db, 'userCommunity', username);
      const currentUserRef = doc(db, 'userCommunity', loggedInUsername);

      try {
          if (followStatus === 'requested') {
              const requestRef = doc(collection(targetUserRef, 'followRequests'), loggedInUsername);
              await deleteDoc(requestRef);
              setFollowStatus('not_following');
          } else { // following
              await updateDoc(targetUserRef, { followers: arrayRemove(loggedInUsername) });
              await updateDoc(currentUserRef, { following: arrayRemove(username) });
              setFollowStatus('not_following');
              setStats(prev => ({...prev, followers: prev.followers - 1}));
          }
      } catch (error) {
          console.error("Error unfollowing user: ", error);
          toast({ title: "Error", description: "Could not complete action.", variant: "destructive" });
      } finally {
          setIsUpdatingFollow(false);
      }
  }
  
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!profile) {
      return <div className="flex min-h-screen items-center justify-center bg-background">Profile not found.</div>
  }

  const isPrivate = profile?.privacy === 'private';
  const canViewContent = !isPrivate || isOwnProfile || followStatus === 'following';

  const renderFollowButton = () => {
    if (isOwnProfile) return null;

    if (followStatus === 'following') {
      return <Button variant="outline" onClick={handleUnfollow} disabled={isUpdatingFollow}>Unfollow</Button>;
    }
    if (followStatus === 'requested') {
      return <Button variant="outline" onClick={handleUnfollow} disabled={isUpdatingFollow}>Requested</Button>;
    }
    return <Button onClick={handleFollow} disabled={isUpdatingFollow}><UserPlus className="mr-2 h-4 w-4"/>Follow</Button>;
  };

  return (
      <div className="flex flex-col min-h-screen">
        <header className="p-4 border-b">
            <Link href={backLink} passHref>
                <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                </Button>
            </Link>
        </header>
        <main className="flex-1 container mx-auto py-10 space-y-6">
          <div className="flex items-start gap-4 md:gap-8">
              <Avatar className="h-20 w-20 md:h-24 md:w-24 border-4 border-primary">
                  <AvatarImage src={profile?.photoUrl} alt={username || 'User'}/>
                  <AvatarFallback className="text-3xl">{username?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2 flex-wrap">
                      <h1 className="text-2xl font-bold">{username}</h1>
                      {isOwnProfile ? (
                        <div className="flex items-center gap-2">
                            <Link href="/dashboard/owner/profile/edit" passHref>
                                <Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4"/>Edit Profile</Button>
                            </Link>
                            <Link href="/dashboard/owner/profile/settings" passHref>
                                <Button variant="outline" size="icon"><Settings className="h-4 w-4"/></Button>
                            </Link>
                        </div>
                      ) : (
                          renderFollowButton()
                      )}
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
              {!canViewContent ? (
                   <div className="text-center text-muted-foreground mt-8 p-8 border-2 border-dashed rounded-lg">
                      <Lock className="mx-auto h-8 w-8 mb-2"/>
                      <p className="font-semibold">This account is private.</p>
                      <p className="text-sm">Follow this account to see their posts.</p>
                  </div>
              ) : posts.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1">
                      {posts.map(post => (
                          <Link href={`/posts/${post.id}`} key={post.id}>
                            <div className="relative aspect-square bg-muted cursor-pointer">
                                {post.mediaUrls && post.mediaUrls.length > 0 ? (
                                    <Image src={post.mediaUrls[0].url} alt="Post" layout="fill" className="object-cover"/>
                                ) : (
                                    <div className="flex items-center justify-center h-full"><ImageIcon className="h-8 w-8 text-muted-foreground"/></div>
                                )}
                                {post.mediaUrls && post.mediaUrls.length > 0 && post.mediaUrls[0].type === 'video' && <Video className="absolute bottom-2 right-2 h-5 w-5 text-white"/>}
                            </div>
                          </Link>
                      ))}
                  </div>
              ) : (
                  <div className="text-center text-muted-foreground mt-8">
                      <p>This user hasn't posted anything yet.</p>
                  </div>
              )}
          </div>
        </main>
      </div>
  );
}
