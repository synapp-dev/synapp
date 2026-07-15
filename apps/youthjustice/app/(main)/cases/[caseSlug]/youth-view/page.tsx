import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  CalendarDays,
  Eye,
  MessageSquare,
  Phone,
  Shield,
  Target,
} from "lucide-react";

import { getDummyCaseBySlug } from "@/lib/dummy-cases";
import { getDummyCaseProfile } from "@/lib/dummy-case-profile";
import { getDummyYouthGoals } from "@/lib/dummy-case-extras";
import { CaseAttendanceStreakCard } from "@/components/organisms/case-attendance-streak-card";
import {
  Avatar,
  AvatarFallback,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";

type Props = {
  params: Promise<{ caseSlug: string }>;
};

export default async function YouthViewPage({ params }: Props) {
  const { caseSlug } = await params;
  const c = getDummyCaseBySlug(caseSlug);
  const profile = getDummyCaseProfile(caseSlug);
  if (!c || !profile) {
    notFound();
  }
  const firstName = c.displayName.split(" ")[0]!;
  const goals = getDummyYouthGoals(caseSlug);
  const nextEvent = profile.upcomingEvents[0];
  const workerInitials = profile.worker.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Youth view</h1>
        <p className="text-muted-foreground text-sm">
          Preview of the simplified app {firstName} would see on their phone
          (second role in the concept).
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
        <Eye className="h-4 w-4 shrink-0" />
        Worker preview. {firstName} only ever sees their own case, in their own
        words.
      </div>

      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card px-5 py-6">
          <p className="text-2xl font-semibold tracking-tight">
            Hi {firstName}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            You&apos;re doing well. Here&apos;s what&apos;s coming up.
          </p>
        </div>

        {nextEvent ? (
          <Card className="gap-2">
            <CardHeader className="pb-0">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">My next appointment</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-sm font-medium">{nextEvent.title}</p>
              <p className="text-sm text-muted-foreground">
                {nextEvent.dayLabel} at{" "}
                {format(nextEvent.startsAt, "h:mma").toLowerCase()}
              </p>
              <p className="text-xs text-muted-foreground">
                We&apos;ll send you a reminder the day before.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <Card className="gap-2">
          <CardHeader className="pb-0">
            <CardTitle className="text-base">My worker</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border">
              <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                {workerInitials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{profile.worker.name}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                {profile.worker.phone}
              </p>
            </div>
            <Button asChild size="sm">
              <Link href={`/messages/${caseSlug}`}>
                <MessageSquare />
                Message
              </Link>
            </Button>
          </CardContent>
        </Card>

        <CaseAttendanceStreakCard
          firstName={firstName}
          attendance={profile.attendance}
        />

        <Card className="gap-3">
          <CardHeader className="pb-0">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">My goals</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {goals.map((goal) => (
              <div key={goal.id} className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm">{goal.text}</p>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {goal.progressPercent}%
                  </span>
                </div>
                <Progress value={goal.progressPercent} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="gap-2">
          <CardHeader className="pb-0">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">My safety plan</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Your plan is always here when you need it, with your safe people
              one tap away.
            </p>
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link href={`/cases/${caseSlug}/safety-plans`}>Open my plan</Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Need someone now? Kids Helpline 1800 55 1800, any time.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
