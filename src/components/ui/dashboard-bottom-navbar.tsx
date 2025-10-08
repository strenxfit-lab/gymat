"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { LayoutDashboard, BarChart3, User } from "lucide-react";

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

  const navItems: NavItem[] = [
    { label: "Dashboard", href: `/dashboard/${role}`, icon: <LayoutDashboard /> },
    { label: "Progress", href: "/progress", icon: <BarChart3 /> },
    { label: "Profile", href: `/dashboard/${role}/profile`, icon: <User /> },
  ];

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t border-border md:hidden">
      <div className="grid h-full grid-cols-3 mx-auto font-medium">
        {navItems.map((item) => {
            // Special handling for owner/superadmin profile link
            const finalHref = (item.label === 'Profile' && (role === 'owner' || role === 'superadmin')) 
                ? `/dashboard/${role}/community` // Redirecting to community which has profile link
                : item.href;

            const isActive = pathname === finalHref;
            
            return (
              <Link href={finalHref} key={item.label} passHref className="h-full w-full">
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
