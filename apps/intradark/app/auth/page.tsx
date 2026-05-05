import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";

export default function AuthPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign in to Intradark</CardTitle>
          <CardDescription>
            Use Steam to access your profile, stats, and linked accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild className="w-full" size="lg">
            <Link href="/api/auth/steam" className="inline-flex items-center justify-center gap-2">
              <Image
                src="/images/logos/steam-logo-white.svg"
                alt=""
                width={20}
                height={20}
              />
              Sign in with Steam
            </Link>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            After signing in you will be redirected to your dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
