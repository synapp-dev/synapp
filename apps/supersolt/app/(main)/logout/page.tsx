"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { createBrowserClient } from "@/utils/supabase/client";
import { useMeStore } from "@/entities/me/model/store";
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
  const resetMeStore = useMeStore((state) => state.reset);

  useEffect(() => {
    let isMounted = true;

    const handleLogout = async () => {
      try {
        const supabase = createBrowserClient();
        await supabase.auth.signOut();
      } catch (error) {
        console.error("Error during logout:", error);
      } finally {
        queryClient.clear();
        resetMeStore();

        if (isMounted) {
          router.replace("/auth");
          router.refresh();
        }
      }
    };

    void handleLogout();

    return () => {
      isMounted = false;
    };
  }, [queryClient, resetMeStore, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Signing out...</CardTitle>
          <CardDescription>
            Please wait while we sign you out of your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </CardContent>
      </Card>
    </div>
  );
}
