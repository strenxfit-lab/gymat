import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OwnerDashboard() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Owner Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Welcome, Gym Owner!</p>
        </CardContent>
      </Card>
    </div>
  );
}
