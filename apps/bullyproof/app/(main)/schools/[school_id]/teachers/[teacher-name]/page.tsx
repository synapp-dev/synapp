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
import { Progress } from "@workspace/ui/components/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Users,
  BookOpen,
  Award,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { generateMetadataFromSegment } from "@/utils/metadata";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ school_id: string; "teacher-name": string }>;
}): Promise<Metadata> {
  const { "teacher-name": teacherName } = await params;
  return generateMetadataFromSegment(teacherName);
}

export default async function TeacherPage({
  params,
}: {
  params: Promise<{ school_id: string; "teacher-name": string }>;
}) {
  const { school_id, "teacher-name": teacherSlug } = await params;
  const { data: school } = await schoolServerApi.get.schoolBySlug(school_id);

  // Convert slug back to name for lookup (this would normally be a database lookup)
  const teacherName = teacherSlug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  // Comprehensive mock data for teacher profile
  const teacher = {
    id: 1,
    name: teacherName,
    email: "sarah.johnson@school.edu",
    phone: "+1 (555) 123-4567",
    avatar: "/api/placeholder/80/80",
    role: "Lead Teacher",
    department: "Elementary",
    joinDate: "2022-08-15",
    lastLogin: "2 hours ago",
    status: "active",
    completionRate: 94,
    students: 56,
    classes: ["Grade 5A", "Grade 5B"],

    // Performance metrics
    performance: {
      overallCompletion: 94,
      studentEngagement: 87,
      incidentHandling: 92,
      schoolAverage: 89,
      lessonsCompleted: 24,
      trainingCompleted: 8,
      totalTraining: 10,
    },

    // Recent lessons taught
    lessons: [
      {
        id: 1,
        name: "Understanding Bullying",
        class: "Grade 5A",
        date: "2024-01-15",
        completionRate: 96,
        studentFeedback: 4.8,
        duration: "45 minutes",
      },
      {
        id: 2,
        name: "Building Empathy",
        class: "Grade 5B",
        date: "2024-01-12",
        completionRate: 89,
        studentFeedback: 4.6,
        duration: "40 minutes",
      },
      {
        id: 3,
        name: "Digital Citizenship",
        class: "Grade 5A",
        date: "2024-01-10",
        completionRate: 92,
        studentFeedback: 4.7,
        duration: "50 minutes",
      },
      {
        id: 4,
        name: "Conflict Resolution",
        class: "Grade 5B",
        date: "2024-01-08",
        completionRate: 88,
        studentFeedback: 4.5,
        duration: "42 minutes",
      },
      {
        id: 5,
        name: "Kindness & Respect",
        class: "Grade 5A",
        date: "2024-01-05",
        completionRate: 95,
        studentFeedback: 4.9,
        duration: "38 minutes",
      },
    ],

    // Training completed
    training: [
      {
        id: 1,
        name: "Anti-Bullying Fundamentals",
        completionDate: "2024-01-10",
        score: 95,
        certificate: true,
        status: "completed",
      },
      {
        id: 2,
        name: "Trauma-Informed Teaching",
        completionDate: "2024-01-05",
        score: 88,
        certificate: true,
        status: "completed",
      },
      {
        id: 3,
        name: "Digital Safety Education",
        completionDate: "2023-12-20",
        score: 92,
        certificate: true,
        status: "completed",
      },
      {
        id: 4,
        name: "Student Mental Health Awareness",
        completionDate: "2023-12-15",
        score: 90,
        certificate: true,
        status: "completed",
      },
      {
        id: 5,
        name: "Advanced Conflict Resolution",
        completionDate: "2023-12-10",
        score: 87,
        certificate: true,
        status: "completed",
      },
      {
        id: 6,
        name: "Crisis Intervention Strategies",
        completionDate: "2023-12-05",
        score: 93,
        certificate: true,
        status: "completed",
      },
      {
        id: 7,
        name: "Cultural Sensitivity Training",
        completionDate: "2023-11-28",
        score: 89,
        certificate: true,
        status: "completed",
      },
      {
        id: 8,
        name: "Parent Communication Best Practices",
        completionDate: "2023-11-20",
        score: 91,
        certificate: true,
        status: "completed",
      },
      {
        id: 9,
        name: "Data Privacy & Student Records",
        completionDate: "2023-11-15",
        score: 0,
        certificate: false,
        status: "in_progress",
      },
      {
        id: 10,
        name: "Advanced Assessment Techniques",
        completionDate: null,
        score: 0,
        certificate: false,
        status: "pending",
      },
    ],

    // Recent activity
    activity: [
      {
        id: 1,
        type: "lesson_completed",
        message: "Completed 'Understanding Bullying' lesson with Grade 5A",
        time: "2 hours ago",
        icon: BookOpen,
        color: "text-green-600",
      },
      {
        id: 2,
        type: "training_completed",
        message: "Completed 'Anti-Bullying Fundamentals' training",
        time: "1 day ago",
        icon: Award,
        color: "text-blue-600",
      },
      {
        id: 3,
        type: "incident_reported",
        message: "Submitted incident report for playground incident",
        time: "2 days ago",
        icon: AlertCircle,
        color: "text-orange-600",
      },
      {
        id: 4,
        type: "class_updated",
        message: "Updated Grade 5B class roster",
        time: "3 days ago",
        icon: Users,
        color: "text-purple-600",
      },
      {
        id: 5,
        type: "lesson_completed",
        message: "Completed 'Building Empathy' lesson with Grade 5B",
        time: "4 days ago",
        icon: BookOpen,
        color: "text-green-600",
      },
      {
        id: 6,
        type: "training_completed",
        message: "Completed 'Trauma-Informed Teaching' training",
        time: "5 days ago",
        icon: Award,
        color: "text-blue-600",
      },
      {
        id: 7,
        type: "parent_meeting",
        message: "Conducted parent meeting for student support",
        time: "1 week ago",
        icon: Users,
        color: "text-indigo-600",
      },
      {
        id: 8,
        type: "lesson_completed",
        message: "Completed 'Digital Citizenship' lesson with Grade 5A",
        time: "1 week ago",
        icon: BookOpen,
        color: "text-green-600",
      },
    ],

    // Assigned classes
    assignedClasses: [
      {
        id: 1,
        name: "Grade 5A",
        studentCount: 28,
        completionRate: 96,
        lastActivity: "2 hours ago",
        status: "active",
      },
      {
        id: 2,
        name: "Grade 5B",
        studentCount: 28,
        completionRate: 89,
        lastActivity: "4 days ago",
        status: "active",
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center space-x-4">
        <Link
          href={`/schools/${school_id}/teachers`}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Teachers
        </Link>
        <div className="text-sm text-muted-foreground">/</div>
        <div className="text-sm font-medium">{teacher.name}</div>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={teacher.avatar} />
              <AvatarFallback className="text-lg">
                {teacher.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-2">
                <h1 className="text-3xl font-bold">{teacher.name}</h1>
                <Badge
                  variant={
                    teacher.status === "active" ? "default" : "secondary"
                  }
                  className="text-sm"
                >
                  {teacher.status === "active" ? "Active" : "On Leave"}
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground mb-4">
                {teacher.role} • {teacher.department}
              </p>
              <div className="flex items-center space-x-6 mb-4">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{teacher.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{teacher.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Joined {new Date(teacher.joinDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex space-x-4">
                <Button variant="outline" size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button variant="outline" size="sm">
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completion Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teacher.performance.overallCompletion}%
            </div>
            <p className="text-xs text-muted-foreground">
              vs {teacher.performance.schoolAverage}% school avg
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teacher.students}</div>
            <p className="text-xs text-muted-foreground">
              Across {teacher.classes.length} classes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Lessons Taught
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teacher.performance.lessonsCompleted}
            </div>
            <p className="text-xs text-muted-foreground">This semester</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Training</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teacher.performance.trainingCompleted}/
              {teacher.performance.totalTraining}
            </div>
            <p className="text-xs text-muted-foreground">Modules completed</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lessons Taught */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Lessons</CardTitle>
            <CardDescription>
              Latest lessons delivered by this teacher
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teacher.lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <h4 className="font-medium">{lesson.name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>{lesson.class}</span>
                      <span>•</span>
                      <span>{new Date(lesson.date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{lesson.duration}</span>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-sm font-medium">
                      {lesson.completionRate}%
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span className="text-xs text-muted-foreground">
                        {lesson.studentFeedback}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Training Completed */}
        <Card>
          <CardHeader>
            <CardTitle>Training Progress</CardTitle>
            <CardDescription>
              Professional development and certifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>
                    {Math.round(
                      (teacher.performance.trainingCompleted /
                        teacher.performance.totalTraining) *
                        100
                    )}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    (teacher.performance.trainingCompleted /
                      teacher.performance.totalTraining) *
                    100
                  }
                  className="h-2"
                />
              </div>

              <div className="space-y-3">
                {teacher.training.slice(0, 5).map((training) => (
                  <div
                    key={training.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <h4 className="font-medium text-sm">{training.name}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            training.status === "completed"
                              ? "default"
                              : training.status === "in_progress"
                                ? "secondary"
                                : "outline"
                          }
                          className="text-xs"
                        >
                          {training.status === "completed"
                            ? "Completed"
                            : training.status === "in_progress"
                              ? "In Progress"
                              : "Pending"}
                        </Badge>
                        {training.certificate && (
                          <Badge variant="outline" className="text-xs">
                            <Award className="h-3 w-3 mr-1" />
                            Certified
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {training.status === "completed" && (
                        <div className="text-sm font-medium">
                          {training.score}%
                        </div>
                      )}
                      {training.completionDate && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(
                            training.completionDate
                          ).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Performance Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>
              Key performance indicators and comparisons
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Student Engagement</span>
                  <span>{teacher.performance.studentEngagement}%</span>
                </div>
                <Progress
                  value={teacher.performance.studentEngagement}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Incident Handling</span>
                  <span>{teacher.performance.incidentHandling}%</span>
                </div>
                <Progress
                  value={teacher.performance.incidentHandling}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Completion</span>
                  <span>{teacher.performance.overallCompletion}%</span>
                </div>
                <Progress
                  value={teacher.performance.overallCompletion}
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  School average: {teacher.performance.schoolAverage}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Classes */}
        <Card>
          <CardHeader>
            <CardTitle>Assigned Classes</CardTitle>
            <CardDescription>
              Classes currently managed by this teacher
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teacher.assignedClasses.map((classItem) => (
                <div
                  key={classItem.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <h4 className="font-medium">{classItem.name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>{classItem.studentCount} students</span>
                      <span>•</span>
                      <span>Last activity: {classItem.lastActivity}</span>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-sm font-medium">
                      {classItem.completionRate}%
                    </div>
                    <Badge
                      variant={
                        classItem.status === "active" ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {classItem.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest actions and updates from this teacher
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teacher.activity.map((activity) => {
              const IconComponent = activity.icon;
              return (
                <div key={activity.id} className="flex items-start space-x-4">
                  <div
                    className={`p-2 rounded-full bg-gray-100 ${activity.color}`}
                  >
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{activity.message}</p>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {activity.time}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
