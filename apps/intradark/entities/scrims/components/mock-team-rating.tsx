import { Star } from "lucide-react";

/**
 * MOCK UI — placeholder team rating carried over from the legacy design.
 * Not backed by real data; replace once a team-rating system exists.
 */
export function MockTeamRating() {
  return (
    <div
      className="flex flex-col items-end gap-1"
      title="Mock UI — placeholder rating, not real data"
      aria-label="Mock placeholder rating"
    >
      <div className="flex gap-0.5 text-yellow-400">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="size-4 fill-current" />
        ))}
      </div>
      <p className="text-[0.65rem] text-muted-foreground">337 ratings · mock</p>
    </div>
  );
}
