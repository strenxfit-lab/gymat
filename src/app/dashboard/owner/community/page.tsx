"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function CommunityPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Community</h1>
          <p className="text-muted-foreground">
            Engage with your gym members and trainers.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            Community Hub
          </CardTitle>
          <CardDescription>
            This is your space to build and manage your gym's community. Future features will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="mt-4 text-lg font-semibold">Coming Soon</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Exciting community features are under development!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
