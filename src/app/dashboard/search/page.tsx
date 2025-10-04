
"use client";

import { UserSearch } from "@/components/user-search";
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SearchPage() {
    const [backLink, setBackLink] = useState('/dashboard/owner/community');

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        if (role === 'member') {
            setBackLink('/dashboard/member/community');
        } else if (role === 'trainer') {
            setBackLink('/dashboard/trainer/community');
        } else {
            setBackLink('/dashboard/owner/community');
        }
    }, []);

    return (
        <div className="container mx-auto py-10">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">Search Users</h1>
                <Link href={backLink} passHref>
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4"/>Back to Community
                    </Button>
                </Link>
            </div>
            <UserSearch />
        </div>
    );
}
