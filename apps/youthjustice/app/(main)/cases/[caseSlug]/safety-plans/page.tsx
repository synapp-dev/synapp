import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  AlertTriangle,
  Eye,
  HeartHandshake,
  History,
  MapPin,
  Phone,
  Shield,
  Sparkles,
} from "lucide-react";

import { getDummyCaseBySlug } from "@/lib/dummy-cases";
import { getDummySafetyPlan } from "@/lib/dummy-case-extras";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";

type Props = {
  params: Promise<{ caseSlug: string }>;
};

function PlanSection({
  icon: Icon,
  title,
  items,
  iconClassName,
}: {
  icon: typeof Shield;
  title: string;
  items: string[];
  iconClassName?: string;
}) {
  return (
    <Card className="gap-2">
      <CardHeader className="pb-0">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4 text-muted-foreground", iconClassName)} />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="list-inside list-disc space-y-1.5 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default async function SafetyPlansPage({ params }: Props) {
  const { caseSlug } = await params;
  const c = getDummyCaseBySlug(caseSlug);
  const plan = getDummySafetyPlan(caseSlug);
  if (!c || !plan) {
    notFound();
  }
  const firstName = c.displayName.split(" ")[0]!;

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Safety plan</h1>
          <p className="text-muted-foreground text-sm">
            Structured plan for {c.displayName} (demo data).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono text-[11px]">
            v{plan.version}
          </Badge>
          {plan.coAuthoredWithYouth ? (
            <Badge
              variant="outline"
              className="border-primary/40 bg-primary/5 text-[11px] text-primary"
            >
              Co-authored with {firstName}
            </Badge>
          ) : null}
          <Badge
            variant="outline"
            className={cn(
              "text-[11px]",
              plan.overdue
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            )}
          >
            {plan.overdue
              ? `Review overdue (due ${format(plan.nextReview, "d MMM")})`
              : `Next review ${format(plan.nextReview, "d MMM yyyy")}`}
          </Badge>
        </div>
      </div>

      {plan.overdue ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm">
              This plan was last reviewed on{" "}
              {format(plan.lastReviewed, "d MMM yyyy")} and is overdue for
              review. Book a review with {firstName} at the next contact.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <PlanSection
          icon={AlertTriangle}
          title="Identified risks"
          items={plan.risks}
          iconClassName="text-destructive"
        />
        <PlanSection
          icon={Eye}
          title="Warning signs"
          items={plan.warningSigns}
          iconClassName="text-amber-500"
        />
        <PlanSection
          icon={Sparkles}
          title={`Things that help ${firstName}`}
          items={plan.copingStrategies}
          iconClassName="text-primary"
        />
        <PlanSection
          icon={MapPin}
          title="Safe places"
          items={plan.safePlaces}
          iconClassName="text-emerald-600 dark:text-emerald-400"
        />
      </div>

      <Card className="gap-3">
        <CardHeader className="pb-0">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Safe people</CardTitle>
          </div>
          <CardDescription>
            Who {firstName} can reach out to, any time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {plan.safePeople.map((person) => (
              <div
                key={person.name}
                className="rounded-lg border px-3 py-2.5"
              >
                <p className="text-sm font-medium">{person.name}</p>
                <p className="text-xs text-muted-foreground">
                  {person.relationship}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {person.phone}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="gap-3">
        <CardHeader className="pb-0">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Version history</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul>
            {plan.history.map((entry, index) => (
              <li key={entry.version}>
                {index > 0 ? <Separator /> : null}
                <div className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-mono text-xs text-muted-foreground">
                        v{entry.version}
                      </span>{" "}
                      {entry.note}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.author}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {format(entry.date, "d MMM yyyy")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
