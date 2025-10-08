
"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const userRole = localStorage.getItem('userRole');
    const expectedPath = userRole ? `/dashboard/${userRole}` : '/';

    if (!userRole) {
      router.replace('/');
    } else if (!pathname.startsWith(expectedPath)) {
      // If user is logged in but trying to access another role's dashboard
      router.replace(expectedPath);
    } else {
      setIsVerifying(false);
    }
  }, [pathname, router]);

  if (isVerifying) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verifying access...</p>
      </div>
    );
  }

  return <>{children}</>;
}
