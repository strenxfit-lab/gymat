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
import { Dumbbell, Users, CreditCard, ClipboardList, BarChart3, Megaphone, Boxes, Info, Mail, Phone, Building, UserCheck, LogOut, MessageSquare, CalendarCheck, CheckSquare, Clock, KeyRound, ChevronDown, IndianRupee, LifeBuoy } from 'lucide-react';
import { doc, getDoc, collection, getDocs, Timestamp, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { addMonths, addYears } from 'date-fns';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import * as React from 'react';

const SubMenu = ({ children, title, icon, isOpen, onToggle }: { children: React.ReactNode, title: string, icon: React.ReactNode, isOpen: boolean, onToggle: () => void }) => {
  const pathname = usePathname();
  const isActive = React.Children.toArray(children).some(child => {
      if (React.isValidElement(child) && child.props.href) {
        // @ts-ignore
        return pathname.startsWith(child.props.href);
      }
      return false;
  });

  return (
    <div className='w-full'>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start gap-2 text-base transition-colors duration-300 ease-in-out",
          isActive ? "bg-indigo-100 text-indigo-600 font-semibold" : "hover:bg-gray-100 dark:hover:bg-gray-800"
        )}
        onClick={onToggle}
      >
        {icon}
        <span className="flex-grow text-left">{title}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </Button>
      {isOpen && (
        <div className="ml-4 mt-2 flex flex-col gap-1 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
          {children}
        </div>
      )}
    </div>
  )
}

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

const SubMenuItem = ({ href, children }: { href: string, children: React.ReactNode }) => {
    const pathname = usePathname();
    const isActive = pathname === href;
    return (
        <Link href={href} passHref>
        <Button
            variant="ghost"
            className={cn(
            "w-full justify-start text-sm h-8",
            isActive ? "text-indigo-600 font-semibold" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50"
            )}
        >
            {children}
        </Button>
        </Link>
    )
}

export default function OwnerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
  const [hasMultiBranch, setHasMultiBranch] = useState(false);
  const [isMultiBranchSupportDialogOpen, setIsMultiBranchSupportDialogOpen] = useState(false);
  const [isContactSupportDialogOpen, setIsContactSupportDialogOpen] = useState(false);
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
            } else if (gymData.expiry_at) {
                expirationDate = (gymData.expiry_at as Timestamp).toDate();
                planTier = gymData.membershipType;
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
                 if (expirationDate < new Date()) {
                    handleLogout();
                    return;
                }
                setTierInfo({ expiresAt: expirationDate, tier: planTier });
            }

            if (gymData.multiBranch) {
                setHasMultiBranch(true);
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
        } else {
             handleLogout(); // Gym doc doesn't exist, log out
        }
      } else {
          handleLogout(); // No userDocId, log out
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
          handleLogout();
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
      e.preventDefault(); // Prevent link navigation
      if (hasMultiBranch) {
        router.push('/dashboard/owner/multi-branch');
      } else {
        setIsMultiBranchSupportDialogOpen(true);
      }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  return (
    <SidebarProvider>
      <Dialog open={isMultiBranchSupportDialogOpen} onOpenChange={setIsMultiBranchSupportDialogOpen}>
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
      <Dialog open={isContactSupportDialogOpen} onOpenChange={setIsContactSupportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Admin</DialogTitle>
            <DialogDescription>
                For any support or queries, please reach out to us via the details below.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4 py-4">
            <a href="mailto:support@strenxsoftware.in" className="flex items-center gap-3 p-3 rounded-md hover:bg-accent transition-colors">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <span>support@strenxsoftware.in</span>
            </a>
            <a href="https://wa.me/917988487892" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 p-3 rounded-md hover:bg-accent transition-colors">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <span>+91 798-848-7892</span>
            </a>
          </div>
        </DialogContent>
      </Dialog>
      <div className="flex min-h-screen">
      <Sidebar className="flex flex-col shadow-md border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out">
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Dumbbell className="w-8 h-8 text-indigo-500" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">Strenx</h1>
          </div>
          {activeBranchName && (
            <div className="mt-2 text-xs text-center p-1 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center gap-2">
              <Building className="h-4 w-4" />
              <span>{activeBranchName}</span>
            </div>
          )}
        </SidebarHeader>
        <SidebarContent className="flex-1 overflow-y-auto">
          <SidebarMenu>
            <MenuItem href="/dashboard/owner" icon={<BarChart3 />}>Dashboard</MenuItem>
            
            <SubMenu title="Management" icon={<Users />} isOpen={openSubMenu === 'management'} onToggle={() => toggleSubMenu('management')}>
                <SubMenuItem href="/dashboard/owner/add-member">Add Member</SubMenuItem>
                <SubMenuItem href="/dashboard/owner/add-trainer">Add Trainer</SubMenuItem>
                <SubMenuItem href="/dashboard/owner/members">View All</SubMenuItem>
                <SubMenuItem href="/dashboard/owner/member-status">Membership Status</SubMenuItem>
            </SubMenu>

            <MenuItem href="/dashboard/owner/attendance/dashboard" icon={<CalendarCheck />}>Attendance</MenuItem>

             <SubMenu title="Financial" icon={<CreditCard />} isOpen={openSubMenu === 'financial'} onToggle={() => toggleSubMenu('financial')}>
                <SubMenuItem href="/dashboard/owner/add-payment">Collect Fee</SubMenuItem>
                <SubMenuItem href="/dashboard/owner/transactions">All Transactions</SubMenuItem>
                <SubMenuItem href="/dashboard/owner/revenue-reports">Revenue Reports</SubMenuItem>
                <SubMenuItem href="/dashboard/owner/expenses">Expenses</SubMenuItem>
                <SubMenuItem href="/dashboard/owner/custom-report">Custom Report</SubMenuItem>
            </SubMenu>

            <SubMenu title="Settlement" icon={<IndianRupee />} isOpen={openSubMenu === 'settlement'} onToggle={() => toggleSubMenu('settlement')}>
                <SubMenuItem href="/dashboard/owner/settlement/account-details">Account Details</SubMenuItem>
                <SubMenuItem href="/dashboard/owner/settlement/settlements">View Settlements</SubMenuItem>
            </SubMenu>

             <SubMenu title="Operations" icon={<ClipboardList />} isOpen={openSubMenu === 'operations'} onToggle={() => toggleSubMenu('operations')}>
                 <SubMenuItem href="/dashboard/owner/class-scheduling">Class Scheduling</SubMenuItem>
                 <SubMenuItem href="/dashboard/owner/multi-branch" >Multi-Branch</SubMenuItem>
            </SubMenu>

             <SubMenu title="Engagement" icon={<Megaphone />} isOpen={openSubMenu === 'engagement'} onToggle={() => toggleSubMenu('engagement')}>
                <SubMenuItem href="/dashboard/owner/automated-messages">Automated Reminders</SubMenuItem>
                <SubMenuItem href="/dashboard/owner/make-offers">Make Offers</SubMenuItem>
                <SubMenuItem href="/dashboard/owner/complaints">Complaints</SubMenuItem>
            </SubMenu>

             <SubMenu title="Facility" icon={<Boxes />} isOpen={openSubMenu === 'facility'} onToggle={() => toggleSubMenu('facility')}>
                <SubMenuItem href="/dashboard/owner/equipment-maintenance">Equipment</SubMenuItem>
                <SubMenuItem href="/dashboard/owner/inventory-tracking">Inventory</SubMenuItem>
            </SubMenu>
             
             <SubMenu title="Gym Info" icon={<Info />} isOpen={openSubMenu === 'gym-info'} onToggle={() => toggleSubMenu('gym-info')}>
                <SubMenuItem href="/dashboard/owner/gym-info/basic">Basic Information</SubMenuItem>
                <SubMenuItem href="/dashboard/owner/gym-info/owner">Owner Details</SubMenuItem>
                <SubMenuItem href="/dashboard/owner/gym-info/membership-plans">Membership Plans</SubMenuItem>
                <SubMenuItem href="/dashboard/owner/gym-info/facilities">Facilities</SubMenuItem>
            </SubMenu>
            <MenuItem href="/dashboard/owner/change-password" icon={<KeyRound />}>Change Password</MenuItem>

          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 space-y-4">
           {timeLeft && tierInfo.tier && (
            <div className="p-2 text-center text-xs text-muted-foreground border rounded-lg">
              <p className="font-semibold capitalize">{tierInfo.tier} Plan</p>
              <p>Expires in: <span className="font-mono">{timeLeft}</span></p>
            </div>
          )}
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => setIsContactSupportDialogOpen(true)}>
            <LifeBuoy className="h-5 w-5 text-muted-foreground"/>
            <span>Support</span>
          </Button>
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
            <ThemeToggle />
        </header>
        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
      </div>
    </SidebarProvider>
  );
}
