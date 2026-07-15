import Link from "next/link";
import { addDays } from "date-fns";
import { AlertTriangle, ArrowRight } from "lucide-react";

import { DashboardHeroSection } from "@/components/organisms/dashboard-hero-section";
import { DUMMY_CASES } from "@/lib/dummy-cases";
import { getDummyCaseProfile } from "@/lib/dummy-case-profile";
import {
  getDummyCaseNotes,
  getDummySafetyPlan,
} from "@/lib/dummy-case-extras";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";

type AttentionCase = {
  slug: string;
  displayName: string;
  region: string;
  reasons: string[];
};

function buildCaseloadSnapshot() {
  const now = new Date();
  const weekAhead = addDays(now, 7);

  let eventsThisWeek = 0;
  let openFollowUps = 0;
  const needsAttention: AttentionCase[] = [];

  for (const dummyCase of DUMMY_CASES) {
    const profile = getDummyCaseProfile(dummyCase.slug, now);
    if (!profile) continue;

    eventsThisWeek += profile.upcomingEvents.filter(
      (event) => event.startsAt <= weekAhead,
    ).length;

    openFollowUps += getDummyCaseNotes(dummyCase.slug, now).filter(
      (note) => note.followUp,
    ).length;

    const reasons: string[] = [];
    if (profile.alerts.length >= 2) {
      reasons.push(`${profile.alerts.length} risk alerts`);
    }
    if (profile.order.conditions.some((c) => c.status === "attention")) {
      reasons.push("Order condition needs attention");
    }
    const plan = getDummySafetyPlan(dummyCase.slug, now);
    if (plan?.overdue) {
      reasons.push("Safety plan review overdue");
    }
    const courtSoon = profile.upcomingEvents.find(
      (event) => event.type === "Court" && event.startsAt <= addDays(now, 2),
    );
    if (courtSoon) {
      reasons.push("Court within 48h");
    }
    if (reasons.length >= 2) {
      needsAttention.push({
        slug: dummyCase.slug,
        displayName: dummyCase.displayName,
        region: profile.region,
        reasons,
      });
    }
  }

  needsAttention.sort((a, b) => b.reasons.length - a.reasons.length);

  return { eventsThisWeek, openFollowUps, needsAttention };
}

export default function DashboardPage() {
  const { eventsThisWeek, openFollowUps, needsAttention } =
    buildCaseloadSnapshot();

  return (
    <div className="space-y-6 pb-6">
      <DashboardHeroSection />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active cases</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {DUMMY_CASES.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Across the demo caseload.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Events next 7 days</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {eventsThisWeek}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Court dates, meetings and appointments.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open follow-ups</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {openFollowUps}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Flagged in case notes, awaiting action.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Needs attention</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {needsAttention.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Cases with multiple active flags.
          </CardContent>
        </Card>
      </div>

      <Card className="gap-3">
        <CardHeader className="pb-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-base">Needs attention</CardTitle>
          </div>
          <CardDescription>
            Cases with two or more active flags, most flagged first
          </CardDescription>
        </CardHeader>
        <CardContent>
          {needsAttention.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing needs attention right now.
            </p>
          ) : (
            <ul>
              {needsAttention.slice(0, 8).map((item, index) => (
                <li key={item.slug}>
                  {index > 0 ? <Separator /> : null}
                  <Link
                    href={`/cases/${item.slug}/overview`}
                    className="group flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium group-hover:text-primary">
                        {item.displayName}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {item.region}
                        </span>
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {item.reasons.map((reason) => (
                          <Badge
                            key={reason}
                            variant="outline"
                            className="border-amber-500/40 bg-amber-500/10 px-1.5 py-0 text-[10px] text-amber-600 dark:text-amber-400"
                          >
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
