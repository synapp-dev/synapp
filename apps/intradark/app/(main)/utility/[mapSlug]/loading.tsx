import { Skeleton } from "@workspace/ui/components/skeleton";

export default function UtilityMapLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <Skeleton className="h-80 w-full rounded-lg lg:max-w-[280px]" />
        <Skeleton className="aspect-square w-full max-w-[720px] rounded-lg" />
      </div>
    </div>
  );
}
