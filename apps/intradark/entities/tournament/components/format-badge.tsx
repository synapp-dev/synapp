import { Badge } from "@workspace/ui/components/badge";

const LABELS: Record<string, string> = {
  ladder: "Open Ladder",
  league: "League",
  bracket: "Bracket",
  queue: "PUG Queue",
};

const VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  ladder: "default",
  league: "secondary",
  bracket: "outline",
  queue: "secondary",
};

export function FormatBadge({ format }: { format: string }) {
  return (
    <Badge variant={VARIANTS[format] ?? "outline"}>
      {LABELS[format] ?? format}
    </Badge>
  );
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  announced: "Announced",
  registration_open: "Registration open",
  registration_closed: "Registration closed",
  seeding: "Seeding",
  live: "Live",
  completed: "Completed",
  archived: "Archived",
};

export function SeasonStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const live = status === "live" || status === "registration_open";
  return (
    <Badge variant={live ? "default" : "outline"}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
