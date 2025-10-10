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
  Calendar,
  Mail,
  Phone,
  ExternalLink,
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
              {school.state} •{" "}
              {school.sector === "government"
                ? "Government"
                : school.sector === "catholic"
                  ? "Catholic"
                  : "Independent"}
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
                      Teachers Trained
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {school.activeTeachers}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      of {school.totalTeachers} total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Lessons Delivered
                    </CardTitle>
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {school.lessonsDelivered}
                    </div>
                    <p className="text-xs text-muted-foreground">this term</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Culture Rating
                    </CardTitle>
                    <Star className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {school.cultureRating.toFixed(1)}
                    </div>
                    <p className="text-xs text-muted-foreground">out of 5.0</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Engagement
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {school.engagementPercentage}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      teachers active
                    </p>
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
                        {school.address || "Address not provided"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Joined{" "}
                        {new Date(school.joinedDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status</span>
                    <Badge
                      variant={
                        school.status === "active"
                          ? "default"
                          : school.status === "pending"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {school.status.charAt(0).toUpperCase() +
                        school.status.slice(1)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Last Active</span>
                    <span className="text-sm text-muted-foreground">
                      {school.lastActiveDays === 0
                        ? "Today"
                        : school.lastActiveDays === 1
                          ? "1 day ago"
                          : `${school.lastActiveDays} days ago`}
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
