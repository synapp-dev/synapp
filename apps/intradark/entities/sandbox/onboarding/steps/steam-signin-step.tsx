"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export function SteamSigninStep({
  onSimulateSuccess,
  onSimulateConflict,
  showConflictBranch,
}: {
  onSimulateSuccess: () => void;
  onSimulateConflict: () => void;
  showConflictBranch: boolean;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 py-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Steam OpenID (simulated)</CardTitle>
          <CardDescription>
            In production this step is handled by{" "}
            <code className="rounded bg-muted px-1 text-xs">/api/auth/steam</code>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={onSimulateSuccess}>
            Simulate Steam success
          </Button>
          {showConflictBranch ? (
            <Button type="button" variant="destructive" onClick={onSimulateConflict}>
              Simulate Steam already linked
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
