"use client";

import Image from "next/image";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export function LandingStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 py-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Welcome to Intradark</CardTitle>
          <CardDescription>
            Landing / marketing shell (mock). In production this is your public
            entry before Steam sign-in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Continue to simulate the Steam OpenID step — no redirect to the real
            Steam provider.
          </p>
          <Button
            type="button"
            onClick={onContinue}
            className="inline-flex items-center gap-2"
          >
            <Image
              src="/images/logos/steam-logo-white.svg"
              alt=""
              width={20}
              height={20}
            />
            Continue (sandbox)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
