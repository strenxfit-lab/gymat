
"use client";

import { useState } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarInset,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { Dumbbell, Users, CreditCard, ClipboardList, BarChart3, Megaphone, Boxes, ChevronDown, Info } from 'lucide-react';

export default function OwnerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);

  const toggleSubMenu = (name: string) => {
    setOpenSubMenu(prev => (prev === name ? null : name));
  };

  const subMenuButtonClass = "text-muted-foreground hover:text-foreground font-normal";

  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-semibold">GymLogin Pro</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarGroup>
                <SidebarGroupLabel>Features</SidebarGroupLabel>
                 <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => toggleSubMenu('gym-info')} className="justify-between">
                        <div className="flex items-center gap-2"><Info /> Gym Info</div>
                        <ChevronDown className={`transition-transform duration-200 ${openSubMenu === 'gym-info' ? 'rotate-180' : ''}`} />
                    </SidebarMenuButton>
                    {openSubMenu === 'gym-info' && (
                        <SidebarMenuSub className="space-y-3">
                            <SidebarMenuSubButton className={subMenuButtonClass}>Basic Gym Information</SidebarMenuSubButton>
                            <SidebarMenuSubButton className={subMenuButtonClass}>Owner Information</SidebarMenuSubButton>
                            <SidebarMenuSubButton className={subMenuButtonClass}>Gym Capacity</SidebarMenuSubButton>
                            <SidebarMenuSubButton className={subMenuButtonClass}>Membership & Plans</SidebarMenuSubButton>
                            <SidebarMenuSubButton className={subMenuButtonClass}>Facilities & Machines</SidebarMenuSubButton>
                            <SidebarMenuSubButton className={subMenuButtonClass}>Goals & Insights</SidebarMenuSubButton>
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => toggleSubMenu('member')} className="justify-between">
                        <div className="flex items-center gap-2"><Users /> Member Management</div>
                        <ChevronDown className={`transition-transform duration-200 ${openSubMenu === 'member' ? 'rotate-180' : ''}`} />
                    </SidebarMenuButton>
                    {openSubMenu === 'member' && (
                        <SidebarMenuSub className="space-y-3">
                            <SidebarMenuSubButton className={subMenuButtonClass}>Multi-branch support</SidebarMenuSubButton>
                            <SidebarMenuSubButton className={subMenuButtonClass}>Member profile with history</SidebarMenuSubButton>
                            <SidebarMenuSubButton className={subMenuButtonClass}>Membership pause/freeze</SidebarMenuSubButton>
                            <SidebarMenuSubButton className={subMenuButtonClass}>Automated messages</SidebarMenuSubButton>
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => toggleSubMenu('billing')} className="justify-between">
                        <div className="flex items-center gap-2"><CreditCard /> Payment & Billing</div>
                        <ChevronDown className={`transition-transform duration-200 ${openSubMenu === 'billing' ? 'rotate-180' : ''}`} />
                    </SidebarMenuButton>
                    {openSubMenu === 'billing' && (
                        <SidebarMenuSub className="space-y-3">
                            <SidebarMenuSubButton className={subMenuButtonClass}>Recurring billing</SidebarMenuSubButton>
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => toggleSubMenu('class')} className="justify-between">
                        <div className="flex items-center gap-2"><ClipboardList /> Class & Trainer Management</div>
                        <ChevronDown className={`transition-transform duration-200 ${openSubMenu === 'class' ? 'rotate-180' : ''}`} />
                    </SidebarMenuButton>
                     {openSubMenu === 'class' && (
                        <SidebarMenuSub className="space-y-3">
                            <SidebarMenuSubButton className={subMenuButtonClass}>Class scheduling</SidebarMenuSubButton>
                            <SidebarMenuSubButton className={subMenuButtonClass}>Waitlist management</SidebarMenuSubButton>
                            <SidebarMenuSubButton className={subMenuButtonClass}>Trainer assignments</SidebarMenuSubButton>
                            <SidebarMenuSubButton className={subMenuButtonClass}>Session tracking</SidebarMenuSubButton>
                            <SidebarMenuSubButton className={subMenuButtonClass}>Trainer performance</SidebarMenuSubButton>
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
                <SidebarMenuItem>
                     <SidebarMenuButton onClick={() => toggleSubSubMenu('reports')} className="justify-between">
                        <div className="flex items-center gap-2"><BarChart3 /> Reporting & Analytics</div>
                        <ChevronDown className={`transition-transform duration-200 ${openSubMenu === 'reports' ? 'rotate-180' : ''}`} />
                    </SidebarMenuButton>
                     {openSubMenu === 'reports' && (
                        <SidebarMenuSub className="space-y-3">
                            <SidebarMenuSubButton className={subMenuButtonClass}>Revenue reports</SidebarMenuSubButton>
                            <SidebarMenuSubButton className={subMenuButtonClass}>Attendance trends</SidebarMenuSubButton>
                            <SidebarMenuSubButton className={subMenuButtonClass}>Trainer performance</SidebarMenuSubButton>
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
                <SidebarMenuItem>
                     <SidebarMenuButton onClick={() => toggleSubMenu('comms')} className="justify-between">
                        <div className="flex items-center gap-2"><Megaphone /> Communication & Marketing</div>
                        <ChevronDown className={`transition-transform duration-200 ${openSubMenu === 'comms' ? 'rotate-180' : ''}`} />
                    </SidebarMenuButton>
                     {openSubMenu === 'comms' && (
                        <SidebarMenuSub className="space-y-3">
                            <SidebarMenuSubButton className={subMenuButtonClass}>SMS, WhatsApp, Email</SidebarMenuSubButton>
                            <SidebarMenuSubButton className={subMenuButtonClass}>Referral programs</SidebarMenuSubButton>
                            <SidebarMenuSubButton className={subMenuButtonClass}>Event management</SidebarMenuSubButton>
                            <SidebarMenuSubButton className={subMenuButtonClass}>Social media integration</SidebarMenuSubButton>
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
                 <SidebarMenuItem>
                     <SidebarMenuButton onClick={() => toggleSubMenu('inventory')} className="justify-between">
                        <div className="flex items-center gap-2"><Boxes /> Inventory & Facility</div>
                        <ChevronDown className={`transition-transform duration-200 ${openSubMenu === 'inventory' ? 'rotate-180' : ''}`} />
                    </SidebarMenuButton>
                     {openSubMenu === 'inventory' && (
                        <SidebarMenuSub className="space-y-3">
                            <SidebarMenuSubButton className={subMenuButtonClass}>Equipment maintenance</SidebarMenuSubButton>
                            <SidebarMenuSubButton className={subMenuButtonClass}>Inventory tracking</SidebarMenuSubButton>
                            <SidebarMenuSubButton className={subMenuButtonClass}>Low-stock alerts</SidebarMenuSubButton>
                            <SidebarMenuSubButton className={subMenuButtonClass}>Room/class booking</SidebarMenuSubButton>
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
            </SidebarGroup>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          {/* Footer content if any */}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="p-4 flex items-center gap-2">
            <SidebarTrigger variant="outline" size="default">
                <Dumbbell/>
            </SidebarTrigger>
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
