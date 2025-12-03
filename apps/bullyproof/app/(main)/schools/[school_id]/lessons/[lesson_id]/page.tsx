import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Clock, Users, FileText, BookOpen, Calendar, Edit } from "lucide-react";
import { Separator } from "@workspace/ui/components/separator";
import { generateMetadataFromSegment } from "@/utils/metadata";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ school_id: string; lesson_id: string }>;
}): Promise<Metadata> {
  const { lesson_id } = await params;
  return generateMetadataFromSegment(lesson_id);
}

export default async function LessonOverviewPage({
  params,
}: {
  params: Promise<{ school_id: string; lesson_id: string }>;
}) {
  const { school_id, lesson_id } = await params;

  // Dummy data
  const lessonData = {
    title: "Understanding Bullying Behaviors",
    summary:
      "This lesson introduces students to the concept of bullying, helping them identify different types of bullying behavior and understand their impact on individuals and communities.",
    objectives: [
      "Identify the three main types of bullying behavior",
      "Understand the impact of bullying on victims",
      "Recognize the role of bystanders in bullying situations",
      "Learn strategies to prevent and respond to bullying",
    ],
    timeEstimate: "45 minutes",
    requiredMaterials: [
      "Projector and screen",
      "Printed handouts for each student",
      "Whiteboard markers",
      "Pens and notebooks",
    ],
    linkedSlides: [
      "Introduction to Bullying Types",
      "Impact of Bullying Activity",
      "Bystander Intervention Strategies",
    ],
    teachers: [
      { name: "Sarah Johnson", initials: "SJ" },
      { name: "Michael Chen", initials: "MC" },
    ],
    classRoster: [
      { name: "Emma Watson", initials: "EW" },
      { name: "Jacob Martinez", initials: "JM" },
      { name: "Olivia Brown", initials: "OB" },
      { name: "Noah Taylor", initials: "NT" },
      { name: "Isabella Anderson", initials: "IA" },
      { name: "Liam Garcia", initials: "LG" },
      { name: "Sophia Rodriguez", initials: "SR" },
      { name: "Mason Lee", initials: "ML" },
    ],
    lastEdited: "2 hours ago by Sarah Johnson",
    lastEditedNotes:
      "Updated objectives section to include bystander intervention strategies. Adjusted time estimate to 45 minutes based on class discussion needs.",
    recentActivity: [
      {
        action: "Lesson scheduled",
        user: "Sarah Johnson",
        time: "2 hours ago",
      },
      {
        action: "Objectives updated",
        user: "Sarah Johnson",
        time: "3 hours ago",
      },
      { action: "Materials added", user: "Michael Chen", time: "1 day ago" },
      {
        action: "Class roster updated",
        user: "Sarah Johnson",
        time: "2 days ago",
      },
    ],
    nextAction: {
      title: "Review Lesson Materials",
      description:
        "Before delivery, please review all materials and ensure the projector is functioning properly.",
      dueBy: "Tomorrow at 9:00 AM",
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">{lessonData.title}</h1>
        <p className="text-muted-foreground">
          Lesson ID: {lesson_id} • School ID: {school_id}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {lessonData.summary}
              </p>
            </CardContent>
          </Card>

          {/* Objectives */}
          <Card>
            <CardHeader>
              <CardTitle>Learning Objectives</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-sm">
                {lessonData.objectives.map((objective, index) => (
                  <li key={index} className="text-muted-foreground">
                    {objective}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Required Materials */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Required Materials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-sm">
                {lessonData.requiredMaterials.map((material, index) => (
                  <li key={index} className="text-muted-foreground">
                    {material}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Linked Slides */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Linked Slides
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lessonData.linkedSlides.map((slide, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                  >
                    <span className="text-sm font-medium">{slide}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Class Roster Snapshot */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Class Roster Snapshot
              </CardTitle>
              <CardDescription>
                {lessonData.classRoster.length} students enrolled
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {lessonData.classRoster.map((student, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 border rounded-lg"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {student.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{student.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Time Estimate */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Time Estimate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{lessonData.timeEstimate}</p>
            </CardContent>
          </Card>

          {/* Teachers */}
          <Card>
            <CardHeader>
              <CardTitle>Teacher(s)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lessonData.teachers.map((teacher, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Avatar>
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {teacher.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{teacher.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Last Edited */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Last Edited
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                {lessonData.lastEdited}
              </p>
              <Separator className="my-3" />
              <div>
                <p className="text-xs font-medium mb-1">Notes:</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {lessonData.lastEditedNotes}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lessonData.recentActivity.map((activity, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-start justify-between">
                      <p className="text-sm">{activity.action}</p>
                      <span className="text-xs text-muted-foreground">
                        {activity.time}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      by {activity.user}
                    </p>
                    {index < lessonData.recentActivity.length - 1 && (
                      <Separator className="mt-3" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Next Action Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle>Next Action</CardTitle>
              <CardDescription>{lessonData.nextAction.dueBy}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">
                  {lessonData.nextAction.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {lessonData.nextAction.description}
                </p>
                <Badge variant="outline" className="w-fit">
                  Action Required
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
