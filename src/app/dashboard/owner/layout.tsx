
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
import { Dumbbell, Users, CreditCard, ClipboardList, BarChart3, Megaphone, Boxes, ChevronDown, Info, Mail, Phone, Building, UserCheck, LogOut, MessageSquare, CalendarCheck, CheckSquare, Clock } from 'lucide-react';
import { doc, getDoc, collection, getDocs, Timestamp, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, SheetHeader, SheetTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { addMonths, addYears } from 'date-fns';

export default function OwnerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
  const [hasMultiBranch, setHasMultiBranch] = useState(false);
  const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);
  const [activeBranchName, setActiveBranchName] = useState<string | null>(null);
  const [tierInfo, setTierInfo] = useState<{ expiresAt: Date | null, tier: string | null }>({ expiresAt: null, tier: null });
  const [timeLeft, setTimeLeft] = useState('');
  const router = useRouter();
  const pathname = usePathname();


  useEffect(() => {
    const fetchGymData = async () => {
      const userDocId = localStorage.getItem('userDocId');
      if (userDocId) {
        const gymRef = doc(db, 'gyms', userDocId);
        const gymSnap = await getDoc(gymRef);

        if (gymSnap.exists()) {
            const gymData = gymSnap.data();
            if (gymData.multiBranch) {
                setHasMultiBranch(true);
            }
            
            let expirationDate: Date | null = null;
            let planTier: string | null = null;

            if (gymData.isTrial && gymData.trialKey) {
                const trialKeysRef = collection(db, 'trialKeys');
                const q = query(trialKeysRef, where("key", "==", gymData.trialKey));
                const trialKeySnap = await getDocs(q);
                if (!trialKeySnap.empty) {
                    const trialData = trialKeySnap.docs[0].data();
                    if (trialData.expiresAt) {
                        expirationDate = (trialData.expiresAt as Timestamp).toDate();
                        planTier = 'Trial';
                    }
                }
            } else if (gymData.tier && gymData.createdAt) {
                const createdAt = (gymData.createdAt as Timestamp).toDate();
                if (gymData.tier.toLowerCase() === 'monthly') {
                    expirationDate = addMonths(createdAt, 1);
                } else if (gymData.tier.toLowerCase() === 'yearly') {
                    expirationDate = addYears(createdAt, 1);
                }
                planTier = gymData.tier;
            }

            if (expirationDate) {
                setTierInfo({ expiresAt: expirationDate, tier: planTier });
            }

            const branchesCollection = collection(db, 'gyms', userDocId, 'branches');
            const branchesSnap = await getDocs(branchesCollection);
            const branches = branchesSnap.docs.map(d => ({id: d.id, ...d.data()}));

            let currentBranchId = localStorage.getItem('activeBranch');

            if (branches.length > 0) {
              if (!currentBranchId || !branches.find(b => b.id === currentBranchId)) {
                  currentBranchId = branches[0].id;
                  localStorage.setItem('activeBranch', currentBranchId);
              }
              const activeBranchDoc = branches.find(b => b.id === currentBranchId);
              setActiveBranchName(activeBranchDoc?.name);
              
              if (pathname === '/dashboard/owner') {
                  router.refresh();
              }
            } else {
              localStorage.removeItem('activeBranch');
              setActiveBranchName(null);
            }
        }
      }
    };
    fetchGymData();
  }, [pathname, router]);

  useEffect(() => {
    if (tierInfo.expiresAt) {
      const intervalId = setInterval(() => {
        const now = new Date();
        const diff = tierInfo.expiresAt!.getTime() - now.getTime();
        
        if (diff <= 0) {
          setTimeLeft("Expired");
          clearInterval(intervalId);
          return;
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      }, 1000);

      return () => clearInterval(intervalId);
    }
  }, [tierInfo.expiresAt]);

  const toggleSubMenu = (name: string) => {
    setOpenSubMenu(prev => (prev === name ? null : name));
  };
  
  const handleMultiBranchClick = (e: React.MouseEvent) => {
      router.push('/dashboard/owner/multi-branch');
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  const subMenuButtonClass = "text-muted-foreground hover:text-foreground font-normal";

  return (
    <SidebarProvider defaultOpen={false}>
       <Dialog open={isSupportDialogOpen} onOpenChange={setIsSupportDialogOpen}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Enable Multi-Branch Support</DialogTitle>
            <DialogDescription>
                This feature is not enabled for your account. Please contact Strenxfit support to activate it.
            </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col space-y-4 py-4">
                <a href="mailto:strenxfit@gmail.com" className="flex items-center gap-3 p-3 rounded-md hover:bg-accent transition-colors">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <span>strenxfit@gmail.com</span>
                </a>
                <a href="https://wa.me/917988487892" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 p-3 rounded-md hover:bg-accent transition-colors">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <span>+91 79884 87892</span>
                </a>
            </div>
        </DialogContent>
       </Dialog>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-semibold">Strenx GymLogin</h1>
          </div>
           {activeBranchName && (
            <div className="mt-2 text-xs text-center p-1 rounded-md bg-primary/10 text-primary-foreground flex items-center justify-center gap-2">
              <Building className="h-4 w-4" />
              <span>{activeBranchName}</span>
            </div>
          )}
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
                            <Link href="/dashboard/owner/gym-info/basic" passHref>
                                <SidebarMenuSubButton className={subMenuButtonClass}>Basic Gym Information</SidebarMenuSubButton>
                            </Link>
                            <Link href="/dashboard/owner/gym-info/owner" passHref>
                                <SidebarMenuSubButton className={subMenuButtonClass}>Owner Information</SidebarMenuSubButton>
                            </Link>
                            <Link href="/dashboard/owner/gym-info/gym-capacity" passHref>
                                <SidebarMenuSubButton className={subMenuButtonClass}>Gym Capacity</SidebarMenuSubButton>
                            </Link>
                            <Link href="/dashboard/owner/gym-info/membership-plans" passHref>
                              <SidebarMenuSubButton className={subMenuButtonClass}>Membership &amp; Plans</SidebarMenuSubButton>
                            </Link>
                            <Link href="/dashboard/owner/gym-info/facilities" passHref>
                                <SidebarMenuSubButton className={subMenuButtonClass}>Facilities &amp; Machines</SidebarMenuSubButton>
                            </Link>
                            <Link href="/dashboard/owner/gym-info/goals-and-insights" passHref>
                                <SidebarMenuSubButton className={subMenuButtonClass}>Goals &amp; Insights</SidebarMenuSubButton>
                            </Link>
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
                            <SidebarMenuSubButton onClick={handleMultiBranchClick} className={subMenuButtonClass}>
                                Multi-branch support
                            </SidebarMenuSubButton>
                             <Link href="/dashboard/owner/members">
                                <SidebarMenuSubButton className={subMenuButtonClass}>Member list</SidebarMenuSubButton>
                              </Link>
                            <Link href="/dashboard/owner/member-status">
                                <SidebarMenuSubButton className={subMenuButtonClass}>Membership pause/freeze</SidebarMenuSubButton>
                            </Link>
                            <Link href="/dashboard/owner/automated-messages">
                                <SidebarMenuSubButton className={subMenuButtonClass}>Reminders</SidebarMenuSubButton>
                            </Link>
                            <Link href="/dashboard/owner/complaints">
                                <SidebarMenuSubButton className={subMenuButtonClass}>Complaints</SidebarMenuSubButton>
                            </Link>
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
                 <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => toggleSubMenu('attendance')} className="justify-between">
                        <div className="flex items-center gap-2"><CheckSquare /> Attendance</div>
                        <ChevronDown className={`transition-transform duration-200 ${openSubMenu === 'attendance' ? 'rotate-180' : ''}`} />
                    </SidebarMenuButton>
                    {openSubMenu === 'attendance' && (
                        <SidebarMenuSub className="space-y-3">
                             <Link href="/dashboard/owner/attendance/mark">
                                <SidebarMenuSubButton className={subMenuButtonClass}>Mark Attendance</SidebarMenuSubButton>
                              </Link>
                            <Link href="/dashboard/owner/attendance/log">
                                <SidebarMenuSubButton className={subMenuButtonClass}>Attendance Log</SidebarMenuSubButton>
                            </Link>
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => toggleSubMenu('class')} className="justify-between">
                        <div className="flex items-center gap-2"><ClipboardList /> Class &amp; Trainer Management</div>
                        <ChevronDown className={`transition-transform duration-200 ${openSubMenu === 'class' ? 'rotate-180' : ''}`} />
                    </SidebarMenuButton>
                     {openSubMenu === 'class' && (
                        <SidebarMenuSub className="space-y-3">
                            <Link href="/dashboard/owner/class-scheduling">
                                <SidebarMenuSubButton className={subMenuButtonClass}>Class scheduling</SidebarMenuSubButton>
                            </Link>
                            <Link href="/dashboard/owner/waitlist">
                                <SidebarMenuSubButton className={subMenuButtonClass}>Waitlist management</SidebarMenuSubButton>
                             </Link>
                            <Link href="/dashboard/owner/trainer-assignments">
                                <SidebarMenuSubButton className={subMenuButtonClass}>Trainer assignments</SidebarMenuSubButton>
                            </Link>
                            <Link href="/dashboard/owner/session-tracking">
                                <SidebarMenuSubButton className={subMenuButtonClass}>Session tracking</SidebarMenuSubButton>
                            </Link>
                            <Link href="/dashboard/owner/trainer-performance">
                              <SidebarMenuSubButton className={subMenuButtonClass}>Trainer performance</SidebarMenuSubButton>
                            </Link>
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
                <SidebarMenuItem>
                     <SidebarMenuButton onClick={() => toggleSubMenu('reports')} className="justify-between">
                        <div className="flex items-center gap-2"><BarChart3 /> Reporting &amp; Analytics</div>
                        <ChevronDown className={`transition-transform duration-200 ${openSubMenu === 'reports' ? 'rotate-180' : ''}`} />
                    </SidebarMenuButton>
                     {openSubMenu === 'reports' && (
                        <SidebarMenuSub className="space-y-3">
                            <Link href="/dashboard/owner/revenue-reports">
                                <SidebarMenuSubButton className={subMenuButtonClass}>Revenue reports</SidebarMenuSubButton>
                            </Link>
                             <Link href="/dashboard/owner/expenses">
                                <SidebarMenuSubButton className={subMenuButtonClass}>Expenses</SidebarMenuSubButton>
                            </Link>
                            <Link href="/dashboard/owner/attendance-trends">
                                <SidebarMenuSubButton className={subMenuButtonClass}>Attendance trends</SidebarMenuSubButton>
                            </Link>
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <Link href="/dashboard/owner/make-offers" passHref>
                        <SidebarMenuButton>
                            <div className="flex items-center gap-2"><Megaphone /> Make offers</div>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                     <SidebarMenuButton onClick={() => toggleSubMenu('inventory')} className="justify-between">
                        <div className="flex items-center gap-2"><Boxes /> Inventory &amp; Facility</div>
                        <ChevronDown className={`transition-transform duration-200 ${openSubMenu === 'inventory' ? 'rotate-180' : ''}`} />
                    </SidebarMenuButton>
                     {openSubMenu === 'inventory' && (
                        <SidebarMenuSub className="space-y-3">
                            <Link href="/dashboard/owner/equipment-maintenance" passHref>
                                <SidebarMenuSubButton className={subMenuButtonClass}>Equipment maintenance</SidebarMenuSubButton>
                            </Link>
                            <Link href="/dashboard/owner/inventory-tracking" passHref>
                                <SidebarMenuSubButton className={subMenuButtonClass}>Inventory tracking</SidebarMenuSubButton>
                             </Link>
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
            </SidebarGroup>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          {timeLeft && tierInfo.tier && (
            <div className="p-4 text-center text-xs text-muted-foreground border-t border-sidebar-border">
              <p className="font-semibold capitalize">{tierInfo.tier} Plan</p>
              <p>Time Left: <span className="font-mono">{timeLeft}</span></p>
            </div>
          )}
          <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} className="text-red-500 hover:bg-red-500/10 hover:text-red-500">
                    <div className="flex items-center gap-2"><LogOut /> Logout</div>
                </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
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

    
