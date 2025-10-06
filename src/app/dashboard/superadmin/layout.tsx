
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarTrigger,
  SidebarFooter,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { Dumbbell, LogOut, LayoutDashboard, UserCog, IndianRupee, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import * as React from 'react';

const MenuItem = ({ href, children, icon }: { href: string, children: React.ReactNode, icon?: React.ReactNode }) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link href={href} passHref>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start gap-2 transition-colors duration-300 ease-in-out",
          isActive ? "bg-indigo-100 text-indigo-600 font-semibold rounded-xl" : "hover:bg-gray-100 dark:hover:bg-gray-800"
        )}
      >
        {icon}
        {children}
      </Button>
    </Link>
  )
}

export default function SuperAdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [adminName, setAdminName] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    // In a real app, you'd fetch the admin's name based on their ID
    setAdminName("Super Admin");
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
      <Sidebar className="flex flex-col shadow-md border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out">
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <UserCog className="w-8 h-8 text-destructive" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">Strenx Admin</h1>
          </div>
           {adminName && (
            <div className="mt-2 text-xs text-center p-1 rounded-md bg-destructive/10 text-destructive-foreground flex items-center justify-center gap-2">
              <span>Welcome, {adminName}</span>
            </div>
          )}
        </SidebarHeader>
        <SidebarContent className="flex-1 overflow-y-auto">
          <SidebarMenu>
            <MenuItem href="/dashboard/superadmin" icon={<LayoutDashboard />}>Dashboard</MenuItem>
            <MenuItem href="/dashboard/superadmin/settlements" icon={<IndianRupee />}>Settlements</MenuItem>
            <MenuItem href="/dashboard/superadmin/reports" icon={<Flag />}>Reports</MenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 space-y-4">
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
            <LogOut className="h-5 w-5 text-red-500"/>
            <span className="text-red-500">Logout</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <div className="flex-1 flex flex-col transition-all duration-300 ease-in-out">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-sm px-4 md:px-8">
            <SidebarTrigger className="md:hidden" />
            <div className='flex-1'></div>
            {isMounted && <ThemeToggle />}
        </header>
        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
      </div>
    </SidebarProvider>
  );
}
