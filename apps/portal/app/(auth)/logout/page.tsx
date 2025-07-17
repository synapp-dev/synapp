"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";

export default function LogoutPage() {
  const router = useRouter();
  const supabase = createBrowserClient();

  useEffect(() => {
    const handleLogout = async () => {
      await supabase.auth.signOut();
      router.push("/auth");
    };
    handleLogout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div>Logging you out...</div>;
}
