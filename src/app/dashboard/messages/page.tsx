
"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from 'date-fns';

interface Chat {
    id: string;
    participants: string[];
    lastMessage?: string;
    lastMessageTimestamp?: any;
    otherParticipant?: string;
}

export default function MessagesPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loggedInUsername = typeof window !== 'undefined' ? localStorage.getItem('communityUsername') : null;

  useEffect(() => {
    if (!loggedInUsername) {
        setLoading(false);
        return;
    }
    
    // Clear notification on page load
    const clearNotification = async () => {
        const userCommunityRef = doc(db, 'userCommunity', loggedInUsername);
        try {
            await updateDoc(userCommunityRef, { hasNewMessage: false });
        } catch (error) {
            console.warn("Could not clear new message notification:", error);
        }
    };
    clearNotification();


    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('participants', 'array-contains', loggedInUsername));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const chatsData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const otherParticipant = data.participants.find((p: string) => p !== loggedInUsername);
            return {
                id: doc.id,
                ...data,
                otherParticipant: otherParticipant || 'Unknown',
            } as Chat
        });
        
        // Sort on the client-side
        chatsData.sort((a, b) => {
            const timeA = a.lastMessageTimestamp?.toDate() || new Date(0);
            const timeB = b.lastMessageTimestamp?.toDate() || new Date(0);
            return timeB.getTime() - timeA.getTime();
        });

        setChats(chatsData);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching chats: ", error);
        toast({ title: "Error", description: "Could not fetch your messages.", variant: "destructive" });
        setLoading(false);
    });

    return () => unsubscribe();

  }, [loggedInUsername, toast]);
  
  const getBackLink = () => {
    const role = localStorage.getItem('userRole');
    if (role === 'member') return '/dashboard/member/community';
    if (role === 'trainer') return '/dashboard/trainer/community';
    return '/dashboard/owner/community';
  }


  if (loading) {
      return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>;
  }

  return (
    <div className="container mx-auto py-10 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-3xl font-bold">Messages</h1>
                <p className="text-muted-foreground">Your recent conversations.</p>
            </div>
            <Link href={getBackLink()} passHref>
                <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back</Button>
            </Link>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Chats</CardTitle>
            </CardHeader>
            <CardContent>
                {chats.length > 0 ? (
                    <ul className="space-y-2">
                        {chats.map(chat => (
                            <li key={chat.id}>
                                <Link href={`/dashboard/messages/${chat.id}`} passHref>
                                    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent cursor-pointer">
                                        <Avatar>
                                            <AvatarFallback>{chat.otherParticipant?.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <div className="flex justify-between">
                                                <p className="font-semibold">{chat.otherParticipant}</p>
                                                {chat.lastMessageTimestamp && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDistanceToNow(chat.lastMessageTimestamp.toDate(), { addSuffix: true })}
                                                    </p>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate">{chat.lastMessage || "No messages yet"}</p>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>You have no messages yet.</p>
                        <p className="text-sm">Start a conversation by visiting a user's profile.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
