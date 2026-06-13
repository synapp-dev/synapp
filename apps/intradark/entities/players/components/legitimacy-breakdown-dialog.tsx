"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  LegitimacyRadialChart,
  axisScoresFromBreakdown,
} from "@/entities/players/components/legitimacy-radial-chart";
import { TIER_LABELS, type LegitimacyBreakdown } from "@/entities/players/lib/legitimacy";
import type { LegitimacyScoreRow } from "@/entities/players/hooks/queries";

const AXIS_LABELS: Record<keyof LegitimacyBreakdown["axes"], string> = {
  plausibility: "Plausibility",
  establishment: "Establishment",
  corroboration: "Corroboration",
  karma: "Community karma",
};

export function LegitimacyBreakdownDialog({
  open,
  onOpenChange,
  row,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: LegitimacyScoreRow | null;
}) {
  const breakdown = row?.breakdown;
  const axes = breakdown?.axes;
  const chartScores = axisScoresFromBreakdown(axes);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Veritas breakdown</DialogTitle>
          <DialogDescription>
            {row
              ? `${row.score}/100 · ${TIER_LABELS[row.tier as keyof typeof TIER_LABELS]} · ${row.confidence} confidence`
              : "Score not computed yet"}
          </DialogDescription>
        </DialogHeader>

        {axes ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2 text-sm">
                {breakdown.flags.positive.length > 0 ? (
                  <ul className="space-y-0.5 text-emerald-600 dark:text-emerald-400">
                    {breakdown.flags.positive.map((flag) => (
                      <li key={flag}>✓ {flag}</li>
                    ))}
                  </ul>
                ) : null}
                {breakdown.flags.risk.length > 0 ? (
                  <ul className="space-y-0.5 text-destructive">
                    {breakdown.flags.risk.map((flag) => (
                      <li key={flag}>✗ {flag}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <LegitimacyRadialChart scores={chartScores} size="md" />
            </div>

            <div className="space-y-4">
              {(Object.keys(AXIS_LABELS) as Array<keyof typeof AXIS_LABELS>).map(
                (key) => {
                  const axis = axes[key];
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{AXIS_LABELS[key]}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {axis.score}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${axis.score}%` }}
                        />
                      </div>
                      {axis.drivers?.length ? (
                        <ul className="text-xs text-muted-foreground">
                          {axis.drivers.map((d) => (
                            <li key={d}>{d}</li>
                          ))}
                        </ul>
                      ) : null}
                      {axis.note === "phase_2" ? (
                        <p className="text-xs text-muted-foreground">
                          Community karma ships in Phase 2.
                        </p>
                      ) : null}
                    </div>
                  );
                },
              )}
            </div>

            {breakdown.penalties.length > 0 ? (
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium">Penalties</p>
                <ul className="space-y-1 text-sm text-destructive">
                  {breakdown.penalties.map((p) => (
                    <li key={p.code}>
                      −{p.points} {p.label}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {row?.computed_at ? (
              <p className="border-t pt-4 text-xs text-muted-foreground">
                Computed {new Date(row.computed_at).toLocaleString()}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Visit again after player stats refresh to generate a score.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
