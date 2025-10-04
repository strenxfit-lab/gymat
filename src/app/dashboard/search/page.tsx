"use client";

import { UserSearch } from "@/components/user-search";
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SearchPage() {
    const router = useRouter();

    const getBackLink = () => {
        // This is a simplified logic. A more robust solution might use state management.
        if (typeof window !== "undefined") {
            if (document.referrer.includes('/dashboard/owner')) {
                return '/dashboard/owner/community';
            }
            if (document.referrer.includes('/dashboard/member')) {
                return '/dashboard/member/community';
            }
            if (document.referrer.includes('/dashboard/trainer')) {
                return '/dashboard/trainer/community';
            }
        }
        // Fallback for owner as it's the most likely case to have this search feature.
        return '/dashboard/owner/community';
    }


  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Search Users</h1>
        <Link href={getBackLink()} passHref>
            <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4"/>Back to Community
            </Button>
        </Link>
      </div>
      <UserSearch />
    </div>
  );
}
