"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const resetMe = useMeStore((state) => state.reset);

  useEffect(() => {
    const handleLogout = async () => {
      try {
        const supabase = createBrowserClient();
        await supabase.auth.signOut();
        resetMe();
        router.push("/auth");
        router.refresh();
      } catch (error) {
        console.error("Error during logout:", error);
        resetMe();
        router.push("/auth");
      }
    };

    handleLogout();
  }, [router, resetMe]);

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
