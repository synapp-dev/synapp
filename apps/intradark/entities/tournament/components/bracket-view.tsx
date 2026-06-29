import { Badge } from "@workspace/ui/components/badge";

import type { FixtureRow } from "../lib/queries";

/** Read-only single-elim bracket — rounds as columns, fixtures as cards. */
export function BracketView({ fixtures }: { fixtures: FixtureRow[] }) {
  if (fixtures.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        The bracket appears here once the schedule is generated.
      </p>
    );
  }
  const isDouble = fixtures.some((f) => f.bracket && f.bracket !== "wb");

  const columns = (subset: FixtureRow[]) => {
    const rounds = [...new Set(subset.map((f) => f.round ?? 0))].sort((a, b) => a - b);
    const roundName = (r: number, total: number) => {
      const fromEnd = total - 1 - rounds.indexOf(r);
      if (fromEnd === 0) return "Final";
      if (fromEnd === 1) return "Semifinals";
      if (fromEnd === 2) return "Quarterfinals";
      return `Round ${rounds.indexOf(r) + 1}`;
    };
    return (
      <div className="flex gap-6 overflow-x-auto pb-2">
        {rounds.map((r) => (
          <div key={r} className="min-w-44 flex-1 space-y-3">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground">
              {roundName(r, rounds.length)}
            </h4>
            <div className="flex h-full flex-col justify-around gap-3">
              {subset
                .filter((f) => (f.round ?? 0) === r)
                .map((f) => (
                  <div key={f.id} className="rounded-md border p-2 text-sm">
                    <div>{f.homeName ?? "TBD"}</div>
                    <div className="my-1 border-t" />
                    <div>{f.awayName ?? "TBD"}</div>
                    {f.status !== "pending" ? (
                      <Badge variant="outline" className="mt-1">{f.status}</Badge>
                    ) : null}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!isDouble) return columns(fixtures);

  const wb = fixtures.filter((f) => f.bracket === "wb");
  const lb = fixtures.filter((f) => f.bracket === "lb");
  const gf = fixtures.filter((f) => f.bracket === "gf");
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-semibold">Winners bracket</h3>
        {columns(wb)}
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold">Losers bracket</h3>
        {columns(lb)}
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold">Grand final</h3>
        {columns(gf)}
      </section>
    </div>
  );
}
