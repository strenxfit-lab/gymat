
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, getDocs, collectionGroup, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Search, Check, User } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface UserOption {
  id: string;
  name: string;
  role: 'member' | 'trainer';
}

export default function ViewKycPage() {
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchAllUsers = async () => {
      const userDocId = localStorage.getItem('userDocId');
      if (!userDocId) {
        setLoading(false);
        return;
      }
      
      try {
        const branchesCollection = collection(db, 'gyms', userDocId, 'branches');
        const branchesSnap = await getDocs(branchesCollection);
        
        let users: UserOption[] = [];

        for (const branchDoc of branchesSnap.docs) {
            const membersCollection = collection(branchDoc.ref, 'members');
            const membersSnap = await getDocs(membersCollection);
            membersSnap.forEach(doc => users.push({ id: doc.id, name: doc.data().fullName, role: 'member' }));

            const trainersCollection = collection(branchDoc.ref, 'trainers');
            const trainersSnap = await getDocs(trainersCollection);
            trainersSnap.forEach(doc => users.push({ id: doc.id, name: doc.data().fullName, role: 'trainer' }));
        }

        users.sort((a,b) => a.name.localeCompare(b.name));
        setAllUsers(users);
        setFilteredUsers(users);

      } catch (error) {
        console.error("Error fetching users:", error);
        toast({ title: 'Error', description: 'Could not fetch user list.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetchAllUsers();
  }, [toast]);

  useEffect(() => {
    const results = allUsers.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(results);
  }, [searchTerm, allUsers]);

  const handleSelectUser = (user: UserOption) => {
    if (user.role === 'member') {
      router.push(`/dashboard/owner/members/${user.id}`);
    } else {
      // Assuming trainer profile pages will be at /dashboard/owner/trainers/[trainerId]
      router.push(`/dashboard/owner/trainers/${user.id}`);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>View User Profile & KYC</CardTitle>
          <CardDescription>Search for a member or trainer to view their complete profile, including KYC details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center border-b px-3">
             <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
             <Input 
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
             />
          </div>
          <div className="mt-4 max-h-[300px] overflow-y-auto">
            {loading ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
            ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                    <div 
                        key={`${user.id}-${user.role}`}
                        onClick={() => handleSelectUser(user)}
                        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent"
                    >
                        <User className="mr-2 h-4 w-4"/>
                        <span>{user.name}</span>
                        <span className="ml-auto text-xs text-muted-foreground capitalize">{user.role}</span>
                    </div>
                ))
            ) : (
                <p className="py-6 text-center text-sm">No users found.</p>
            )}
          </div>
        </CardContent>
         <CardContent className="flex justify-start">
            <Link href="/dashboard/owner">
                <Button variant="outline" type="button"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Button>
            </Link>
        </CardContent>
      </Card>
    </div>
  );
}
