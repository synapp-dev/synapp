import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export function MainSectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {description ? (
          <p className="text-muted-foreground mt-1">{description}</p>
        ) : null}
      </div>
      {children ?? (
        <Card>
          <CardHeader>
            <CardTitle>Coming soon</CardTitle>
            <CardDescription>This area is under construction.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We are still building this part of Intradark. Check back later.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
