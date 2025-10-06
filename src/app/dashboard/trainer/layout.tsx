
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
import { Dumbbell, Users, CreditCard, ClipboardList, BarChart3, Megaphone, Boxes, Info, Mail, Phone, Building, UserCheck, LogOut, MessageSquare, CalendarCheck, CheckSquare, Clock, KeyRound, ChevronDown, IndianRupee, LifeBuoy, Utensils, LayoutDashboard, QrCode, Wrench, Activity } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import * as React from 'react';
import { doc, onSnapshot, collection, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const MenuItem = ({ href, children, icon, isExternal = false, notificationCount }: { href: string, children: React.ReactNode, icon?: React.ReactNode, isExternal?: boolean, notificationCount?: number }) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  const linkProps = isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {};

  return (
    <Link href={href} passHref {...linkProps}>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start gap-2 transition-colors duration-300 ease-in-out relative",
          isActive ? "bg-indigo-100 text-indigo-600 font-semibold rounded-xl" : "hover:bg-gray-100 dark:hover:bg-gray-800"
        )}
      >
        {icon}
        {children}
        {notificationCount && notificationCount > 0 && (
            <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs">
                {notificationCount}
            </span>
        )}
      </Button>
    </Link>
  )
}

export default function TrainerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [trainerName, setTrainerName] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);
    const name = localStorage.getItem('userName');
    setTrainerName(name);

    const username = localStorage.getItem('communityUsername');
    if (username) {
        const userCommunityRef = doc(db, 'userCommunity', username);
        const requestsQuery = query(collection(userCommunityRef, 'followRequests'));
        
        const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
            setNotificationCount(snapshot.size);
        });

        return () => unsubscribe();
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };
  
  const isCommunityPage = pathname.startsWith('/dashboard/trainer/community') || pathname.startsWith('/dashboard/trainer/profile') || pathname.startsWith('/dashboard/trainer/activity');

  if (isCommunityPage) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
      <Sidebar className="flex flex-col shadow-md border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out">
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Dumbbell className="w-8 h-8 text-primary" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">Strenx</h1>
          </div>
           {trainerName && (
            <div className="mt-2 text-xs text-center p-1 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center gap-2">
              <span>Welcome, {trainerName}</span>
            </div>
          )}
        </SidebarHeader>
        <SidebarContent className="flex-1 overflow-y-auto">
          <SidebarMenu>
            <MenuItem href="/dashboard/trainer" icon={<LayoutDashboard />}>Dashboard</MenuItem>
            <MenuItem href="/dashboard/trainer/profile" icon={<UserCheck />}>My Profile</MenuItem>
            <MenuItem href="/dashboard/trainer/community" icon={<Users />}>Community</MenuItem>
            <MenuItem href="/dashboard/trainer/activity" icon={<Activity />} notificationCount={notificationCount}>Activity</MenuItem>
            <MenuItem href="/dashboard/trainer/attendance" icon={<CheckSquare />}>My Attendance</MenuItem>
            <MenuItem href="/dashboard/trainer/maintenance" icon={<Wrench />}>Maintenance</MenuItem>
            <MenuItem href="/dashboard/trainer/payments" icon={<IndianRupee />}>My Payments</MenuItem>
            <MenuItem href="/dashboard/trainer/complaints" icon={<MessageSquare />}>Complaints</MenuItem>
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
