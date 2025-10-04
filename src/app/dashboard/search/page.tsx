
"use client";

import { UserSearch } from "@/components/user-search";
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SearchPage() {
    const router = useRouter();

    const handleBack = () => {
        // A simple way to go back to the correct dashboard
        // A more robust solution might involve a global state or query param
        if (document.referrer.includes('/dashboard/owner')) {
            router.push('/dashboard/owner/community');
        } else if (document.referrer.includes('/dashboard/member')) {
            router.push('/dashboard/member/community');
        } else if (document.referrer.includes('/dashboard/trainer')) {
            router.push('/dashboard/trainer/community');
        } else {
            router.back();
        }
    }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Search Users</h1>
        <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4"/>Back to Community
        </Button>
      </div>
      <UserSearch />
    </div>
  );
}
