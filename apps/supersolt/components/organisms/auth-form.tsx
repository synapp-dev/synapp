"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { SupersoltLogo } from "@/components/atoms/supersolt-logo";
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
import { cn } from "@workspace/ui/lib/utils";
import { supabaseAuthErrorMessage } from "@/lib/auth/supabase-auth-error-message";
import { safeRelativeNextPath } from "@/server/square/safe-next-path";
import { createBrowserClient } from "@/utils/supabase/client";
import { useMeStore } from "@/entities/me/model/store";

type AlertState = {
  title: string;
  description: string;
  tone: "info" | "error";
};

type AuthMode = "signin" | "signup";

type SignInExperience = "password" | "otp" | "forgot";

function AuthFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const resetMeStore = useMeStore((state) => state.reset);
  const supabase = useMemo(() => createBrowserClient(), []);

  const nextPath = useMemo(
    () => safeRelativeNextPath(searchParams.get("next")) ?? "/dashboard",
    [searchParams]
  );
  const emailParam = searchParams.get("email") ?? searchParams.get("username");
  const modeParam = searchParams.get("mode");

  const [mode, setMode] = useState<AuthMode>(
    modeParam === "signup" ? "signup" : "signin"
  );
  const [signInExperience, setSignInExperience] = useState<SignInExperience>("password");
  const [email, setEmail] = useState(emailParam ?? "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);
  const [otp, setOtp] = useState("");
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<AlertState | null>(null);

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
      description: messages[err] ?? fallback ?? "Authentication error. Try again.",
      tone: "error",
    });
  }, [searchParams]);

  const clearClientState = () => {
    queryClient.clear();
    resetMeStore();
  };

  const setModeAndResetOtp = (next: AuthMode) => {
    setMode(next);
    setSignInExperience("password");
    setAlert(null);
    setIsOtpStep(false);
    setOtp("");
    setPassword("");
    setSignInPassword("");
    setConfirmPassword("");
    setAwaitingEmailConfirmation(false);
  };

  const confirmationRedirectTo = () => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const next = nextPath.startsWith("/") ? nextPath : "/dashboard";
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  };

  const recoveryRedirectTo = () => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const next = "/auth/update-password";
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  };

  const handleSignInWithPassword = async () => {
    setAlert(null);
    setIsSubmitting(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail.includes("@")) {
        setAlert({
          title: "Invalid email",
          description: "Enter a valid email address.",
          tone: "error",
        });
        return;
      }
      if (signInPassword.length < 6) {
        setAlert({
          title: "Password required",
          description: "Enter your password (at least 6 characters).",
          tone: "error",
        });
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: signInPassword,
      });

      if (error) {
        setAlert({
          title: "Sign-in failed",
          description: supabaseAuthErrorMessage(error),
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

  const handleForgotPassword = async () => {
    setAlert(null);
    setIsSubmitting(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail.includes("@")) {
        setAlert({
          title: "Invalid email",
          description: "Enter a valid email address.",
          tone: "error",
        });
        return;
      }

      const redirectTo = recoveryRedirectTo();
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      });

      if (error) {
        setAlert({
          title: "Could not send reset email",
          description: supabaseAuthErrorMessage(error),
          tone: "error",
        });
        return;
      }

      setAlert({
        title: "Check your email",
        description:
          "If an account exists for that address, we sent a link to reset your password. Open it on this device to continue.",
        tone: "info",
      });
      setSignInExperience("password");
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

      if (!normalizedEmail.includes("@")) {
        setAlert({
          title: "Invalid email",
          description: "Enter a valid email address.",
          tone: "error",
        });
        return;
      }

      if (password.length < 6) {
        setAlert({
          title: "Password too short",
          description: "Use at least 6 characters.",
          tone: "error",
        });
        return;
      }

      if (password !== confirmPassword) {
        setAlert({
          title: "Passwords do not match",
          description: "Re-enter your password in both fields.",
          tone: "error",
        });
        return;
      }

      const redirectTo = confirmationRedirectTo();
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
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
          "We sent you a confirmation link. Open it to verify your address and sign in. After that, use Sign in with a one-time code for future visits.",
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
      if (!normalizedEmail.includes("@")) {
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

  const handleRequestOtp = async () => {
    setAlert(null);
    setIsSubmitting(true);

    try {
      if (!email.trim()) {
        setAlert({
          title: "Email required",
          description: "Enter your email to receive a verification code.",
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
          description: supabaseAuthErrorMessage(error),
          tone: "error",
        });
        return;
      }

      setIsOtpStep(true);
      setOtp("");
      setEmail(normalizedEmail);
      setAlert({
        title: "Code sent",
        description:
          "Check your inbox and enter the 6-digit code. (Use the Magic link email template with {{ .Token }} in the Supabase dashboard for OTP.)",
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
          description: supabaseAuthErrorMessage(error),
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
    if (mode === "signup" && awaitingEmailConfirmation) {
      return;
    }
    if (mode === "signup" && !awaitingEmailConfirmation) {
      await handleSignUp();
      return;
    }
    if (signInExperience === "forgot") {
      await handleForgotPassword();
      return;
    }
    if (signInExperience === "password") {
      await handleSignInWithPassword();
      return;
    }
    if (isOtpStep) {
      await handleVerifyOtp();
      return;
    }
    await handleRequestOtp();
  };

  const canSubmitSignUp =
    mode === "signup" &&
    !awaitingEmailConfirmation &&
    email.trim() &&
    firstName.trim() &&
    lastName.trim() &&
    password.length >= 6 &&
    password === confirmPassword;

  const canSendCode = mode === "signin" && signInExperience === "otp" && email.trim();

  const canSubmitPasswordSignIn =
    mode === "signin" &&
    signInExperience === "password" &&
    email.trim().includes("@") &&
    signInPassword.length >= 6;

  const canSubmitForgot =
    mode === "signin" && signInExperience === "forgot" && email.trim().includes("@");

  const signInHeadline = () => {
    if (mode === "signup") {
      return awaitingEmailConfirmation ? "Confirm your email" : "Create your account";
    }
    if (signInExperience === "forgot") {
      return "Reset your password";
    }
    if (signInExperience === "otp") {
      return isOtpStep ? "Enter verification code" : "Sign in with a code";
    }
    return "Welcome back";
  };

  const signInSubline = () => {
    if (mode === "signup") {
      return awaitingEmailConfirmation
        ? "Confirm your address using the link in your email, then sign in with a one-time code."
        : "Choose a password, then we will email you a link to confirm your account.";
    }
    if (signInExperience === "forgot") {
      return "We will email you a link to choose a new password.";
    }
    if (signInExperience === "otp") {
      return isOtpStep
        ? "Enter the 6-digit code we sent to your inbox."
        : "We will send a one-time code to your email.";
    }
    return "Sign in with your email and password, or use a one-time code instead.";
  };

  const submitDisabled = () => {
    if (isSubmitting) {
      return true;
    }
    if (mode === "signup" && awaitingEmailConfirmation) {
      return true;
    }
    if (mode === "signup" && !awaitingEmailConfirmation) {
      return !canSubmitSignUp;
    }
    if (signInExperience === "forgot") {
      return !canSubmitForgot;
    }
    if (signInExperience === "password") {
      return !canSubmitPasswordSignIn;
    }
    if (isOtpStep) {
      return otp.length !== 6;
    }
    return !canSendCode;
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
      return "Create account";
    }
    if (signInExperience === "forgot") {
      return "Send reset link";
    }
    if (signInExperience === "password") {
      return "Sign in";
    }
    if (isOtpStep) {
      return "Verify code";
    }
    return "Send code";
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden border-primary/25 p-0">
        <CardContent className="grid min-h-[30rem] p-0 md:grid-cols-2">
          <form onSubmit={handleSubmit} className="p-6 md:p-8">
            <div className="flex h-full flex-col gap-6">
              <div className="flex items-center justify-center gap-3">
                <SupersoltLogo variant="wordmark" className="h-16 w-auto" priority />
              </div>

              <div className="flex rounded-lg border border-border bg-muted/40 p-1 text-sm font-medium">
                <button
                  type="button"
                  className={cn(
                    "flex-1 rounded-md py-2 transition-colors",
                    mode === "signin"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setModeAndResetOtp("signin")}
                  disabled={isSubmitting}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex-1 rounded-md py-2 transition-colors",
                    mode === "signup"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setModeAndResetOtp("signup")}
                  disabled={isSubmitting}
                >
                  Create account
                </button>
              </div>

              <div className="space-y-1 text-center">
                <h1 className="text-2xl font-semibold">{signInHeadline()}</h1>
                <p className="text-muted-foreground text-sm">{signInSubline()}</p>
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
                {mode === "signup" && !awaitingEmailConfirmation ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="first-name">First name</Label>
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
                        <Label htmlFor="last-name">Last name</Label>
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
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSubmitting}
                        placeholder="At least 6 characters"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isSubmitting}
                        placeholder="Confirm your password"
                      />
                    </div>
                  </>
                ) : null}

                {mode === "signin" && signInExperience === "password" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground text-xs font-medium underline-offset-4 hover:underline"
                        onClick={() => {
                          setAlert(null);
                          setSignInExperience("forgot");
                          setSignInPassword("");
                        }}
                        disabled={isSubmitting}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Input
                      id="signin-password"
                      type="password"
                      autoComplete="current-password"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Your password"
                    />
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={
                      isSubmitting ||
                      (mode === "signin" && signInExperience === "otp" && isOtpStep) ||
                      awaitingEmailConfirmation
                    }
                  />
                </div>

                {mode === "signin" && signInExperience === "otp" && isOtpStep ? (
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

              <div className="mt-auto space-y-3">
                <Button type="submit" className="w-full" disabled={submitDisabled()}>
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
                {mode === "signin" && signInExperience === "otp" && isOtpStep ? (
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
                {mode === "signin" && signInExperience === "forgot" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSignInExperience("password");
                      setAlert(null);
                    }}
                    disabled={isSubmitting}
                  >
                    Back to sign in
                  </Button>
                ) : null}
                {mode === "signin" && signInExperience === "password" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setAlert(null);
                      setSignInExperience("otp");
                      setSignInPassword("");
                      setIsOtpStep(false);
                      setOtp("");
                    }}
                    disabled={isSubmitting}
                  >
                    Use a one-time code instead
                  </Button>
                ) : null}
                {mode === "signin" && signInExperience === "otp" && !isOtpStep ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setAlert(null);
                      setSignInExperience("password");
                      setIsOtpStep(false);
                      setOtp("");
                    }}
                    disabled={isSubmitting}
                  >
                    Use password instead
                  </Button>
                ) : null}
                <p className="text-center text-sm text-muted-foreground">
                  {mode === "signup" ? (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                        onClick={() => setModeAndResetOtp("signin")}
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
                        onClick={() => setModeAndResetOtp("signup")}
                      >
                        Create an account
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>
          </form>

          <div className="bg-muted relative hidden flex-col items-center justify-center overflow-hidden md:flex">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
            <div className="relative z-10 px-10 text-center">
              <SupersoltLogo variant="wordmark" className="mx-auto mb-6 h-8 w-auto" />
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
