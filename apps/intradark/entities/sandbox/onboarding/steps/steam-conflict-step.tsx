"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export function SteamConflictStep({ onBack }: { onBack: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 py-4">
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-xl">Steam ID already linked</CardTitle>
          <CardDescription>
            This Steam account is associated with another Intradark profile
            (simulated conflict).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            In production the Steam callback would surface this after OpenID
            verification.
          </p>
          <Button type="button" variant="secondary" onClick={onBack}>
            Use a different Steam account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
