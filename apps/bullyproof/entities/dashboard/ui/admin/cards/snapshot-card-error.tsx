import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { AlertCircle } from "lucide-react";

interface SnapshotCardErrorProps {
  title: string;
  icon?: string;
  error?: string;
}

export function SnapshotCardError({
  title,
  icon,
  error,
}: SnapshotCardErrorProps) {
  return (
    <Card className="relative group border-destructive/50">
      <CardHeader className="">
        <CardTitle className="text-sm font-medium text-muted-foreground flex flex-row justify-between">
          <div className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3 text-destructive" />
            <h2 className="text-sm font-medium text-muted-foreground">
              {title}
            </h2>
          </div>
        </CardTitle>
        <div className="flex items-center justify-between">
          <div className="text-5xl font-bold text-destructive/75">
            —
          </div>
        </div>
      </CardHeader>
      <CardFooter className="flex flex-col items-start">
        <p className="text-xs text-destructive">
          {error || "Failed to load data"}
        </p>
      </CardFooter>
    </Card>
  );
}

