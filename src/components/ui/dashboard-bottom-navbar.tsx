"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { LayoutDashboard, BarChart3, User, Rss, Search, Activity } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface DashboardBottomNavbarProps {
  role: 'member' | 'trainer' | 'owner' | 'superadmin';
}

export function DashboardBottomNavbar({ role }: DashboardBottomNavbarProps) {
  const pathname = usePathname();

  let navItems: NavItem[] = [];

  if (role === 'member') {
      navItems = [
        { label: "Dashboard", href: "/dashboard/member", icon: <LayoutDashboard /> },
        { label: "Search", href: "/dashboard/search", icon: <Search /> },
        { label: "Feed", href: "/dashboard/member/community", icon: <Rss /> },
        { label: "Activity", href: "/dashboard/member/activity", icon: <Activity /> },
        { label: "Profile", href: "/dashboard/member/profile", icon: <User /> },
      ];
  } else if (role === 'trainer') {
      navItems = [
        { label: "Dashboard", href: "/dashboard/trainer", icon: <LayoutDashboard /> },
        { label: "Search", href: "/dashboard/search", icon: <Search /> },
        { label: "Feed", href: "/dashboard/trainer/community", icon: <Rss /> },
        { label: "Activity", href: "/dashboard/trainer/activity", icon: <Activity /> },
        { label: "Profile", href: "/dashboard/trainer/profile", icon: <User /> },
      ];
  } else if (role === 'owner') {
      navItems = [
        { label: "Dashboard", href: "/dashboard/owner", icon: <LayoutDashboard /> },
        { label: "Search", href: "/dashboard/search", icon: <Search /> },
        { label: "Feed", href: "/dashboard/owner/community", icon: <Rss /> },
        { label: "Activity", href: "/dashboard/owner/activity", icon: <Activity /> },
        { label: "Profile", href: "/dashboard/owner/profile", icon: <User /> },
      ];
  } else if (role === 'superadmin') {
     navItems = [
        { label: "Dashboard", href: "/dashboard/superadmin", icon: <LayoutDashboard /> },
        { label: "Search", href: "/dashboard/search", icon: <Search /> },
        { label: "Feed", href: "/dashboard/superadmin/community", icon: <Rss /> },
        { label: "Activity", href: "/dashboard/superadmin/activity", icon: <Activity /> },
        { label: "Profile", href: "/dashboard/superadmin/profile", icon: <User /> },
      ];
  }


  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t border-border md:hidden">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
        {navItems.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <Link href={item.href} key={item.label} passHref className="h-full w-full">
                 <Button
                    variant="ghost"
                    className={cn(
                        "inline-flex flex-col items-center justify-center px-5 h-full w-full",
                        isActive ? "text-primary" : "text-muted-foreground"
                    )}
                    >
                    {item.icon}
                    <span className="text-xs">{item.label}</span>
                </Button>
              </Link>
            )
        })}
      </div>
    </div>
  );
}
