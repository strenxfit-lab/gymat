
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
import { Dumbbell, Users, CreditCard, ClipboardList, BarChart3, Megaphone, Boxes, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OwnerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState<{[key: string]: boolean}>({});

  const toggleSubMenu = (name: string) => {
    setOpenSubMenus(prev => ({...prev, [name]: !prev[name]}));
  };

  return (
    <SidebarProvider>
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
                    <SidebarMenuButton onClick={() => toggleSubMenu('member')} className="justify-between">
                        <div className="flex items-center gap-2"><Users /> Member Management</div>
                        <ChevronDown className={`transition-transform duration-200 ${openSubMenus['member'] ? 'rotate-180' : ''}`} />
                    </SidebarMenuButton>
                    {openSubMenus['member'] && (
                        <SidebarMenuSub>
                            <SidebarMenuSubButton>Multi-branch support</SidebarMenuSubButton>
                            <SidebarMenuSubButton>Member profile with history</SidebarMenuSubButton>
                            <SidebarMenuSubButton>Membership pause/freeze</SidebarMenuSubButton>
                            <SidebarMenuSubButton>Automated messages</SidebarMenuSubButton>
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => toggleSubMenu('billing')} className="justify-between">
                        <div className="flex items-center gap-2"><CreditCard /> Payment & Billing</div>
                        <ChevronDown className={`transition-transform duration-200 ${openSubMenus['billing'] ? 'rotate-180' : ''}`} />
                    </SidebarMenuButton>
                    {openSubMenus['billing'] && (
                        <SidebarMenuSub>
                            <SidebarMenuSubButton>Recurring billing</SidebarMenuSubButton>
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => toggleSubMenu('class')} className="justify-between">
                        <div className="flex items-center gap-2"><ClipboardList /> Class & Trainer Management</div>
                        <ChevronDown className={`transition-transform duration-200 ${openSubMenus['class'] ? 'rotate-180' : ''}`} />
                    </SidebarMenuButton>
                     {openSubMenus['class'] && (
                        <SidebarMenuSub>
                            <SidebarMenuSubButton>Class scheduling</SidebarMenuSubButton>
                            <SidebarMenuSubButton>Waitlist management</SidebarMenuSubButton>
                            <SidebarMenuSubButton>Trainer assignments</SidebarMenuSubButton>
                            <SidebarMenuSubButton>Session tracking</SidebarMenuSubButton>
                            <SidebarMenuSubButton>Trainer performance</SidebarMenuSubButton>
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
                <SidebarMenuItem>
                     <SidebarMenuButton onClick={() => toggleSubMenu('reports')} className="justify-between">
                        <div className="flex items-center gap-2"><BarChart3 /> Reporting & Analytics</div>
                        <ChevronDown className={`transition-transform duration-200 ${openSubMenus['reports'] ? 'rotate-180' : ''}`} />
                    </SidebarMenuButton>
                     {openSubMenus['reports'] && (
                        <SidebarMenuSub>
                            <SidebarMenuSubButton>Revenue reports</SidebarMenuSubButton>
                            <SidebarMenuSubButton>Attendance trends</SidebarMenuSubButton>
                            <SidebarMenuSubButton>Trainer performance</SidebarMenuSubButton>
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
                <SidebarMenuItem>
                     <SidebarMenuButton onClick={() => toggleSubMenu('comms')} className="justify-between">
                        <div className="flex items-center gap-2"><Megaphone /> Communication & Marketing</div>
                        <ChevronDown className={`transition-transform duration-200 ${openSubMenus['comms'] ? 'rotate-180' : ''}`} />
                    </SidebarMenuButton>
                     {openSubMenus['comms'] && (
                        <SidebarMenuSub>
                            <SidebarMenuSubButton>SMS, WhatsApp, Email</SidebarMenuSubButton>
                            <SidebarMenuSubButton>Referral programs</SidebarMenuSubButton>
                            <SidebarMenuSubButton>Event management</SidebarMenuSubButton>
                            <SidebarMenuSubButton>Social media integration</SidebarMenuSubButton>
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
                 <SidebarMenuItem>
                     <SidebarMenuButton onClick={() => toggleSubMenu('inventory')} className="justify-between">
                        <div className="flex items-center gap-2"><Boxes /> Inventory & Facility</div>
                        <ChevronDown className={`transition-transform duration-200 ${openSubMenus['inventory'] ? 'rotate-180' : ''}`} />
                    </SidebarMenuButton>
                     {openSubMenus['inventory'] && (
                        <SidebarMenuSub>
                            <SidebarMenuSubButton>Equipment maintenance</SidebarMenuSubButton>
                            <SidebarMenuSubButton>Inventory tracking</SidebarMenuSubButton>
                            <SidebarMenuSubButton>Low-stock alerts</SidebarMenuSubButton>
                            <SidebarMenuSubButton>Room/class booking</SidebarMenuSubButton>
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
            <SidebarTrigger>
                <Button variant="outline" size="icon">
                    <Dumbbell/>
                </Button>
            </SidebarTrigger>
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
