import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import {
  School,
  Users,
  BookOpen,
  Star,
  TrendingUp,
  MapPin,
} from "lucide-react";
import { type School as SchoolType } from "./schools-table-columns";

interface SchoolDetailDrawerProps {
  school: SchoolType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SchoolDetailDrawer({
  school,
  open,
  onOpenChange,
}: SchoolDetailDrawerProps) {
  if (!school) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[95vh] w-1/2 mx-auto rounded-t-2xl border-t-2 border-l-2 border-r-2 border-border/50 shadow-2xl p-0 flex flex-col"
      >
        <div className="p-4 pb-2 border-b">
          <SheetHeader className="space-y-1">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <School className="h-4 w-4" />
              {school.name}
            </SheetTitle>
            <SheetDescription className="text-sm">
              {school.state || "—"} •{" "}
              {school.sector === "government"
                ? "Government"
                : school.sector === "catholic"
                  ? "Catholic"
                  : school.sector === "independent"
                    ? "Independent"
                    : "—"}
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <Tabs defaultValue="overview" className="w-full flex flex-col h-full">
            <div className="px-4 py-2 border-b">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="teachers">Teachers</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="culture">Culture</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
            </div>

            {/* Overview Tab - Populated */}
            <TabsContent
              value="overview"
              className="flex-1 overflow-y-auto p-4 space-y-6"
            >
              {/* Quick Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Teachers
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {school.teacherCount}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      total teachers
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      State
                    </CardTitle>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {school.state || "—"}
                    </div>
                    <p className="text-xs text-muted-foreground">location</p>
                  </CardContent>
                </Card>
              </div>

              {/* School Details */}
              <Card>
                <CardHeader>
                  <CardTitle>School Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        State: {school.state || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <School className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Sector:{" "}
                        {school.sector === "government"
                          ? "Government"
                          : school.sector === "catholic"
                            ? "Catholic"
                            : school.sector === "independent"
                              ? "Independent"
                              : "—"}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">School ID</span>
                    <span className="text-sm text-muted-foreground font-mono">
                      {school.id}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Teachers</span>
                    <span className="text-sm text-muted-foreground">
                      {school.teacherCount} teachers
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Feedback */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Teacher Training Completed
                        </p>
                        <p className="text-xs text-muted-foreground">
                          "Great session! The new curriculum materials are very
                          helpful."
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          2 days ago
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Lesson Delivered Successfully
                        </p>
                        <p className="text-xs text-muted-foreground">
                          "Students were very engaged with the anti-bullying
                          content."
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          5 days ago
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Teachers Tab - Stubbed */}
            <TabsContent
              value="teachers"
              className="flex-1 overflow-y-auto p-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Teachers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      Teacher Management
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Teacher list and management features coming soon.
                    </p>
                    <div className="text-sm text-muted-foreground">
                      This will include teacher profiles, training progress, and
                      certificates.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab - Stubbed */}
            <TabsContent
              value="activity"
              className="flex-1 overflow-y-auto p-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Activity Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Activity Feed</h3>
                    <p className="text-muted-foreground mb-4">
                      Activity timeline and event tracking coming soon.
                    </p>
                    <div className="text-sm text-muted-foreground">
                      This will show recent lessons, teacher activities, and
                      school events.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Culture Tab - Stubbed */}
            <TabsContent value="culture" className="flex-1 overflow-y-auto p-4">
              <Card>
                <CardHeader>
                  <CardTitle>Culture Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      Culture Insights
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Culture rating analytics and trends coming soon.
                    </p>
                    <div className="text-sm text-muted-foreground">
                      This will include detailed culture metrics, trends, and
                      recommendations.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab - Stubbed */}
            <TabsContent
              value="settings"
              className="flex-1 overflow-y-auto p-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle>School Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <School className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      Settings & Management
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      School settings and management tools coming soon.
                    </p>
                    <div className="text-sm text-muted-foreground">
                      This will include school details, license management, and
                      user invitations.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
