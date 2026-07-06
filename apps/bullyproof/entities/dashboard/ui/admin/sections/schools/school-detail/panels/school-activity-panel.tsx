"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Activity, TrendingUp } from "lucide-react";

export function SchoolActivityPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Activity</h3>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="sr-only">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Activity Feed</h3>
            <p className="text-muted-foreground mb-4">
              Activity timeline and event tracking coming soon.
            </p>
            <div className="text-sm text-muted-foreground">
              This will show recent lessons, teacher activities, and school
              events.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
