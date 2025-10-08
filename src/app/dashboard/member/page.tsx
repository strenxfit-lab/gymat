import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MemberDashboard() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Member Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Welcome, Member!</p>
        </CardContent>
      </Card>
    </div>
  );
}
