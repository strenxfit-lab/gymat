
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

interface BottomNavbarProps {
  navItems: NavItem[];
}

export function BottomNavbar({ navItems }: BottomNavbarProps) {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t border-border">
      <div className="grid h-full max-w-lg grid-cols-4 mx-auto font-medium">
        {navItems.map((item) => {
            const content = (
                 <Button
                    variant="ghost"
                    className={cn(
                        "inline-flex flex-col items-center justify-center px-5 h-full w-full",
                        pathname === item.href ? "text-primary" : "text-muted-foreground"
                    )}
                    onClick={item.onClick}
                    >
                    {item.icon}
                    <span className="text-xs">{item.label}</span>
                </Button>
            );

            if (item.href === "#" || item.onClick) {
                return <div key={item.label} className="h-full w-full">{content}</div>
            }

            return (
              <Link href={item.href} key={item.label} passHref className="h-full w-full">
                {content}
              </Link>
            )
        })}
      </div>
    </div>
  );
}
