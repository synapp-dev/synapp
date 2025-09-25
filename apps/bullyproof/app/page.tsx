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
    const checkAuth = async () => {
      try {
        // TODO: Implement your authentication check here
        // Example with Supabase:
        // const supabase = createBrowserClient();
        // const { data } = await supabase.auth.getUser();
        // if (data.user) {
        //   router.push("/home");
        // } else {
        //   router.push("/auth");
        // }

        // For now, redirect to home (you can change this to /auth when you implement auth)
        router.push("/dashboard");
      } catch (error) {
        console.error("Error checking authentication:", error);
        router.push("/auth");
      }
    };

    checkAuth();
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
