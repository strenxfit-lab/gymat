
"use client";

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, orderBy, arrayUnion, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Check, X, UserPlus, MessageCircle, Bell } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface FollowRequest {
    id: string;
    username: string;
}

interface Notification {
    id: string;
    message: string;
    type: 'follow' | 'request_accepted';
    fromUsername: string;
    isFollowingBack?: boolean;
    createdAt: string;
}

export default function ActivityPage() {
    const [requests, setRequests] = useState<FollowRequest[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [currentUsername, setCurrentUsername] = useState<string | null>(null);

    const fetchAllData = async () => {
        setLoading(true);
        const username = localStorage.getItem('communityUsername');
        setCurrentUsername(username);
        if (!username) {
            setLoading(false);
            return;
        }
        
        try {
            const userCommunityRef = doc(db, 'userCommunity', username);
            const userCommunitySnap = await getDoc(userCommunityRef);
            const currentUserFollowing = userCommunitySnap.exists() ? userCommunitySnap.data().following || [] : [];
            
            // Fetch Follow Requests
            const requestsQuery = query(collection(userCommunityRef, 'followRequests'), orderBy('requestedAt', 'desc'));
            const requestsSnap = await getDocs(requestsQuery);
            setRequests(requestsSnap.docs.map(d => ({ id: d.id, username: d.id } as FollowRequest)));

            // Fetch Notifications
            const notificationsQuery = query(collection(userCommunityRef, 'notifications'), orderBy('createdAt', 'desc'));
            const notificationsSnap = await getDocs(notificationsQuery);
            const notifList = notificationsSnap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    isFollowingBack: currentUserFollowing.includes(data.fromUsername),
                    createdAt: d.data().createdAt?.toDate().toLocaleString() || ''
                } as Notification;
            });
            setNotifications(notifList);
            
        } catch (error) {
            console.error("Error fetching activity:", error);
            toast({ title: "Error", description: "Could not fetch your activity.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchAllData();
    }, [toast]);
    
    const handleRequest = async (requesterUsername: string, accept: boolean) => {
        if (!currentUsername) return;

        const currentUserRef = doc(db, 'userCommunity', currentUsername);
        const requesterUserRef = doc(db, 'userCommunity', requesterUsername);
        const requestRef = doc(currentUserRef, 'followRequests', requesterUsername);
        
        const batch = writeBatch(db);

        try {
            if (accept) {
                batch.update(currentUserRef, { followers: arrayUnion(requesterUsername) });
                batch.update(requesterUserRef, { following: arrayUnion(currentUsername) });
                
                const requesterNotificationsRef = collection(requesterUserRef, 'notifications');
                batch.set(doc(requesterNotificationsRef), {
                    type: 'request_accepted',
                    fromUsername: currentUsername,
                    message: `${currentUsername} accepted your follow request.`,
                    createdAt: serverTimestamp(),
                });
            }
            batch.delete(requestRef);
            await batch.commit();

            toast({ title: "Success", description: `Request has been ${accept ? 'accepted' : 'declined'}.`});
            fetchAllData();

        } catch (error) {
            console.error("Error handling request:", error);
            toast({ title: "Error", description: "Failed to process request.", variant: "destructive" });
        }
    };

    const handleFollowBack = async (targetUsername: string) => {
        if (!currentUsername) return;
        const currentUserRef = doc(db, 'userCommunity', currentUsername);
        const targetUserRef = doc(db, 'userCommunity', targetUsername);
        
        try {
            const batch = writeBatch(db);
            batch.update(currentUserRef, { following: arrayUnion(targetUsername) });
            batch.update(targetUserRef, { followers: arrayUnion(currentUsername) });
            await batch.commit();
            
            toast({ title: 'Followed back!', description: `You are now following ${targetUsername}.` });
            await fetchAllData();
        } catch(error) {
            console.error("Error following back:", error);
            toast({ title: "Error", description: "Could not follow back.", variant: "destructive" });
        }
    }


    if (loading) {
        return <div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="container mx-auto py-10">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Activity</h1>
                    <p className="text-muted-foreground">Manage follow requests and view your notifications.</p>
                </div>
                <Link href="/dashboard/owner/community" passHref>
                    <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Community</Button>
                </Link>
            </div>
            
            <Tabs defaultValue="requests" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="requests">Follow Requests ({requests.length})</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                </TabsList>
                <TabsContent value="requests">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending Follow Requests</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {requests.length > 0 ? (
                                <ul className="space-y-3">
                                    {requests.map(req => (
                                        <li key={req.id} className="flex items-center justify-between p-2 rounded-md border">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback>{req.username.charAt(0).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <p className="font-semibold">{req.username}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button size="sm" onClick={() => handleRequest(req.id, true)}><Check className="h-4 w-4 mr-2"/>Accept</Button>
                                                <Button size="sm" variant="ghost" onClick={() => handleRequest(req.id, false)}><X className="h-4 w-4 mr-2"/>Decline</Button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted-foreground text-center py-8">No pending follow requests.</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="notifications">
                     <Card>
                        <CardHeader>
                            <CardTitle>Notifications</CardTitle>
                        </CardHeader>
                        <CardContent>
                           {notifications.length > 0 ? (
                                <ul className="space-y-3">
                                    {notifications.map(notif => (
                                        <li key={notif.id} className="flex items-center justify-between p-3 rounded-md border">
                                            <div className="flex items-center gap-3">
                                                {notif.type === 'follow' ? <UserPlus className="h-5 w-5 text-primary" /> : <Check className="h-5 w-5 text-green-500" />}
                                                <div>
                                                    <p>{notif.message}</p>
                                                    <p className="text-xs text-muted-foreground">{notif.createdAt}</p>
                                                </div>
                                            </div>
                                            {notif.type === 'follow' && !notif.isFollowingBack && (
                                                <Button size="sm" variant="outline" onClick={() => handleFollowBack(notif.fromUsername)}>Follow Back</Button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted-foreground text-center py-8">No notifications yet.</p>
                           )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
