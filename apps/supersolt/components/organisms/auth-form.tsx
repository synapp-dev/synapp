"use client";

import { Suspense, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp";
import { Label } from "@workspace/ui/components/label";
import { createBrowserClient } from "@/utils/supabase/client";
import { useMeStore } from "@/entities/me/model/store";

type AlertState = {
  title: string;
  description: string;
  tone: "info" | "error";
};

function AuthFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const resetMeStore = useMeStore((state) => state.reset);
  const supabase = useMemo(() => createBrowserClient(), []);

  const nextPath = searchParams.get("next") ?? "/dashboard";
  const emailParam = searchParams.get("email") ?? searchParams.get("username");

  const [email, setEmail] = useState(emailParam ?? "");
  const [otp, setOtp] = useState("");
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<AlertState | null>(null);

  const clearClientState = () => {
    queryClient.clear();
    resetMeStore();
  };

  const handleRequestOtp = async () => {
    setAlert(null);
    setIsSubmitting(true);

    try {
      if (!email.trim()) {
        setAlert({
          title: "Email required",
          description: "Enter your email to receive a sign-in code.",
          tone: "error",
        });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail.includes("@")) {
        setAlert({
          title: "Invalid email",
          description: "Enter a valid email address.",
          tone: "error",
        });
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) {
        setAlert({
          title: "Unable to send code",
          description: error.message,
          tone: "error",
        });
        return;
      }

      setIsOtpStep(true);
      setOtp("");
      setEmail(normalizedEmail);
      setAlert({
        title: "Code sent",
        description: "Check your inbox and enter the 6-digit verification code.",
        tone: "info",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    setAlert(null);
    setIsSubmitting(true);

    try {
      if (otp.length !== 6) {
        setAlert({
          title: "Verification code required",
          description: "Enter the complete 6-digit code.",
          tone: "error",
        });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: otp,
        type: "email",
      });

      if (error) {
        setAlert({
          title: "Verification failed",
          description: error.message,
          tone: "error",
        });
        return;
      }

      clearClientState();
      router.push(nextPath);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isOtpStep) {
      await handleVerifyOtp();
      return;
    }
    await handleRequestOtp();
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden border-primary/25 p-0">
        <CardContent className="grid min-h-[30rem] p-0 md:grid-cols-2">
          <form onSubmit={handleSubmit} className="p-6 md:p-8">
            <div className="flex h-full flex-col gap-6">
              <div className="flex items-center justify-center gap-3">
                <Image
                  src="/images/supersolt-logowordmark-black.svg"
                  alt="Supersolt"
                  width={360}
                  height={144}
                  className="h-16 w-auto dark:hidden"
                  priority
                />
                <Image
                  src="/images/supersolt-logowordmark-white.svg"
                  alt="Supersolt"
                  width={360}
                  height={144}
                  className="hidden h-16 w-auto dark:block"
                  priority
                />
              </div>

              <div className="space-y-1 text-center">
                <h1 className="text-2xl font-semibold">Welcome back</h1>
                <p className="text-muted-foreground text-sm">
                  Sign in with a one-time code sent to your email.
                </p>
              </div>

              {alert ? (
                <div
                  className={
                    alert.tone === "error"
                      ? "rounded-md border border-destructive/30 bg-destructive/5 p-3 text-destructive"
                      : "rounded-md border border-primary/30 bg-primary/5 p-3 text-foreground"
                  }
                >
                  <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                    <AlertCircle className="h-4 w-4" />
                    {alert.title}
                  </div>
                  <p className="text-xs">{alert.description}</p>
                </div>
              ) : null}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={isSubmitting || isOtpStep}
                  />
                </div>

                {isOtpStep ? (
                  <div className="space-y-2">
                    <Label htmlFor="verification-code">Verification code</Label>
                    <InputOTP
                      id="verification-code"
                      maxLength={6}
                      value={otp}
                      onChange={setOtp}
                      disabled={isSubmitting}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                ) : null}
              </div>

              <div className="mt-auto space-y-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || !email.trim() || (isOtpStep && otp.length !== 6)}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Working...
                    </span>
                  ) : (
                    (isOtpStep ? "Verify code" : "Send code")
                  )}
                </Button>
                {isOtpStep ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleRequestOtp}
                    disabled={isSubmitting}
                  >
                    Resend code
                  </Button>
                ) : null}
              </div>
            </div>
          </form>

          <div className="bg-muted relative hidden flex-col items-center justify-center overflow-hidden md:flex">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
            <div className="relative z-10 px-10 text-center">
              <Image
                src="/images/supersolt-logowordmark-black.svg"
                alt="Supersolt"
                width={180}
                height={32}
                className="mx-auto mb-6 h-8 w-auto dark:hidden"
              />
              <Image
                src="/images/supersolt-logowordmark-white.svg"
                alt="Supersolt"
                width={180}
                height={32}
                className="mx-auto mb-6 hidden h-8 w-auto dark:block"
              />
              <p className="text-muted-foreground text-sm">
                Hospitality operations, inventory, and workforce in one place.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AuthForm() {
  return (
    <Suspense fallback={<div className="text-center text-sm">Loading...</div>}>
      <AuthFormContent />
    </Suspense>
  );
}
