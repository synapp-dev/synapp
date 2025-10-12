import { schoolServerApi } from "@/entities/school/api/server-endpoints";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Progress } from "@workspace/ui/components/progress";
import { Users, GraduationCap, TrendingUp, AlertTriangle } from "lucide-react";

export default async function HomePage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const { school_id } = await params;
  const { data: school } = await schoolServerApi.get.schoolBySlug(school_id);

  // Mock data for dashboard
  const stats = {
    totalStudents: 1247,
    totalTeachers: 89,
    activeClasses: 42,
    incidentsThisMonth: 3,
    engagementRate: 87,
    completionRate: 92,
  };

  const recentActivity = [
    {
      id: 1,
      type: "lesson_completed",
      message: "Grade 5A completed 'Understanding Bullying' lesson",
      time: "2 hours ago",
      class: "Grade 5A",
    },
    {
      id: 2,
      type: "incident_reported",
      message: "New incident report submitted by Ms. Johnson",
      time: "4 hours ago",
      class: "Grade 3B",
    },
    {
      id: 3,
      type: "teacher_joined",
      message: "Ms. Davis joined the school team",
      time: "1 day ago",
      class: "New Teacher",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">Welcome to {school?.name}</h1>
        <p className="text-muted-foreground">
          Here's what's happening at your school today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Teachers</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeachers}</div>
            <p className="text-xs text-muted-foreground">
              +3 new this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Classes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeClasses}</div>
            <p className="text-xs text-muted-foreground">
              Across all grades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incidents This Month</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.incidentsThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              -50% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Engagement Rate</CardTitle>
            <CardDescription>
              Student participation in anti-bullying activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current Rate</span>
                <span>{stats.engagementRate}%</span>
              </div>
              <Progress value={stats.engagementRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Target: 90%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lesson Completion</CardTitle>
            <CardDescription>
              Students who completed this month's lessons
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completion Rate</span>
                <span>{stats.completionRate}%</span>
              </div>
              <Progress value={stats.completionRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Excellent progress!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest updates from your school
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{activity.message}</p>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">{activity.class}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {activity.time}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Report Incident</div>
                <div className="text-xs text-muted-foreground">
                  Submit a new report
                </div>
              </div>
            </Button>
            <Button variant="outline" className="h-auto p-4">
              <div className="text-left">
                <div className="font-medium">View Reports</div>
                <div className="text-xs text-muted-foreground">
                  Check analytics
                </div>
              </div>
            </Button>
            <Button variant="outline" className="h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Manage Classes</div>
                <div className="text-xs text-muted-foreground">
                  Add or edit classes
                </div>
              </div>
            </Button>
            <Button variant="outline" className="h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Invite Teachers</div>
                <div className="text-xs text-muted-foreground">
                  Send invitations
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
