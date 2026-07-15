"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  Info,
  KeyRound,
  Loader,
  MessagesSquare,
  Plane,
  RectangleEllipsis,
  ShieldX,
  SunMedium,
} from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp";
import { Label } from "@workspace/ui/components/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

import { EmailInput } from "@/components/molecules/email-input";
import { PasswordInput } from "@/components/molecules/password-input";
import { createBrowserClient } from "@/utils/supabase/client";

const cyclingTexts = [
  { text1: "Crew-ready", text2: "Rosters", icon: CalendarClock },
  { text1: "Effortless", text2: "Payslips", icon: Banknote },
  { text1: "Leave without", text2: "Gaps", icon: SunMedium },
  { text1: "One team,", text2: "One channel", icon: MessagesSquare },
];

type AlertVariant = "destructive" | "warning" | "info";

interface AlertMessage {
  title: string;
  description: React.ReactNode;
  variant: AlertVariant;
}

export function AuthForm() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createBrowserClient();
  const nextPath = searchParams.get("next") ?? "/home";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [isPasswordMode, setIsPasswordMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [isFirstOtpSubmission, setIsFirstOtpSubmission] = useState(true);
  const [hasOtpError, setHasOtpError] = useState(false);
  const [alertMessage, setAlertMessage] = useState<AlertMessage | null>({
    title: "Welcome to Aviate",
    description: "To continue, please enter your email below.",
    variant: "info",
  });
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const otpRef = React.useRef<HTMLInputElement>(null);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % cyclingTexts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) setEmail(emailParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendOtp = async (): Promise<boolean> => {
    setAlertMessage({
      title: "Sending Code",
      description: `Sending a one-time code to ${email}...`,
      variant: "info",
    });

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (error) {
      const rateLimitMatch = error.message.match(/(\d+)\s*seconds/);
      if (rateLimitMatch) {
        const seconds = parseInt(rateLimitMatch[1] ?? "0");
        setCountdown(seconds);
        setIsButtonDisabled(true);
        setAlertMessage({
          title: "Rate Limited",
          description: `For security purposes, you can request another code in ${seconds} seconds.`,
          variant: "warning",
        });
      } else if (error.message === "Signups not allowed for otp") {
        setAlertMessage({
          title: "Email Not Registered",
          description:
            "This email is not registered with Aviate. Contact your administrator to get access.",
          variant: "warning",
        });
        setIsButtonDisabled(true);
      } else {
        setAlertMessage({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
      return false;
    }

    setAlertMessage({
      title: "Code Sent",
      description:
        "We've sent a 6-digit code to your email. Please check your inbox!",
      variant: "info",
    });
    setCountdown(30);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!isOtpMode) {
        if (!isValidEmail) {
          setAlertMessage({
            title: "Invalid Email",
            description: "Please enter a valid email address",
            variant: "warning",
          });
          return;
        }
        router.replace(`?email=${encodeURIComponent(email)}`);
        const sent = await sendOtp();
        if (sent) {
          setIsOtpMode(true);
          setTimeout(() => otpRef.current?.focus(), 100);
        }
        return;
      }

      if (isPasswordMode) {
        if (!password) return;
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setAlertMessage({
            title:
              error.message === "Invalid login credentials"
                ? "Invalid Credentials"
                : "Authentication Failed",
            description:
              error.message === "Invalid login credentials"
                ? "The email or password you entered is incorrect"
                : error.message,
            variant: "destructive",
          });
          return;
        }
        if (data.session) {
          queryClient.clear();
          router.push(nextPath);
          router.refresh();
        }
        return;
      }

      if (otp.length !== 6) {
        setAlertMessage({
          title: "Invalid Code",
          description: "Please enter the complete 6-digit code.",
          variant: "warning",
        });
        return;
      }

      const {
        data: { session },
        error: verifyError,
      } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });

      if (verifyError) {
        setAlertMessage({
          title: "Verification Failed",
          description: verifyError.message,
          variant: "destructive",
        });
        setHasOtpError(true);
        setIsFirstOtpSubmission(false);
        return;
      }

      if (session) {
        queryClient.clear();
        router.push(nextPath);
        router.refresh();
      }
    } catch {
      setAlertMessage({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendOtp();
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToPassword = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsPasswordMode(true);
    setAlertMessage({
      title: "Password Sign In",
      description: "Enter your password to sign in",
      variant: "info",
    });
  };

  const handleSwitchToOtp = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsPasswordMode(false);
    setPassword("");
    await sendOtp();
    setTimeout(() => otpRef.current?.focus(), 100);
  };

  const handleResetEmail = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setEmail("");
    setOtp("");
    setPassword("");
    setIsOtpMode(false);
    setIsPasswordMode(false);
    setIsButtonDisabled(false);
    setIsFirstOtpSubmission(true);
    setHasOtpError(false);
    setAlertMessage({
      title: "Welcome to Aviate",
      description: "To continue, please enter your email below.",
      variant: "info",
    });
    router.replace(window.location.pathname);
  };

  // Auto-submit the first time all 6 digits are entered.
  useEffect(() => {
    if (isOtpMode && !isPasswordMode && otp.length === 6 && isFirstOtpSubmission) {
      setIsFirstOtpSubmission(false);
      const formEvent = new Event(
        "submit"
      ) as unknown as React.FormEvent<HTMLFormElement>;
      handleSubmit(formEvent);
    }
    if (otp.length < 6 && !isFirstOtpSubmission) {
      setIsFirstOtpSubmission(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, isOtpMode, isPasswordMode, isFirstOtpSubmission]);

  const CyclingIcon = cyclingTexts[currentTextIndex]?.icon ?? Plane;

  return (
    <div className="flex flex-col gap-6 transition-all duration-300">
      <Card className="overflow-hidden p-0 transition-all duration-300 border-primary/40">
        <CardContent className="grid p-0 md:grid-cols-2 min-h-[28rem]">
          <form onSubmit={handleSubmit} className="p-6 md:p-8">
            <div className="flex flex-col gap-6 h-full">
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-2 w-full justify-center">
                  <Plane className="size-7 text-primary" />
                  <span className="text-2xl font-bold tracking-tight">
                    Aviate
                  </span>
                </div>
                {alertMessage && (
                  <Alert
                    variant={
                      alertMessage.variant === "destructive"
                        ? "destructive"
                        : "default"
                    }
                    className={cn(
                      "w-full animate-slide-down-fade-in",
                      alertMessage.variant === "warning" &&
                        "bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200",
                      alertMessage.variant === "info" &&
                        "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200",
                      alertMessage.variant === "destructive" &&
                        "bg-destructive/5 border-destructive/20"
                    )}
                  >
                    {alertMessage.variant === "destructive" && (
                      <ShieldX className="size-5" />
                    )}
                    {alertMessage.variant === "warning" && (
                      <AlertTriangle className="size-5" />
                    )}
                    {alertMessage.variant === "info" && <Info className="size-5" />}
                    <AlertTitle>{alertMessage.title}</AlertTitle>
                    <AlertDescription className="text-xs font-normal">
                      {alertMessage.description}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="h-full flex flex-col justify-center gap-4 transition-all duration-300 ease-in-out">
                <EmailInput
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setIsButtonDisabled(false);
                  }}
                  disabled={isOtpMode}
                  label={
                    isOtpMode ? (
                      <div className="flex items-center justify-between w-full">
                        <span>Email</span>
                        <button
                          type="button"
                          onClick={handleResetEmail}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Not you?
                        </button>
                      </div>
                    ) : undefined
                  }
                />

                {isOtpMode && (
                  <div
                    className="flex flex-col gap-2 w-full animate-slide-left-fade-in"
                    key={`${isPasswordMode ? "password" : "otp"}-mode`}
                  >
                    {isPasswordMode ? (
                      <div className="flex gap-2 w-full items-end">
                        <div className="flex-1">
                          <PasswordInput
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            showPassword={showPassword}
                            onToggleVisibility={() =>
                              setShowPassword(!showPassword)
                            }
                          />
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={handleSwitchToOtp}
                              className="shrink-0 group/password-switch"
                            >
                              <RectangleEllipsis className="size-4 group-hover/password-switch:animate-shake-once" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Switch to verification code
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 w-full">
                          <Label className="text-xs text-muted-foreground">
                            Verification Code
                          </Label>
                          <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full mt-0.5" />
                          <Button
                            variant="link"
                            size="sm"
                            onClick={handleResendOtp}
                            disabled={countdown > 0}
                            className={cn(
                              "text-xs p-0 h-fit",
                              countdown > 0
                                ? "text-muted-foreground"
                                : "text-blue-600 hover:text-blue-800 hover:underline"
                            )}
                          >
                            {countdown > 0
                              ? `(Resend available in ${countdown}s)`
                              : "(Resend)"}
                          </Button>
                        </div>
                        <div className="flex gap-2 w-full justify-between">
                          <InputOTP
                            maxLength={6}
                            value={otp}
                            onChange={(value: string) => {
                              setOtp(value);
                              setHasOtpError(false);
                            }}
                            className={cn(hasOtpError && "border-destructive")}
                          >
                            <InputOTPGroup>
                              <InputOTPSlot index={0} ref={otpRef} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                            </InputOTPGroup>
                            <div className="w-1 h-0.5 bg-muted-foreground rounded-full" />
                            <InputOTPGroup>
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={handleSwitchToPassword}
                                className="shrink-0 group/password-switch"
                              >
                                <KeyRound className="size-4 group-hover/password-switch:animate-shake-once" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Sign in via password</TooltipContent>
                          </Tooltip>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    loading ||
                    (!isOtpMode && (!isValidEmail || isButtonDisabled)) ||
                    (isOtpMode && isPasswordMode && !password) ||
                    (isOtpMode && !isPasswordMode && otp.length !== 6)
                  }
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader className="animate-spin size-4" />
                      Loading...
                    </span>
                  ) : isOtpMode ? (
                    "Sign In"
                  ) : (
                    "Continue"
                  )}
                </Button>
              </div>
            </div>
          </form>

          <div className="relative bg-gradient-to-b from-primary/10 to-primary hidden md:flex flex-col items-center justify-center overflow-hidden">
            <Plane className="size-40 text-primary-foreground/90" />
            <div className="p-8 text-center z-10">
              <h3
                className="text-xl flex items-center justify-center gap-1.5 text-primary-foreground px-4 py-2 rounded-md select-none"
                key={`${currentTextIndex}-text`}
              >
                <CyclingIcon className="size-5 animate-slide-down-fade-in-slow [animation-duration:1s]" />
                <span className="animate-slide-down-fade-in-slow [animation-duration:1s] font-normal">
                  {cyclingTexts[currentTextIndex]?.text1}
                </span>
                <span className="opacity-0 animate-slide-up-fade-in-slow [animation-delay:0.5s] [animation-duration:1s] font-bold">
                  {cyclingTexts[currentTextIndex]?.text2}
                </span>
              </h3>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
