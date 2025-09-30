"use client";

import { use } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Progress } from "@workspace/ui/components/progress";
import { Button } from "@workspace/ui/components/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import {
  Users,
  GraduationCap,
  BookOpen,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  Calendar,
  BarChart3,
  UserCheck,
  BookOpenText,
  Activity,
} from "lucide-react";
import Link from "next/link";

// Dummy data for the dashboard
const schoolStats = {
  totalStudents: 1247,
  totalTeachers: 89,
  activeClasses: 42,
  completedLessons: 156,
  upcomingLessons: 8,
  performanceScore: 87,
  attendanceRate: 94,
  incidentReports: 3,
  antiBullyingModules: 12,
  studentWellbeingScore: 91,
};

const recentTeachers = [
  {
    id: 1,
    name: "Sarah Johnson",
    subject: "Anti-Bullying Specialist",
    avatar: "/avatars/sarah.jpg",
    status: "online",
    classes: 4,
  },
  {
    id: 2,
    name: "Michael Chen",
    subject: "Student Wellbeing Coordinator",
    avatar: "/avatars/michael.jpg",
    status: "away",
    classes: 3,
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    subject: "Social Skills Facilitator",
    avatar: "/avatars/emily.jpg",
    status: "online",
    classes: 5,
  },
  {
    id: 4,
    name: "David Thompson",
    subject: "Conflict Resolution Expert",
    avatar: "/avatars/david.jpg",
    status: "offline",
    classes: 2,
  },
];

const activeClasses = [
  {
    id: 1,
    name: "Grade 7A - Stage 2",
    teacher: "Sarah Johnson",
    students: 28,
    progress: 75,
    nextLesson: "Understanding Different Types of Bullying",
  },
  {
    id: 2,
    name: "Grade 8B - Stage 3",
    teacher: "Michael Chen",
    students: 24,
    progress: 60,
    nextLesson: "Building Empathy and Compassion",
  },
  {
    id: 3,
    name: "Grade 9C - Stage 4",
    teacher: "Emily Rodriguez",
    students: 26,
    progress: 90,
    nextLesson: "Digital Citizenship and Cyberbullying",
  },
  {
    id: 4,
    name: "Grade 6D - Stage 1",
    teacher: "David Thompson",
    students: 22,
    progress: 45,
    nextLesson: "Recognizing Bullying Behaviors",
  },
];

const upcomingLessons = [
  {
    id: 1,
    title: "Understanding Different Types of Bullying",
    class: "Grade 7A - Stage 2",
    time: "10:00 AM",
    teacher: "Sarah Johnson",
    type: "Interactive Workshop",
  },
  {
    id: 2,
    title: "Building Empathy and Compassion",
    class: "Grade 8B - Stage 3",
    time: "11:30 AM",
    teacher: "Michael Chen",
    type: "Group Discussion",
  },
  {
    id: 3,
    title: "Digital Citizenship and Cyberbullying",
    class: "Grade 9C - Stage 4",
    time: "2:00 PM",
    teacher: "Emily Rodriguez",
    type: "Role Play Activity",
  },
  {
    id: 4,
    title: "Recognizing Bullying Behaviors",
    class: "Grade 6D - Stage 1",
    time: "3:30 PM",
    teacher: "David Thompson",
    type: "Interactive Presentation",
  },
];

const performanceMetrics = [
  { label: "Anti-Bullying Awareness", value: 92, color: "text-green-600" },
  { label: "Student Engagement", value: 87, color: "text-blue-600" },
  { label: "Lesson Completion", value: 94, color: "text-purple-600" },
  { label: "Behavioral Improvement", value: 89, color: "text-orange-600" },
];

export default function HomePage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const { school_id } = use(params);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-end">
        {/* <div>
          <h1 className="text-3xl font-bold tracking-tight">
            School Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening at your school today.
          </p>
        </div> */}
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-green-600 border-green-600">
            <Activity className="w-3 h-3 mr-1" />
            All Systems Operational
          </Badge>
        </div>
      </div>

      {/* Key Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Students
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schoolStats.totalStudents.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Anti-Bullying Staff
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schoolStats.totalTeachers}
            </div>
            <p className="text-xs text-muted-foreground">
              {schoolStats.totalTeachers - 5} online now
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Modules
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schoolStats.activeClasses}
            </div>
            <p className="text-xs text-muted-foreground">
              {schoolStats.upcomingLessons} sessions today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Wellbeing Score
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schoolStats.studentWellbeingScore}%
            </div>
            <p className="text-xs text-muted-foreground">
              +5% from last quarter
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Performance Metrics */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Performance Overview
            </CardTitle>
            <CardDescription>
              Key performance indicators for this month
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {performanceMetrics.map((metric, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{metric.label}</span>
                  <span className={`text-sm font-bold ${metric.color}`}>
                    {metric.value}%
                  </span>
                </div>
                <Progress value={metric.value} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common anti-bullying tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-start">
              <Link href={`/schools/${school_id}/lessons/new`}>
                <BookOpenText className="w-4 h-4 mr-2" />
                Create New Session
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href={`/schools/${school_id}/teachers`}>
                <UserCheck className="w-4 h-4 mr-2" />
                Manage Staff
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href={`/schools/${school_id}/reports`}>
                <BarChart3 className="w-4 h-4 mr-2" />
                View Reports
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href={`/schools/${school_id}/performance`}>
                <TrendingUp className="w-4 h-4 mr-2" />
                Wellbeing Analytics
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Teachers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Anti-Bullying Staff
            </CardTitle>
            <CardDescription>Recently active wellbeing staff</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentTeachers.map((teacher) => (
              <div key={teacher.id} className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={teacher.avatar} alt={teacher.name} />
                  <AvatarFallback>
                    {teacher.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {teacher.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {teacher.subject}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">
                    {teacher.classes} classes
                  </Badge>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      teacher.status === "online"
                        ? "bg-green-500"
                        : teacher.status === "away"
                          ? "bg-yellow-500"
                          : "bg-gray-400"
                    }`}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Active Classes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="w-5 h-5 mr-2" />
              Active Anti-Bullying Modules
            </CardTitle>
            <CardDescription>
              Current module progress and upcoming sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeClasses.map((classItem) => (
                <div
                  key={classItem.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <h4 className="font-medium">{classItem.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {classItem.teacher} • {classItem.students} students
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Next: {classItem.nextLesson}
                    </p>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="text-sm font-medium">
                      {classItem.progress}%
                    </div>
                    <Progress value={classItem.progress} className="w-20 h-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Lessons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Today's Sessions
            </CardTitle>
            <CardDescription>
              Upcoming anti-bullying sessions for today
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="flex items-start space-x-3 p-3 border rounded-lg"
              >
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="text-sm font-medium">{lesson.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {lesson.class} • {lesson.time}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lesson.teacher} • {lesson.type}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* School Status */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              School Status & Alerts
            </CardTitle>
            <CardDescription>
              Current status and important notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center space-x-3 p-4 border rounded-lg">
                <div className="flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h4 className="font-medium">Attendance Rate</h4>
                  <p className="text-sm text-muted-foreground">
                    {schoolStats.attendanceRate}% today
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 border rounded-lg">
                <div className="flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <h4 className="font-medium">Incident Reports</h4>
                  <p className="text-sm text-muted-foreground">
                    {schoolStats.incidentReports} this week
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 border rounded-lg">
                <div className="flex-shrink-0">
                  <Star className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-medium">Completed Lessons</h4>
                  <p className="text-sm text-muted-foreground">
                    {schoolStats.completedLessons} this month
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
