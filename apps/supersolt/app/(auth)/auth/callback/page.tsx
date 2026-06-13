"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { useMeStore } from "@/entities/me/model/store";
import { safeRelativeNextPath } from "@/server/square/safe-next-path";
import { createBrowserClient } from "@/utils/supabase/client";

function parseEmailOtpType(value: string | null): EmailOtpType | null {
  if (!value) {
    return null;
  }
  switch (value) {
    case "signup":
    case "invite":
    case "magiclink":
    case "recovery":
    case "email_change":
    case "email":
      return value;
    default:
      return null;
  }
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const resetMeStore = useMeStore((state) => state.reset);
  const supabase = useMemo(() => createBrowserClient(), []);
  const handledRef = useRef(false);

  const nextPath = useMemo(
    () => safeRelativeNextPath(searchParams.get("next")) ?? "/dashboard",
    [searchParams],
  );

  useEffect(() => {
    if (handledRef.current) {
      return;
    }
    handledRef.current = true;

    const fail = (error: string, description?: string) => {
      const url = new URL("/auth", window.location.origin);
      url.searchParams.set("error", error);
      if (description) {
        url.searchParams.set("error_description", encodeURIComponent(description));
      }
      router.replace(url.pathname + url.search);
    };

    void (async () => {
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const otpType = parseEmailOtpType(searchParams.get("type"));

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          fail("auth_callback_exchange_failed", error.message);
          return;
        }
      } else if (tokenHash && otpType) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        });
        if (error) {
          fail("auth_callback_exchange_failed", error.message);
          return;
        }
      } else {
        const { error } = await supabase.auth.initialize();
        if (error) {
          fail("auth_callback_exchange_failed", error.message);
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        fail("auth_callback_missing_code");
        return;
      }

      queryClient.clear();
      resetMeStore();
      router.push(nextPath);
      router.refresh();
    })();
  }, [nextPath, queryClient, resetMeStore, router, searchParams, supabase]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p className="text-sm">Completing sign-in…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
