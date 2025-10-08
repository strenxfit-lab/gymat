
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck } from "lucide-react";
import Link from 'next/link';

export default function MemberDashboard() {
  return (
    <div className="flex min-h-screen items-start justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Member Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your fitness overview.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                <CardTitle>My Schedule</CardTitle>
                <CardDescription>View your upcoming booked classes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">You have no upcoming classes.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                <CardTitle>Book a Class</CardTitle>
                <CardDescription>Explore and book new classes.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center pt-6">
                    <CalendarCheck className="w-12 h-12 text-primary mb-4" />
                    <Link href="/dashboard/member/book-class" passHref>
                        <Button>Browse Classes</Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
