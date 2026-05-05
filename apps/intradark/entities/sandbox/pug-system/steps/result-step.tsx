"use client";

import Link from "next/link";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export function ResultStep() {
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle className="text-xl">Match finished</CardTitle>
        <CardDescription>Sandbox summary — no real match record.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-center gap-3 text-3xl font-bold tabular-nums">
          <span className="text-sky-400">13</span>
          <span className="text-zinc-500">:</span>
          <span className="text-orange-400">10</span>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          North wins · MVP: donk (mock)
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild variant="default">
            <Link href="/admin/sandbox/pug-system?step=0&preset=default">
              Queue again
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/sandbox">Back to sandbox index</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
