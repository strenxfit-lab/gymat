
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProgressRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        const username = localStorage.getItem('communityUsername');
        if (username) {
            router.replace(`/progress/${username}`);
        } else {
            // Handle case where user is not logged in or has no community profile
            router.replace('/'); 
        }
    }, [router]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0F0F0F]">
            <p className="text-white">Redirecting to your progress...</p>
        </div>
    );
}

    