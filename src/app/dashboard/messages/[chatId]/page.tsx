
"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    timestamp: any;
}

interface Chat {
    id: string;
    participants: string[];
}

export default function ChatPage() {
    const params = useParams();
    const chatId = params.chatId as string;
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [otherParticipant, setOtherParticipant] = useState<string | null>(null);
    const { toast } = useToast();
    const router = useRouter();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
    const currentUserId = role === 'owner' ? localStorage.getItem('userDocId') : (role === 'member' ? localStorage.getItem('memberId') : localStorage.getItem('trainerId'));

    useEffect(() => {
        if (!chatId) return;

        const chatRef = doc(db, 'chats', chatId);
        
        const unsubscribeChat = onSnapshot(chatRef, (docSnap) => {
            if (docSnap.exists()) {
                const chatData = { id: docSnap.id, ...docSnap.data() } as Chat;
                setChat(chatData);
                const other = chatData.participants.find(p => p !== localStorage.getItem('communityUsername'));
                setOtherParticipant(other || "User");
                
                const messagesRef = collection(chatRef, 'messages');
                const q = query(messagesRef, orderBy('timestamp', 'asc'));

                const unsubscribeMessages = onSnapshot(q, (querySnapshot) => {
                    const msgs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message));
                    setMessages(msgs);
                    setLoading(false);
                });
                return () => unsubscribeMessages();
            } else {
                toast({ title: "Error", description: "Chat not found.", variant: "destructive" });
                router.push('/dashboard/messages');
            }
        });

        return () => unsubscribeChat();

    }, [chatId, router, toast]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !currentUserId || !chat) return;

        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const chatRef = doc(db, 'chats', chatId);

        const senderName = localStorage.getItem('communityUsername') || 'User';

        try {
            await addDoc(messagesRef, {
                text: newMessage,
                senderId: currentUserId,
                senderName: senderName,
                timestamp: serverTimestamp(),
            });

            await updateDoc(chatRef, {
                lastMessage: newMessage,
                lastMessageTimestamp: serverTimestamp(),
            });

            setNewMessage("");
        } catch (error) {
            console.error("Error sending message:", error);
            toast({ title: "Error", description: "Could not send message.", variant: "destructive" });
        }
    };
    
    if (loading) {
      return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>;
    }

    return (
        <div className="flex flex-col h-screen">
            <header className="flex items-center gap-4 p-4 border-b bg-background sticky top-0 z-10">
                <Link href="/dashboard/messages" passHref>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft />
                    </Button>
                </Link>
                <Avatar>
                    <AvatarFallback>{otherParticipant?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <h1 className="font-semibold text-lg">{otherParticipant}</h1>
            </header>
            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className={cn("flex items-end gap-2", msg.senderId === currentUserId ? "justify-end" : "justify-start")}>
                        <div className={cn("rounded-lg px-4 py-2 max-w-sm", msg.senderId === currentUserId ? "bg-primary text-primary-foreground" : "bg-muted")}>
                           <p className="text-sm">{msg.text}</p>
                           {msg.timestamp && <p className="text-xs opacity-70 mt-1 text-right">{format(msg.timestamp.toDate(), 'p')}</p>}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </main>
            <footer className="p-4 border-t bg-background">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input 
                        value={newMessage} 
                        onChange={(e) => setNewMessage(e.target.value)} 
                        placeholder="Type a message..." 
                        autoComplete="off"
                    />
                    <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                        <Send className="h-4 w-4"/>
                    </Button>
                </form>
            </footer>
        </div>
    );
}
