import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";

import type { CompetitionSummary } from "../types";
import { FormatBadge, SeasonStatusBadge } from "./format-badge";

function formatPrize(amount: string | null, currency: string | null): string | null {
  if (!amount) return null;
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${currency ?? ""} ${n.toLocaleString()}`.trim();
}

export function CompetitionCard({ competition }: { competition: CompetitionSummary }) {
  const prize = formatPrize(competition.prizePool, competition.prizeCurrency);
  return (
    <Link href={`/tournaments/${competition.slug}`} className="block">
      <Card className="h-full transition-colors hover:border-primary/50">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <FormatBadge format={competition.format} />
            <SeasonStatusBadge status={competition.currentSeasonStatus} />
          </div>
          <CardTitle className="mt-2">{competition.name}</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{competition.gameMode}</Badge>
            {competition.recurrence === "recurring" ? (
              <Badge variant="outline">Recurring</Badge>
            ) : null}
            <span>{competition.entrantCount} entrants</span>
          </CardDescription>
        </CardHeader>
        {prize ? (
          <CardContent>
            <p className="text-sm">
              <span className="text-muted-foreground">Prize pool: </span>
              <span className="font-semibold">{prize}</span>
            </p>
          </CardContent>
        ) : null}
      </Card>
    </Link>
  );
}
