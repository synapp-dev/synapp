import { cn } from "@workspace/ui/lib/utils";
import { STATION } from "@/lib/aviate-demo";

/**
 * In-content module header: title + subtitle on the left, the active station
 * badge on the right. Mirrors the header block used across the Menzies module
 * designs.
 */
export function PageHeader({
  title,
  subtitle,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3",
        className
      )}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {children}
        <StationBadge />
      </div>
    </div>
  );
}

export function StationBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-medium text-background">
      <span className="size-2 rounded-full bg-orange-500" />
      {STATION.name} ({STATION.iata})
    </span>
  );
}
