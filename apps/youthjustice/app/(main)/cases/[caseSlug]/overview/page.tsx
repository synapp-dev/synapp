import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  AlertTriangle,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  CircleAlert,
  GraduationCap,
  Home,
  Mail,
  MessageSquare,
  Phone,
  Scale,
} from "lucide-react";

import { getDummyCaseBySlug } from "@/lib/dummy-cases";
import { getDummyCaseProfile } from "@/lib/dummy-case-profile";
import { CaseAttendanceStreakCard } from "@/components/organisms/case-attendance-streak-card";
import { CaseChecklistCard } from "@/components/organisms/case-checklist-card";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";

type Props = {
  params: Promise<{ caseSlug: string }>;
};

function eventTypeChip(type: string) {
  const t = type.toLowerCase();
  if (t === "court") {
    return "border-destructive/40 bg-destructive/5 text-destructive";
  }
  if (t === "meeting") {
    return "border-primary/40 bg-primary/5 text-primary";
  }
  return "border-border bg-muted/40 text-muted-foreground";
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

export default async function CaseOverviewPage({ params }: Props) {
  const { caseSlug } = await params;
  const dummyCase = getDummyCaseBySlug(caseSlug);
  const profile = getDummyCaseProfile(caseSlug);
  if (!dummyCase || !profile) {
    notFound();
  }

  const firstName = dummyCase.displayName.split(" ")[0]!;

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-muted-foreground text-sm">
          Snapshot of everything relevant to {dummyCase.displayName} (demo
          data).
        </p>
      </div>

      {/* Identity header + attendance streak */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-stretch">
        <Card className="gap-4 xl:flex-1">
          <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <Avatar className="h-16 w-16 border text-lg">
                <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                  {initialsOf(dummyCase.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="text-xl font-semibold tracking-tight">
                    {dummyCase.displayName}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {profile.pronouns}
                  </span>
                  <Badge variant="outline" className="font-mono text-[11px]">
                    {profile.caseNumber}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[11px]",
                      profile.alerts.length >= 2
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                    )}
                  >
                    {profile.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {profile.age} years old (
                  {format(profile.dateOfBirth, "d MMM yyyy")}) ·{" "}
                  {profile.gender} · {profile.ethnicity}
                  {profile.culture ? ` · ${profile.culture}` : ""} ·{" "}
                  {profile.region}
                </p>
                {profile.alerts.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.alerts.map((alert) => (
                      <span
                        key={alert.label}
                        title={alert.detail}
                        className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {alert.label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3 lg:items-end">
              <div className="text-sm lg:text-right">
                <p className="text-muted-foreground text-xs">
                  Allocated worker
                </p>
                <p className="font-medium">{profile.worker.name}</p>
                <p className="text-muted-foreground text-xs">
                  {profile.worker.title} · {profile.worker.phone}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href={`/messages/${caseSlug}`}>
                    <MessageSquare />
                    Message {firstName}
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/cases/${caseSlug}/correspondence`}>
                    <Mail />
                    Log contact
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/cases/${caseSlug}/calendar`}>
                    <CalendarPlus />
                    Schedule
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <CaseAttendanceStreakCard
          firstName={firstName}
          attendance={profile.attendance}
          className="xl:w-80 xl:shrink-0"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Order & compliance */}
          <Card className="gap-3">
            <CardHeader className="pb-0">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">
                  {profile.order.type}
                </CardTitle>
              </div>
              <CardDescription>{profile.order.court}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Started {format(profile.order.startDate, "d MMM yyyy")}
                  </span>
                  <span>
                    Ends {format(profile.order.endDate, "d MMM yyyy")}
                  </span>
                </div>
                <Progress
                  value={profile.order.progressPercent}
                  className="h-1.5"
                />
                <p className="text-xs text-muted-foreground">
                  {profile.order.progressPercent}% of order period elapsed
                </p>
              </div>
              <Separator />
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Conditions
                </p>
                <ul className="space-y-1.5">
                  {profile.order.conditions.map((condition) => (
                    <li
                      key={condition.text}
                      className="flex items-start gap-2 text-sm"
                    >
                      {condition.status === "met" ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      )}
                      <span
                        className={
                          condition.status === "met"
                            ? "text-muted-foreground"
                            : "font-medium"
                        }
                      >
                        {condition.text}
                        {condition.status === "attention" ? (
                          <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">
                            needs attention
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Coming up */}
          <Card className="gap-3">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Coming up</CardTitle>
                </div>
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                >
                  <Link href={`/cases/${caseSlug}/calendar`}>
                    Full calendar
                  </Link>
                </Button>
              </div>
              <CardDescription>
                Next obligations and appointments for {firstName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {profile.upcomingEvents.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="w-20 shrink-0">
                        <p className="text-sm font-medium">{event.dayLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(event.startsAt, "h:mma").toLowerCase()}
                        </p>
                      </div>
                      <p className="truncate text-sm">{event.title}</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium",
                        eventTypeChip(event.type),
                      )}
                    >
                      {event.type}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card className="gap-3">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Recent activity</CardTitle>
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                >
                  <Link href={`/cases/${caseSlug}/correspondence`}>
                    All correspondence
                  </Link>
                </Button>
              </div>
              <CardDescription>
                Latest contact and notes across the case record
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul>
                {profile.recentActivity.map((activity, index) => (
                  <li key={activity.id}>
                    {index > 0 ? <Separator /> : null}
                    <div className="flex items-start justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm">{activity.summary}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.kind} · {activity.worker}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {format(activity.date, "EEE d MMM")}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Personal details */}
          <Card className="gap-2">
            <CardHeader className="pb-0">
              <CardTitle className="text-base">Personal details</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <DetailRow
                label="Date of birth"
                value={`${format(profile.dateOfBirth, "d MMM yyyy")} (${profile.age})`}
              />
              <DetailRow label="Gender" value={profile.gender} />
              <DetailRow label="Ethnicity" value={profile.ethnicity} />
              <DetailRow
                label="Culture"
                value={profile.culture ?? "Not identified"}
              />
              <DetailRow icon={Home} label="Address" value={profile.address} />
              <DetailRow
                icon={GraduationCap}
                label="Education"
                value={profile.school}
              />
            </CardContent>
          </Card>

          {/* Emergency contact */}
          <Card className="gap-2">
            <CardHeader className="pb-0">
              <CardTitle className="text-base">Emergency contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-sm font-medium">
                {profile.emergencyContact.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {profile.emergencyContact.relationship}
              </p>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {profile.emergencyContact.phone}
              </p>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="mt-2 w-full"
              >
                <Link href={`/cases/${caseSlug}/support-contacts`}>
                  All support contacts
                </Link>
              </Button>
            </CardContent>
          </Card>

          <CaseChecklistCard items={profile.checklist} />
        </div>
      </div>
    </div>
  );
}
