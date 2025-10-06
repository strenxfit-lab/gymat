
"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Send, Image as ImageIcon, Video as VideoIcon, X, Download, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from 'next/image';

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    timestamp: any;
    media?: {
        url: string;
        type: 'image' | 'video';
    };
    sharedPost?: {
        postId: string;
        authorName: string;
        textSnippet: string;
    };
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
    
    const [mediaPreview, setMediaPreview] = useState<{url: string, type: 'image' | 'video'} | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    
    const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
    const currentUserId = role === 'owner' ? localStorage.getItem('userDocId') : (role === 'member' ? localStorage.getItem('memberId') : localStorage.getItem('trainerId'));
    const currentUsername = typeof window !== 'undefined' ? localStorage.getItem('communityUsername') : null;


    useEffect(() => {
        if (!chatId) return;

        const chatRef = doc(db, 'chats', chatId);
        
        const unsubscribeChat = onSnapshot(chatRef, (docSnap) => {
            if (docSnap.exists()) {
                const chatData = { id: docSnap.id, ...docSnap.data() } as Chat;
                setChat(chatData);
                const other = chatData.participants.find(p => p !== currentUsername);
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

    }, [chatId, router, toast, currentUsername]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setMediaPreview({ url: result, type });
            };
            reader.readAsDataURL(file);
        }
    };


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((newMessage.trim() === '' && !mediaPreview) || !currentUserId || !chat) return;

        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const chatRef = doc(db, 'chats', chatId);

        const senderName = currentUsername || 'User';
        const recipientUsername = chat.participants.find(p => p !== currentUsername);

        try {
            await addDoc(messagesRef, {
                text: newMessage,
                senderId: currentUserId,
                senderName: senderName,
                timestamp: serverTimestamp(),
                media: mediaPreview || null,
            });

            const lastMessageText = mediaPreview ? `Sent a ${mediaPreview.type}` : newMessage;
            await updateDoc(chatRef, {
                lastMessage: lastMessageText,
                lastMessageTimestamp: serverTimestamp(),
            });

            // Set notification for recipient
            if (recipientUsername) {
                const recipientRef = doc(db, 'userCommunity', recipientUsername);
                await updateDoc(recipientRef, { hasNewMessage: true });
            }

            setNewMessage("");
            setMediaPreview(null);
            if(imageInputRef.current) imageInputRef.current.value = "";
            if(videoInputRef.current) videoInputRef.current.value = "";
        } catch (error) {
            console.error("Error sending message:", error);
            toast({ title: "Error", description: "Could not send message.", variant: "destructive" });
        }
    };
    
     const handleDownload = (url: string, filename: string) => {
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                 <div className="text-center text-xs text-muted-foreground p-2 my-2 rounded-md bg-muted/50 w-fit mx-auto flex items-center gap-2">
                    <Lock className="h-3 w-3" />
                    Messages are end-to-end encrypted. Not even Strenx can read them.
                </div>
                {messages.map(msg => (
                    <div key={msg.id} className={cn("flex items-end gap-2", msg.senderId === currentUserId ? "justify-end" : "justify-start")}>
                        <div className={cn("rounded-lg px-3 py-2 max-w-sm", msg.senderId === currentUserId ? "bg-primary text-primary-foreground" : "bg-muted")}>
                           {msg.media && (
                               <div className="relative group">
                                    {msg.media.type === 'image' ? (
                                        <Image src={msg.media.url} alt="Sent media" width={250} height={250} className="rounded-md object-cover"/>
                                    ) : (
                                        <video src={msg.media.url} controls className="w-full rounded-md" />
                                    )}
                                     <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="absolute top-2 right-2 h-8 w-8 bg-black/50 hover:bg-black/75 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleDownload(msg.media!.url, `media_${msg.id}`)}
                                     >
                                         <Download className="h-4 w-4"/>
                                     </Button>
                               </div>
                           )}
                           {msg.sharedPost && (
                                <Link href={`/posts/${msg.sharedPost.postId}`} passHref>
                                    <div className="block p-3 my-2 border rounded-lg hover:bg-background/20">
                                        <p className="font-bold">Post by {msg.sharedPost.authorName}</p>
                                        <p className="text-sm italic line-clamp-2">"{msg.sharedPost.textSnippet}..."</p>
                                    </div>
                                </Link>
                           )}
                           {msg.text && <p className={cn("text-sm", (msg.media || msg.sharedPost) && "mt-2")}>{msg.text}</p>}
                           {msg.timestamp && <p className="text-xs opacity-70 mt-1 text-right">{format(msg.timestamp.toDate(), 'p')}</p>}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </main>
            <footer className="p-4 border-t bg-background">
                 {mediaPreview && (
                    <div className="relative mb-2 w-fit">
                        {mediaPreview.type === 'image' ? (
                             <Image src={mediaPreview.url} alt="preview" width={80} height={80} className="rounded-md object-cover h-20 w-20"/>
                        ) : (
                            <video src={mediaPreview.url} className="h-20 w-auto rounded-md" />
                        )}
                        <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 bg-black/50 hover:bg-black/75 text-white" onClick={() => setMediaPreview(null)}>
                            <X className="h-4 w-4"/>
                        </Button>
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input 
                        value={newMessage} 
                        onChange={(e) => setNewMessage(e.target.value)} 
                        placeholder="Type a message..." 
                        autoComplete="off"
                    />
                    <input type="file" ref={imageInputRef} accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'image')} />
                    <input type="file" ref={videoInputRef} accept="video/*" className="hidden" onChange={(e) => handleFileChange(e, 'video')} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()}>
                        <ImageIcon className="h-5 w-5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => videoInputRef.current?.click()}>
                        <VideoIcon className="h-5 w-5" />
                    </Button>
                    <Button type="submit" size="icon" disabled={!newMessage.trim() && !mediaPreview}>
                        <Send className="h-4 w-4"/>
                    </Button>
                </form>
            </footer>
        </div>
    );
}
