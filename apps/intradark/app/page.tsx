"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    try {
      const match = document.cookie.match(/(?:^|; )steamId=([^;]+)/);
      const steamId = match ? decodeURIComponent(match[1] || "") : "";
      if (steamId) {
        router.replace("/dashboard");
      } else {
        router.replace("/news");
      }
    } catch (error) {
      router.replace("/news");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Loading...</CardTitle>
          <CardDescription>
            Please wait while we check your authentication status.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    </div>
  );
}
