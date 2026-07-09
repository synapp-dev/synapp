import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { School } from "lucide-react";

interface SnapshotCardSkeletonProps {
  title: string;
  icon?: string;
}

export function SnapshotCardSkeleton({
  title,
}: SnapshotCardSkeletonProps) {
  const IconComponent = School; // Default icon, could be enhanced to use icon prop

  return (
    <Card className="relative group">
      <CardHeader className="">
        <CardTitle className="text-sm font-medium text-muted-foreground flex flex-row justify-between">
          <div className="flex items-center gap-1">
            <IconComponent className="h-3 w-3" />
            <h2 className="text-sm font-medium text-muted-foreground">
              {title}
            </h2>
          </div>
          <Skeleton className="h-5 w-16 rounded-md" />
        </CardTitle>
        <div className="flex items-center justify-between">
          <Skeleton className="h-12 w-24" />
        </div>
      </CardHeader>
      <CardFooter className="flex flex-col items-start gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-32" />
      </CardFooter>
    </Card>
  );
}

