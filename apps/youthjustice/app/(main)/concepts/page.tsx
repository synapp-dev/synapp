import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import {
  CONCEPT_BUILD_ORDER,
  CONCEPT_MODULES,
  CONCEPT_OPEN_QUESTIONS,
  CONCEPT_PERSONAS,
  PHASE_META,
  type ConceptPhase,
} from "@/lib/feature-concepts";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";

export const metadata: Metadata = {
  title: "Concepts | Youth Justice",
};

const PHASES: ConceptPhase[] = ["P0", "P1", "P2"];

const PERSONA_STATUS_META: Record<
  (typeof CONCEPT_PERSONAS)[number]["status"],
  { label: string; className: string }
> = {
  current: {
    label: "Current",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  agreed: {
    label: "Agreed direction",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  future: {
    label: "Future",
    className: "border-border bg-muted text-muted-foreground",
  },
};

function PhaseBadge({ phase }: { phase: ConceptPhase }) {
  const meta = PHASE_META[phase];
  return (
    <Badge
      variant="outline"
      className={`shrink-0 px-1.5 py-0 text-[10px] font-semibold tabular-nums ${meta.badgeClassName}`}
    >
      {phase}
    </Badge>
  );
}

export default function ConceptsPage() {
  return (
    <div className="space-y-8 py-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Platform concepts
          </h1>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          An ideation map for where the Youth Justice platform could go, grounded
          in the infrastructure that already exists in this demo. Planning
          material only; nothing here is committed scope.
        </p>
        <div className="flex flex-wrap gap-2">
          {PHASES.map((phase) => {
            const meta = PHASE_META[phase];
            return (
              <span
                key={phase}
                className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1"
              >
                <PhaseBadge phase={phase} />
                <span className="text-xs text-muted-foreground">
                  {meta.description}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Who it serves</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {CONCEPT_PERSONAS.map((persona) => {
            const statusMeta = PERSONA_STATUS_META[persona.status];
            return (
              <Card key={persona.name} className="gap-2">
                <CardHeader className="pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{persona.name}</CardTitle>
                    <Badge
                      variant="outline"
                      className={`shrink-0 px-1.5 py-0 text-[10px] ${statusMeta.className}`}
                    >
                      {statusMeta.label}
                    </Badge>
                  </div>
                  <CardDescription>{persona.role}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {persona.description}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Feature concepts by module
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {CONCEPT_MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <Card
                key={module.id}
                className={`gap-3 ${
                  module.highlight ? "border-primary/40 bg-primary/[0.03]" : ""
                }`}
              >
                <CardHeader className="pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </span>
                      <CardTitle className="text-base">{module.title}</CardTitle>
                    </div>
                    {module.highlight ? (
                      <Badge className="shrink-0 px-1.5 py-0 text-[10px]">
                        Priority
                      </Badge>
                    ) : null}
                  </div>
                  <CardDescription>{module.tagline}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {module.features.map((feature) => (
                      <li
                        key={feature.text}
                        className="flex items-start gap-2 text-sm"
                      >
                        <PhaseBadge phase={feature.phase} />
                        <span className="text-muted-foreground">
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            Suggested build order
          </h2>
          <Card>
            <CardContent className="pt-0">
              <ol className="space-y-0">
                {CONCEPT_BUILD_ORDER.map((step, index) => (
                  <li key={step.title}>
                    {index > 0 ? <Separator /> : null}
                    <div className="flex items-start gap-3 py-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-semibold tabular-nums">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{step.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {step.detail}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            Open questions for stakeholders
          </h2>
          <Card>
            <CardContent className="pt-0">
              <ul className="space-y-0">
                {CONCEPT_OPEN_QUESTIONS.map((question, index) => (
                  <li key={question}>
                    {index > 0 ? <Separator /> : null}
                    <div className="flex items-start gap-3 py-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <p className="text-sm text-muted-foreground">{question}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
