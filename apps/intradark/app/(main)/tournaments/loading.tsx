import { Skeleton } from "@workspace/ui/components/skeleton";

export default function TournamentsLoading() {
  return (
    <div className="space-y-8">
      <div className="-mx-6">
        <Skeleton className="h-72 w-full rounded-none" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
