"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTheme } from "next-themes";
import { SupersoltLogo } from "@/components/branding/supersolt-logo";
import { AuthPanelTaglineCarousel } from "@/components/auth/auth-panel-tagline-carousel";
import {
  AuthStreamingAlert,
  type AuthAlertState,
} from "@/components/auth/auth-streaming-alert";
import { AgentBotAvatarVideo } from "@/entities/ai-agent-chat/components/agent-bot-avatar-video";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { cn } from "@workspace/ui/lib/utils";
import { authCallbackUrl } from "@/lib/auth/app-origin";
import { supabaseAuthErrorMessage } from "@/lib/auth/supabase-auth-error-message";
import { safeRelativeNextPath } from "@/server/square/safe-next-path";
import { createBrowserClient } from "@/utils/supabase/client";
import { useMeStore } from "@/entities/me/model/store";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type AuthMode = "signin" | "signup";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Supabase signUp requires a password; users sign in with OTP only. */
function unusedSignUpPassword(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function AuthFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const resetMeStore = useMeStore((state) => state.reset);
  const supabase = useMemo(() => createBrowserClient(), []);
  const { resolvedTheme } = useTheme();
  const appIsDark = resolvedTheme === "dark";
  const authPanelThemeKey = appIsDark ? "light-panel" : "dark-panel";
  const reduceMotion = usePrefersReducedMotion();

  const nextPath = useMemo(
    () => safeRelativeNextPath(searchParams.get("next")) ?? "/dashboard",
    [searchParams],
  );
  const emailParam = searchParams.get("email") ?? searchParams.get("username");
  const modeParam = searchParams.get("mode");

  const [mode, setMode] = useState<AuthMode>(
    modeParam === "signup" ? "signup" : "signin",
  );
  const [email, setEmail] = useState(emailParam ?? "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] =
    useState(false);
  const [isSignInOtpStep, setIsSignInOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResendDisabled, setIsResendDisabled] = useState(false);
  const [alert, setAlert] = useState<AuthAlertState | null>(null);
  const [isFirstOtpSubmission, setIsFirstOtpSubmission] = useState(true);
  const otpRef = useRef<HTMLInputElement>(null);
  const showSignInOtp = mode === "signin" && isSignInOtpStep;

  useEffect(() => {
    const err = searchParams.get("error");
    if (!err) {
      return;
    }
    const desc = searchParams.get("error_description");
    const decoded = desc ? decodeURIComponent(desc) : "";
    const messages: Record<string, string> = {
      auth_callback_missing_code:
        "The confirmation link was incomplete. Request a new link from the sign-up screen.",
      auth_callback_exchange_failed:
        "We could not complete sign-in from your link. Try again or request a new confirmation email.",
      confirm_email:
        "Please confirm your email using the link we sent you before using the app.",
    };
    const fallback =
      err === "auth_callback_exchange_failed" && decoded
        ? supabaseAuthErrorMessage({ message: decoded })
        : decoded;
    setAlert({
      title: "Something went wrong",
      description:
        messages[err] ?? fallback ?? "Authentication error. Try again.",
      tone: "error",
    });
  }, [searchParams]);

  useEffect(() => {
    if (resendCountdown <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setResendCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  useEffect(() => {
    if (
      mode !== "signin" ||
      !isSignInOtpStep ||
      otp.length !== 6 ||
      !isFirstOtpSubmission ||
      isSubmitting
    ) {
      return;
    }
    setIsFirstOtpSubmission(false);
    void handleVerifyOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, isSignInOtpStep, isFirstOtpSubmission, mode, isSubmitting]);

  useEffect(() => {
    if (otp.length < 6 && !isFirstOtpSubmission) {
      setIsFirstOtpSubmission(true);
    }
  }, [otp, isFirstOtpSubmission]);

  const clearClientState = () => {
    queryClient.clear();
    resetMeStore();
  };

  const resetSignInOtpFlow = useCallback(() => {
    setIsSignInOtpStep(false);
    setOtp("");
    setResendCountdown(0);
    setIsResendDisabled(false);
    setIsFirstOtpSubmission(true);
  }, []);

  const setModeAndReset = (next: AuthMode) => {
    setMode(next);
    setAlert(null);
    resetSignInOtpFlow();
    setAwaitingEmailConfirmation(false);
  };

  const confirmationRedirectTo = () =>
    authCallbackUrl(
      nextPath,
      typeof window !== "undefined" ? window.location.origin : undefined,
    );

  const parseRateLimitSeconds = (message: string): number | null => {
    const match = message.match(/(\d+)\s*seconds?/i);
    if (!match) {
      return null;
    }
    const seconds = Number.parseInt(match[1] ?? "", 10);
    return Number.isFinite(seconds) ? seconds : null;
  };

  const handleRequestSignInOtp = async () => {
    setAlert(null);
    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (!EMAIL_PATTERN.test(normalizedEmail)) {
        setAlert({
          title: "Invalid email",
          description: "Enter a valid email address.",
          tone: "error",
        });
        return;
      }

      setEmail(normalizedEmail);
      router.replace(`?email=${encodeURIComponent(normalizedEmail)}`);

      setAlert({
        title: "Sending code",
        description: `Sending a one-time code to ${normalizedEmail}…`,
        tone: "info",
      });

      const whitelistRes = await fetch("/api/auth/whitelist-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const whitelistJson = (await whitelistRes.json()) as {
        data?: { allowed?: boolean };
      };
      if (!whitelistJson.data?.allowed) {
        setAlert({
          title: "Unable to sign in",
          description:
            "We could not sign you in with that email. Contact your organisation owner if you need access.",
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
        const rateLimitSeconds = parseRateLimitSeconds(error.message ?? "");
        if (rateLimitSeconds !== null) {
          setResendCountdown(rateLimitSeconds);
          setIsResendDisabled(true);
          setAlert({
            title: "Too many attempts",
            description: `For security, wait ${rateLimitSeconds} seconds before requesting another code.`,
            tone: "error",
          });
          return;
        }

        if (error.message === "Signups not allowed for otp") {
          setIsResendDisabled(true);
          setAlert({
            title: "Email not registered",
            description:
              "No account exists for this email. Create an account or contact your administrator.",
            tone: "error",
          });
          return;
        }

        setIsResendDisabled(true);
        setAlert({
          title: "Unable to send code",
          description: supabaseAuthErrorMessage(error),
          tone: "error",
        });
        return;
      }

      setIsSignInOtpStep(true);
      setOtp("");
      setIsFirstOtpSubmission(true);
      setResendCountdown(30);
      setAlert({
        title: "Code Sent!",
        description: "Check your inbox and enter the 6-digit code.",
        tone: "info",
      });
      setTimeout(() => otpRef.current?.focus(), 100);
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
          description: supabaseAuthErrorMessage(error),
          tone: "error",
        });
        setIsFirstOtpSubmission(false);
        return;
      }

      clearClientState();
      router.push(nextPath);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendSignInOtp = async () => {
    if (resendCountdown > 0) {
      return;
    }
    setAlert(null);
    setIsSubmitting(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      const whitelistRes = await fetch("/api/auth/whitelist-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const whitelistJson = (await whitelistRes.json()) as {
        data?: { allowed?: boolean };
      };
      if (!whitelistJson.data?.allowed) {
        setAlert({
          title: "Unable to resend code",
          description:
            "We could not send a code to that email. Contact your organisation owner if you need access.",
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
          title: "Could not resend",
          description: supabaseAuthErrorMessage(error),
          tone: "error",
        });
        return;
      }

      setResendCountdown(30);
      setAlert({
        title: "Code sent",
        description: "We sent another code to your email.",
        tone: "info",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    setAlert(null);
    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const fn = firstName.trim();
      const ln = lastName.trim();

      if (!fn || !ln) {
        setAlert({
          title: "Name required",
          description: "Enter your first and last name.",
          tone: "error",
        });
        return;
      }

      if (!EMAIL_PATTERN.test(normalizedEmail)) {
        setAlert({
          title: "Invalid email",
          description: "Enter a valid email address.",
          tone: "error",
        });
        return;
      }

      const redirectTo = confirmationRedirectTo();
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: unusedSignUpPassword(),
        options: {
          data: {
            first_name: fn,
            last_name: ln,
          },
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        setAlert({
          title: "Unable to create account",
          description: supabaseAuthErrorMessage(error),
          tone: "error",
        });
        return;
      }

      setEmail(normalizedEmail);

      if (data.session) {
        clearClientState();
        router.push(nextPath);
        router.refresh();
        return;
      }

      setAwaitingEmailConfirmation(true);
      setAlert({
        title: "Check your email",
        description:
          "We sent you a confirmation link. Open it to verify your address, then sign in with a one-time code.",
        tone: "info",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    setAlert(null);
    setIsSubmitting(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!EMAIL_PATTERN.test(normalizedEmail)) {
        return;
      }
      const redirectTo = confirmationRedirectTo();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });
      if (error) {
        setAlert({
          title: "Could not resend",
          description: supabaseAuthErrorMessage(error),
          tone: "error",
        });
        return;
      }
      setAlert({
        title: "Email sent",
        description: "Check your inbox for another confirmation link.",
        tone: "info",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "signup" && awaitingEmailConfirmation) {
      return;
    }
    if (mode === "signup") {
      await handleSignUp();
      return;
    }
    if (isSignInOtpStep) {
      await handleVerifyOtp();
      return;
    }
    await handleRequestSignInOtp();
  };

  const canSubmitSignUp =
    mode === "signup" &&
    !awaitingEmailConfirmation &&
    email.trim() &&
    firstName.trim() &&
    lastName.trim() &&
    EMAIL_PATTERN.test(email.trim());

  const canContinueSignIn =
    mode === "signin" && !isSignInOtpStep && EMAIL_PATTERN.test(email.trim());

  const contextAlert = useMemo((): AuthAlertState => {
    if (mode === "signup") {
      if (awaitingEmailConfirmation) {
        return {
          title: "Confirm your email",
          description:
            "Open the link we sent you to verify your address, then sign in with a one-time code.",
          tone: "info",
        };
      }
      return {
        title: "Create your account",
        description:
          "Add your details and we will email you a link to confirm your account.",
        tone: "info",
      };
    }
    if (isSignInOtpStep) {
      return {
        title: "Enter verification code",
        description: "Enter the 6-digit code we sent to your inbox.",
        tone: "info",
      };
    }
    return {
      title: "Welcome Back!",
      description:
        "Enter your email and we will send you a one-time sign-in code.",
      tone: "info",
    };
  }, [awaitingEmailConfirmation, isSignInOtpStep, mode]);

  const displayAlert = alert ?? contextAlert;

  const submitDisabled = () => {
    if (isSubmitting) {
      return true;
    }
    if (mode === "signup" && awaitingEmailConfirmation) {
      return true;
    }
    if (mode === "signup") {
      return !canSubmitSignUp;
    }
    if (isSignInOtpStep) {
      return otp.length !== 6;
    }
    return !canContinueSignIn || isResendDisabled;
  };

  const submitLabel = () => {
    if (isSubmitting) {
      return (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Working...
        </span>
      );
    }
    if (mode === "signup" && !awaitingEmailConfirmation) {
      return "Create Account";
    }
    if (mode === "signin" && isSignInOtpStep) {
      return "Sign In";
    }
    if (mode === "signin" && resendCountdown > 0 && !isSignInOtpStep) {
      return `Available in ${resendCountdown}s`;
    }
    return mode === "signin" ? "Continue" : "Create Account";
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden border-primary/25 p-0">
        <CardContent className="grid min-h-[30rem] p-0 md:grid-cols-2">
          <form onSubmit={handleSubmit} className="p-6 md:p-8">
            <div className="flex h-full flex-col gap-6">
              <div className="flex items-center justify-center gap-3">
                <SupersoltLogo
                  variant="wordmark"
                  className="h-16 w-auto"
                  priority
                />
              </div>

              <AuthStreamingAlert
                alert={displayAlert}
                reduceMotion={reduceMotion}
              />

              {mode === "signup" ? (
                <div className="min-h-0 flex-1 space-y-4">
                  {!awaitingEmailConfirmation ? (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="first-name">First Name</Label>
                          <Input
                            id="first-name"
                            autoComplete="given-name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            disabled={isSubmitting}
                            placeholder="Jane"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="last-name">Last Name</Label>
                          <Input
                            id="last-name"
                            autoComplete="family-name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            disabled={isSubmitting}
                            placeholder="Doe"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(event) => {
                            setEmail(event.target.value);
                            setIsResendDisabled(false);
                          }}
                          disabled={isSubmitting}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        disabled
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="min-h-0 flex-1" aria-hidden />
              )}

              <div className="mt-auto space-y-3">
                {mode === "signin" ? (
                  <div className="space-y-3">
                    <div
                      className={cn(
                        "space-y-2 transition-transform duration-500 ease-out",
                        showSignInOtp && !reduceMotion && "-translate-y-2",
                      )}
                    >
                      {showSignInOtp ? (
                        <div className="flex items-center justify-between gap-2">
                          <Label htmlFor="email">Email</Label>
                          <button
                            type="button"
                            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                            onClick={() => {
                              setEmail("");
                              resetSignInOtpFlow();
                              setAlert(null);
                              router.replace(window.location.pathname);
                            }}
                            disabled={isSubmitting}
                          >
                            Not you?
                          </button>
                        </div>
                      ) : (
                        <Label htmlFor="email">Email</Label>
                      )}
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          setIsResendDisabled(false);
                          if (searchParams.get("email")) {
                            router.replace(window.location.pathname);
                          }
                        }}
                        disabled={isSubmitting || showSignInOtp}
                      />
                    </div>

                    <div
                      className={cn(
                        "grid transition-[grid-template-rows,opacity] duration-500 ease-out",
                        showSignInOtp
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div
                          className={cn(
                            "space-y-2 pb-1",
                            showSignInOtp &&
                              !reduceMotion &&
                              "animate-slide-down-fade-in-slow",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Label htmlFor="verification-code">
                              Verification code
                            </Label>
                            <button
                              type="button"
                              className={cn(
                                "text-xs font-medium underline-offset-4 hover:underline",
                                resendCountdown > 0
                                  ? "text-muted-foreground cursor-not-allowed"
                                  : "text-primary",
                              )}
                              onClick={() => void handleResendSignInOtp()}
                              disabled={isSubmitting || resendCountdown > 0}
                            >
                              {resendCountdown > 0
                                ? `Resend in ${resendCountdown}s`
                                : "Resend code"}
                            </button>
                          </div>
                          <InputOTP
                            id="verification-code"
                            maxLength={6}
                            value={otp}
                            onChange={setOtp}
                            disabled={isSubmitting || !showSignInOtp}
                          >
                            <InputOTPGroup>
                              <InputOTPSlot index={0} ref={otpRef} />
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
                      </div>
                    </div>
                  </div>
                ) : null}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitDisabled()}
                >
                  {submitLabel()}
                </Button>
                {mode === "signup" && awaitingEmailConfirmation ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleResendConfirmation}
                    disabled={isSubmitting}
                  >
                    Resend confirmation email
                  </Button>
                ) : null}
                <p className="text-center text-sm text-muted-foreground">
                  {mode === "signup" ? (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                        onClick={() => setModeAndReset("signin")}
                      >
                        Sign in
                      </button>
                    </>
                  ) : (
                    <>
                      New to Supersolt?{" "}
                      <button
                        type="button"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                        onClick={() => setModeAndReset("signup")}
                      >
                        Create an account
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>
          </form>

          <div
            className={cn(
              "relative hidden flex-col items-center justify-center overflow-hidden md:flex",
              appIsDark
                ? "bg-zinc-50 text-zinc-900"
                : "bg-zinc-950 text-zinc-50",
            )}
          >
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br",
                appIsDark
                  ? "from-primary/20 via-zinc-50 to-white"
                  : "from-primary/25 via-zinc-950 to-zinc-900",
              )}
            />
            <div className="relative z-10 flex w-full max-w-xs flex-col items-center justify-center gap-2 px-10">
              <AgentBotAvatarVideo
                appearance="inverted"
                key={authPanelThemeKey}
                aria-label="Supersolt assistant"
                className="h-40 w-40 shrink-0 object-contain sm:h-44 sm:w-44 md:h-48 md:w-48"
              />
              <AuthPanelTaglineCarousel
                appIsDark={appIsDark}
                className="self-start"
              />
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
