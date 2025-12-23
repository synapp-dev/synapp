"use client";

import { SnapshotCardWithData } from "@/entities/dashboard/ui/admin/cards/snapshot-card-with-data";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import Link from "next/link";
import {
  Book,
  FileText,
  GraduationCap,
  Users,
  Calendar,
  Plus,
} from "lucide-react";
import { Separator } from "@workspace/ui/components/separator";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useMeStore } from "@/entities/me/model/store";
import { useSchoolStore } from "@/stores/school-store";
import { useMySchoolsQuery } from "@/entities/me/model/useMySchoolsQuery";

function QuickActionsCard({
  title,
  icon,
  link,
  disabled,
}: {
  title: string;
  icon: React.ReactNode;
  link: string;
  disabled?: boolean;
}) {
  const words = title.split(" ");
  const firstWord = words[0] || "";
  const secondWord = words.slice(1).join(" ");

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow cursor-pointer p-0 flex-1 flex",
        disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
      )}
    >
      <Link
        href={disabled ? "#" : link}
        className="w-full h-full flex items-center gap-1 p-2"
      >
        <div className="p-1 rounded flex-shrink-0">{icon}</div>
        <span className="text-sm">
          <span className="font-light">{firstWord}</span>
          {secondWord && (
            <>
              {" "}
              <span className="font-medium">{secondWord}</span>
            </>
          )}
        </span>
      </Link>
    </Card>
  );
}

export function TeacherOverviewSection() {
  const currentUser = useMeStore((s) => s.currentUser);
  const activeSchool = useSchoolStore((s) => s.getActiveSchool());
  const { data: mySchools = [] } = useMySchoolsQuery(
    { limit: 1 },
    { enabled: !activeSchool }
  );

  // Get the school ID - prefer active school from store, otherwise first school from user's roles
  const schoolRoles = currentUser?.schoolRoles;
  const schoolRolesArray = Array.isArray(schoolRoles) ? schoolRoles : [];
  const firstSchoolRole =
    schoolRolesArray.length > 0 &&
    typeof schoolRolesArray[0] === "object" &&
    schoolRolesArray[0] !== null &&
    "schoolId" in schoolRolesArray[0]
      ? (schoolRolesArray[0].schoolId as string)
      : null;

  const schoolId = activeSchool?.id || firstSchoolRole || mySchools[0]?.id;

  // Build the lessons link with dialog parameter
  const startNewLessonLink = schoolId
    ? `/schools/${schoolId}/lessons?dialog=add-new-lesson`
    : "/schools";

  return (
    <div className="space-y-6 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      <div className="col-span-1 flex gap-4 h-full items-center">
        <div className="h-fit flex flex-col items-center justify-center w-full max-w-[30%]">
          <div className="flex-1 flex flex-col gap-2 w-full justify-center ">
            <QuickActionsCard
              title="View Lessons"
              icon={<Book className="w-4 h-4" />}
              link="/schools"
            />
            <QuickActionsCard
              title="My Classes"
              icon={<Users className="w-4 h-4" />}
              link="/schools"
            />
            <QuickActionsCard
              title="View Content"
              icon={<GraduationCap className="w-4 h-4" />}
              link="/schools"
            />
            <QuickActionsCard
              title="My Performance"
              icon={<FileText className="w-4 h-4" />}
              link="/schools"
            />
            <QuickActionsCard
              disabled
              title="View Reports"
              icon={<FileText className="w-4 h-4" />}
              link="/schools/reports"
            />
          </div>
        </div>
        <div className="h-full flex items-center justify-center py-12">
          <Separator orientation="vertical" className="h-full w-fit mx-4" />
        </div>

        {/* Start New Lesson Button Card */}
        <Card className="flex-1 w-full h-full flex flex-col justify-center items-center p-8">
          <Link href={startNewLessonLink} className="w-full h-full">
            <Button
              size="lg"
              className="w-full h-full min-h-[200px] flex flex-col gap-4 text-lg"
            >
              <Plus className="h-8 w-8" />
              <span className="font-semibold">Start New Lesson</span>
            </Button>
          </Link>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        {/* Completed Lessons Card */}
        <StaggeredAnimation index={0}>
          <SnapshotCardWithData
            metricKey="lessons/completed"
            title="Completed Lessons"
            icon="BookOpen"
            subtitle="Lessons completed this term"
            scope="school"
          />
        </StaggeredAnimation>

        {/* Engagement Rate Card */}
        <StaggeredAnimation index={1}>
          <SnapshotCardWithData
            metricKey="lessons/engagement-rate"
            title="Engagement Rate"
            icon="Activity"
            subtitle="Activity in last 30 days"
            scope="school"
          />
        </StaggeredAnimation>

        {/* My Classes Card - placeholder for now */}
        <StaggeredAnimation index={2}>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                My Classes
              </CardTitle>
              <CardDescription>Classes you're teaching</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
            </CardContent>
          </Card>
        </StaggeredAnimation>

        {/* Upcoming Lessons Card - placeholder for now */}
        <StaggeredAnimation index={3}>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Upcoming Lessons
              </CardTitle>
              <CardDescription>Lessons scheduled this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
            </CardContent>
          </Card>
        </StaggeredAnimation>
      </div>
    </div>
  );
}
