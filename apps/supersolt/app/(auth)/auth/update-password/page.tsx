"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { SupersoltLogo } from "@/components/atoms/supersolt-logo";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { supabaseAuthErrorMessage } from "@/lib/auth/supabase-auth-error-message";
import { createBrowserClient } from "@/utils/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useMeStore } from "@/entities/me/model/store";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const resetMeStore = useMeStore((state) => state.reset);
  const supabase = useMemo(() => createBrowserClient(), []);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [errorTitle, setErrorTitle] = useState<string | null>(null);
  const [errorDescription, setErrorDescription] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) {
        setHasSession(Boolean(data.session));
        setCheckingSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const clearClientState = () => {
    queryClient.clear();
    resetMeStore();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorTitle(null);
    setErrorDescription(null);

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setErrorTitle("Link expired or invalid");
      setErrorDescription(
        "Request a new password reset from the sign-in page and open the latest email link."
      );
      return;
    }

    if (password.length < 6) {
      setErrorTitle("Password too short");
      setErrorDescription("Use at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorTitle("Passwords do not match");
      setErrorDescription("Re-enter your password in both fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorTitle("Could not update password");
        setErrorDescription(supabaseAuthErrorMessage(error));
        return;
      }

      clearClientState();
      router.push("/dashboard");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
        <Card className="w-full max-w-md border-destructive/30">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <SupersoltLogo variant="wordmark" className="h-10 w-auto" />
              <h1 className="text-lg font-semibold">Session required</h1>
              <p className="text-muted-foreground text-sm">
                Open the password reset link from your email, or request a new one from sign-in.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link href="/auth">Back to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-lg">
        <Card className="overflow-hidden border-primary/25 p-0">
          <CardContent className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex items-center justify-center gap-3">
                <SupersoltLogo variant="wordmark" className="h-14 w-auto" priority />
              </div>
              <div className="space-y-1 text-center">
                <h1 className="text-2xl font-semibold">Set a new password</h1>
                <p className="text-muted-foreground text-sm">
                  Choose a strong password you have not used here before.
                </p>
              </div>

              {errorTitle ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-destructive">
                  <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                    <AlertCircle className="h-4 w-4" />
                    {errorTitle}
                  </div>
                  {errorDescription ? (
                    <p className="text-xs text-destructive/90">{errorDescription}</p>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="At least 6 characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirm password</Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Confirm your password"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    isSubmitting || password.length < 6 || password !== confirmPassword
                  }
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </span>
                  ) : (
                    "Update password"
                  )}
                </Button>
                <Button type="button" variant="ghost" className="w-full" asChild>
                  <Link href="/auth">Cancel and return to sign in</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
