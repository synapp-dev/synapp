import Link from "next/link";
import { Play } from "lucide-react";

import { EmptyState } from "@/components/atoms/empty-state";
import type { RecentUtilityClip } from "@/entities/utility-lineups/lib/queries";

function titleCase(value: string): string {
  return value.length === 0
    ? value
    : value.charAt(0).toUpperCase() + value.slice(1);
}

/** Right-rail widget: newest published utility clips, shown as media tiles. */
export function MediaClipsWidget({ clips }: { clips: RecentUtilityClip[] }) {
  if (clips.length === 0) {
    return (
      <EmptyState>No clips published yet.</EmptyState>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {clips.map((clip) => (
        <Link
          key={clip.id}
          href={`/utility/${clip.mapSlug}`}
          className="group bg-card hover:border-primary/50 focus-visible:ring-ring relative aspect-video overflow-hidden rounded-xl border shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          {clip.thumbnailUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element -- Supabase CDN map assets */
            <img
              src={clip.thumbnailUrl}
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
              aria-hidden
            />
          ) : (
            <div className="from-muted/60 to-background absolute inset-0 bg-gradient-to-br" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {clip.hasVideo ? (
            <span className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
              <Play className="size-3.5 fill-current" />
            </span>
          ) : null}

          <div className="absolute inset-x-0 bottom-0 space-y-0.5 p-2.5 text-white">
            <p className="text-[10px] font-medium tracking-wide uppercase opacity-80">
              {clip.mapDisplayName} · {titleCase(clip.grenadeType)}
            </p>
            <p className="line-clamp-1 text-xs font-semibold">
              {clip.throwLabel} → {clip.landLabel}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
