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

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // TODO: Implement your logout logic here
        // Example with Supabase:
        // const supabase = createBrowserClient();
        // await supabase.auth.signOut();

        console.log("Logging out...");

        // Redirect to auth page after a short delay
        setTimeout(() => {
          router.push("/auth");
        }, 1000);
      } catch (error) {
        console.error("Error during logout:", error);
        router.push("/auth");
      }
    };

    handleLogout();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Signing out...</CardTitle>
          <CardDescription>
            Please wait while we sign you out of your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    </div>
  );
}
