
"use client";

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, startAt, endAt, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

interface CommunityUser {
  id: string;
  userId: string;
  // We might want to add photoUrl here later
}

export function UserSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CommunityUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleSearch = async () => {
      if (searchQuery.trim() === '') {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const q = query(
          collection(db, 'userCommunity'),
          orderBy('__name__'),
          startAt(searchQuery.toLowerCase()),
          endAt(searchQuery.toLowerCase() + '\uf8ff'),
          limit(20)
        );
        const querySnapshot = await getDocs(q);
        const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityUser));
        setSearchResults(users);
      } catch (error) {
        console.error("Error searching users:", error);
        toast({ title: "Search Error", description: "Could not perform search.", variant: "destructive" });
      } finally {
        setIsSearching(false);
      }
    };

    const debounceId = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(debounceId);
  }, [searchQuery, toast]);

  return (
    <div>
        <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-lg h-12"
            />
        </div>

        <Card>
            <CardContent className="p-4">
                {isSearching && (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
                {!isSearching && searchQuery && searchResults.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                        <p>No users found for "{searchQuery}".</p>
                    </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {searchResults.map(user => (
                        <Link href={`/profile/${user.id}`} key={user.id}>
                            <div className="flex items-center gap-3 rounded-md border p-3 hover:bg-accent cursor-pointer">
                                <Avatar>
                                    <AvatarFallback>{user.id.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{user.id}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
