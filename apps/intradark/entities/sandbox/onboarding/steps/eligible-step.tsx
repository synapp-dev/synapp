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

export function EligibleStep() {
  return (
    <Card className="mx-auto max-w-lg border-emerald-500/35">
      <CardHeader>
        <CardTitle className="text-xl text-emerald-100">Ready to queue</CardTitle>
        <CardDescription>
          Steam + Discord linked — you would be eligible for the PUG queue (mock).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-row">
        <Button asChild>
          <Link href="/admin/sandbox/pug-system?step=0&preset=default">
            Open PUG sandbox
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/play">Open real Play page</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
