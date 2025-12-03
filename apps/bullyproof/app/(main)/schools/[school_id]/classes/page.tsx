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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Users, GraduationCap, BookOpen, Plus } from "lucide-react";
import { generateMetadataFromSegments } from "@/utils/metadata";

export const metadata = generateMetadataFromSegments(["schools", "classes"]);

export default async function ClassesPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const { school_id } = await params;
  const { data: school } = await schoolServerApi.get.schoolBySlug(school_id);

  // Mock data for classes
  const classes = [
    {
      id: 1,
      name: "Grade 5A",
      teacher: "Ms. Sarah Johnson",
      teacherEmail: "sarah.johnson@school.edu",
      studentCount: 28,
      grade: "5",
      subject: "Anti-Bullying Education",
      completionRate: 94,
      lastActivity: "2 hours ago",
      status: "active",
    },
    {
      id: 2,
      name: "Grade 3B",
      teacher: "Mr. Michael Chen",
      teacherEmail: "michael.chen@school.edu",
      studentCount: 24,
      grade: "3",
      subject: "Social Skills",
      completionRate: 87,
      lastActivity: "1 day ago",
      status: "active",
    },
    {
      id: 3,
      name: "Grade 7C",
      teacher: "Ms. Emily Davis",
      teacherEmail: "emily.davis@school.edu",
      studentCount: 31,
      grade: "7",
      subject: "Conflict Resolution",
      completionRate: 91,
      lastActivity: "3 hours ago",
      status: "active",
    },
    {
      id: 4,
      name: "Grade 2A",
      teacher: "Ms. Lisa Wilson",
      teacherEmail: "lisa.wilson@school.edu",
      studentCount: 22,
      grade: "2",
      subject: "Kindness & Empathy",
      completionRate: 78,
      lastActivity: "5 days ago",
      status: "needs_attention",
    },
    {
      id: 5,
      name: "Grade 6B",
      teacher: "Mr. David Brown",
      teacherEmail: "david.brown@school.edu",
      studentCount: 29,
      grade: "6",
      subject: "Digital Citizenship",
      completionRate: 96,
      lastActivity: "1 hour ago",
      status: "active",
    },
  ];

  const totalStudents = classes.reduce((sum, cls) => sum + cls.studentCount, 0);
  const averageCompletion = Math.round(
    classes.reduce((sum, cls) => sum + cls.completionRate, 0) / classes.length
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Classes at {school?.name}</h1>
          <p className="text-muted-foreground">
            Manage and monitor your school's classes
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Class
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classes.length}</div>
            <p className="text-xs text-muted-foreground">Active classes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Students
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">Across all classes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Completion
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageCompletion}%</div>
            <p className="text-xs text-muted-foreground">
              Lesson completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Classes Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {classes.map((classItem) => (
          <Card
            key={classItem.id}
            className="hover:shadow-md transition-shadow"
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{classItem.name}</CardTitle>
                <Badge
                  variant={
                    classItem.status === "active" ? "default" : "destructive"
                  }
                >
                  {classItem.status === "active" ? "Active" : "Needs Attention"}
                </Badge>
              </div>
              <CardDescription>
                Grade {classItem.grade} • {classItem.subject}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Teacher Info */}
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`/api/placeholder/32/32`} />
                  <AvatarFallback>
                    {classItem.teacher
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{classItem.teacher}</p>
                  <p className="text-xs text-muted-foreground">
                    {classItem.teacherEmail}
                  </p>
                </div>
              </div>

              {/* Class Stats */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Students</p>
                  <p className="font-medium">{classItem.studentCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Completion</p>
                  <p className="font-medium">{classItem.completionRate}%</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Lesson Progress</span>
                  <span>{classItem.completionRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${classItem.completionRate}%` }}
                  />
                </div>
              </div>

              {/* Last Activity */}
              <p className="text-xs text-muted-foreground">
                Last activity: {classItem.lastActivity}
              </p>

              {/* Actions */}
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="flex-1">
                  View Details
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State (if no classes) */}
      {classes.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No classes yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Get started by creating your first class
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create First Class
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
