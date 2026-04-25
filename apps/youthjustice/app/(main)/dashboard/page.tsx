import { DashboardHeroSection } from "@/components/organisms/dashboard-hero-section";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export default function DashboardPage() {
  return (
    <div className="space-y-6 pb-6">
      <DashboardHeroSection />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active cases</CardDescription>
            <CardTitle className="text-3xl tabular-nums">3</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Matches demo case list in the sidebar.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Correspondence (7d)</CardDescription>
            <CardTitle className="text-3xl tabular-nums">12</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Placeholder — not connected to live data.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Upcoming events</CardDescription>
            <CardTitle className="text-3xl tabular-nums">5</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Pulls from calendar when implemented.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
