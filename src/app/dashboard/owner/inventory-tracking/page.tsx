
"use client";

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlusSquare, Boxes, ClipboardList, CalendarClock, BarChart2, IndianRupee } from 'lucide-react';

const inventoryFeatures = [
    {
        title: "Add & View Items",
        description: "Add new products, supplements, or other items to your inventory list.",
        icon: <PlusSquare className="h-8 w-8 text-primary" />,
        link: "/dashboard/owner/inventory",
        disabled: false,
    },
    {
        title: "Usage Logs",
        description: "Track the consumption of items for internal use, such as cleaning supplies.",
        icon: <ClipboardList className="h-8 w-8 text-primary" />,
        link: "/dashboard/owner/usage-logs",
        disabled: false,
    },
    {
        title: "Expiry Management",
        description: "Monitor product expiry dates to reduce waste and ensure quality.",
        icon: <CalendarClock className="h-8 w-8 text-primary" />,
        link: "/dashboard/owner/inventory",
        disabled: false,
    },
    {
        title: "Reports & Analytics",
        description: "Generate reports on stock value, consumption rates, and sales.",
        icon: <BarChart2 className="h-8 w-8 text-primary" />,
        link: "#",
        disabled: true,
    },
    {
        title: "Integration with Expenses",
        description: "Automatically log inventory purchases as business expenses.",
        icon: <IndianRupee className="h-8 w-8 text-primary" />,
        link: "#",
        disabled: true,
    },
];

export default function InventoryTrackingPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Inventory Tracking</h1>
          <p className="text-muted-foreground">Manage products, supplements, and other stock items.</p>
        </div>
        <Link href="/dashboard/owner" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Dashboard</Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {inventoryFeatures.map((feature, index) => (
            <Card key={index} className="flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        {feature.icon}
                        <CardTitle>{feature.title}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow">
                    <CardDescription>{feature.description}</CardDescription>
                </CardContent>
                <CardContent>
                    <Link href={feature.link} passHref>
                        <Button className="w-full" disabled={feature.disabled}>
                            {feature.disabled ? "Coming Soon" : "Go to Feature"}
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        ))}
      </div>
    </div>
  );
}
