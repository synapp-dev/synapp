"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { createBrowserClient } from "@/utils/supabase/client";
import { clearAllUserData } from "@/utils/clear-user-data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export default function LogoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        const supabase = createBrowserClient();
        await supabase.auth.signOut();

        // Clear all user data from stores and queries
        clearAllUserData(queryClient);

        // Redirect to auth page after a short delay
        setTimeout(() => {
          router.replace("/auth");
        }, 1000);
      } catch (error) {
        console.error("Error during logout:", error);
        // Even if logout fails, clear user data and redirect
        clearAllUserData(queryClient);
        router.replace("/auth");
      }
    };

    handleLogout();
  }, [router, queryClient]);

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
