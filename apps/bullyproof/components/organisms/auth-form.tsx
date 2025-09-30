"use client";

import * as React from "react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { EmailInput } from "@/components/molecules/email-input";
import { PasswordInput } from "@/components/molecules/password-input";
import { AuthFooter } from "@/components/molecules/auth-footer";
import { createBrowserClient } from "@/utils/supabase/client";
import { AnimatedBackground } from "@/components/molecules/animated-background";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp";
import { AlertDescription, AlertTitle } from "@workspace/ui/components/alert";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Brain,
  ChevronsRight,
  HeartHandshake,
  School,
  ShieldX,
  AlertTriangle,
  Info,
  Loader,
  KeyRound,
  RectangleEllipsis,
} from "lucide-react";
import { Label } from "@workspace/ui/components/label";
import { Alert } from "@workspace/ui/components/alert";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@workspace/ui/components/tooltip";

const cyclingTexts = [
  {
    text1: "Safe",
    text2: "Minds",
    icon: Brain,
  },
  {
    text1: "Stronger",
    text2: "Schools",
    icon: School,
  },
  {
    text1: "Together Against",
    text2: "Bullying",
    icon: HeartHandshake,
  },
];

export function AuthForm({ className, ...props }: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{
    title: string;
    description: React.ReactNode;
    variant: "destructive" | "warning" | "info";
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [isPasswordMode, setIsPasswordMode] = useState(false);
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [isFirstOtpSubmission, setIsFirstOtpSubmission] = useState(true);
  const [hasOtpError, setHasOtpError] = useState(false);
  const otpRef = React.useRef<HTMLInputElement>(null);
  const hasShownInitialAlertRef = React.useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createBrowserClient();
  const [emailRateLimit, setEmailRateLimit] = useState(0);

  // Email validation regex
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % cyclingTexts.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (isOtpMode && !isPasswordMode) {
      // Reset alert message when countdown reaches 0 in OTP mode
      setAlertMessage({
        title: "Code Sent",
        description:
          "We've sent a verification code to your email. Please check your inbox!",
        variant: "info",
      });
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown, isOtpMode, isPasswordMode]);

  // Add new useEffect to update rate limit alert message
  useEffect(() => {
    if (countdown > 0 && alertMessage?.title === "Rate Limited") {
      setAlertMessage({
        title: "Rate Limited",
        description: `Please wait ${countdown} seconds before requesting another code`,
        variant: "warning",
      });
    }
  }, [countdown, alertMessage?.title]);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const modeParam = searchParams.get("mode");
    if (emailParam) {
      setEmail(emailParam);
    }
    if (modeParam === "password") {
      setIsOtpMode(true);
      setIsPasswordMode(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (emailRateLimit > 0) {
      timer = setInterval(() => {
        setEmailRateLimit((prev) => prev - 1);
      }, 1000);
      setAlertMessage({
        title: "Rate Limited",
        description: `For security purposes, you can only request this after ${emailRateLimit} seconds.`,
        variant: "destructive",
      });
    } else if (emailRateLimit === 0 && isButtonDisabled) {
      setIsButtonDisabled(false);
      setAlertMessage(null);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [emailRateLimit, isButtonDisabled]);

  // Show a default info alert once after initial mode is determined
  useEffect(() => {
    if (hasShownInitialAlertRef.current) return;

    if (isPasswordMode && email) {
      setAlertMessage({
        title: "Password Sign In",
        description: "Enter your password to sign in",
        variant: "info",
      });
      hasShownInitialAlertRef.current = true;
      return;
    }

    if (!isPasswordMode && !isOtpMode) {
      setAlertMessage({
        title: "Welcome Back!",
        description: "To continue, please enter your email below.",
        variant: "info",
      });
      hasShownInitialAlertRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOtpMode, isPasswordMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertMessage(null);
    setLoading(true);

    try {
      if (!isOtpMode) {
        // First step - validate email and request OTP
        if (!isValidEmail) {
          setAlertMessage({
            title: "Invalid Email",
            description: "Please enter a valid email address",
            variant: "warning",
          });
          return;
        }
        // Add email to URL param
        router.replace(`?email=${encodeURIComponent(email)}`);

        setAlertMessage({
          title: "Sending Code",
          description: `Sending one time password to ${email}...`,
          variant: "info",
        });

        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false,
          },
        });

        if (otpError) {
          // Handle rate limit error for email step
          const rateLimitMatch = otpError.message.match(/(\d+)\s*seconds/);
          if (rateLimitMatch) {
            const seconds = parseInt(rateLimitMatch[1] ?? "0");
            setEmailRateLimit(seconds);
            setIsButtonDisabled(true);
            setAlertMessage({
              title: "Rate Limited",
              description: `For security purposes, you can only request this after ${seconds} seconds.`,
              variant: "destructive",
            });
          } else if (otpError.message === "Signups not allowed for otp") {
            setAlertMessage({
              title: "Email Not Registered",
              description: (
                <div className="text-xs">
                  Contact{" "}
                  <a
                    href="mailto:info@bullyproofaustralia.org.au"
                    className="underline text-blue-700"
                  >
                    info@bullyproofaustralia.org.au
                  </a>{" "}
                  or visit{" "}
                  <a
                    href="https://bullyproofaustralia.org.au/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-700"
                  >
                    our website
                  </a>{" "}
                  for more information!
                </div>
              ),
              variant: "warning",
            });
            setIsButtonDisabled(true);
          } else {
            setAlertMessage({
              title: "Error",
              description: otpError.message,
              variant: "destructive",
            });
            setIsButtonDisabled(true);
          }
          return;
        }

        setAlertMessage({
          title: "Code Sent",
          description:
            "We've sent a verification code to your email. Please check your inbox!",
          variant: "info",
        });

        setIsOtpMode(true);
        setCountdown(30);
        setLoading(false);
        // Focus OTP input after a short delay to ensure it's mounted
        setTimeout(() => {
          otpRef.current?.focus();
        }, 100);
        return;
      }

      // Handle password mode authentication
      if (isPasswordMode) {
        if (!password) {
          setAlertMessage({
            title: "Password Required",
            description: "Please enter your password",
            variant: "warning",
          });
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message === "Invalid login credentials") {
            setAlertMessage({
              title: "Invalid Credentials",
              description: "The email or password you entered is incorrect",
              variant: "destructive",
            });
          } else {
            setAlertMessage({
              title: "Authentication Failed",
              description: error.message,
              variant: "destructive",
            });
          }
          return;
        }

        if (data.session) {
          router.push("/dashboard");
        }
        return;
      }

      // Handle OTP verification (existing code)
      if (otp.length !== 6) {
        setAlertMessage({
          title: "Invalid OTP",
          description: "Please enter the complete 6-digit OTP.",
          variant: "warning",
        });
        return;
      }

      const {
        data: { session },
        error: verifyError,
      } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

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
        router.push("/dashboard");
      }
    } catch {
      setAlertMessage({
        title: "Error",
        description: "Failed to send verification code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add new function to handle password input key press
  const handlePasswordKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && isPasswordMode) {
      e.preventDefault();
      const formEvent = new Event(
        "submit"
      ) as unknown as React.FormEvent<HTMLFormElement>;
      handleSubmit(formEvent);
    }
  };

  const handleResendOtp = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      });

      if (otpError) {
        console.error(otpError);
        setAlertMessage({
          title: "Resend Failed",
          description: otpError.message,
          variant: "warning",
        });
        return;
      }

      setCountdown(30);
    } catch {
      setAlertMessage({
        title: "Resend Failed",
        description: "Failed to resend OTP",
        variant: "warning",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToPassword = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);
    params.set("mode", "password");
    router.replace(`?${params.toString()}`);
    setIsOtpMode(true);
    setIsPasswordMode(true);
    setAlertMessage({
      title: "Password Sign In",
      description: "Enter your password to sign in",
      variant: "info",
    });
  };

  const handleSwitchToOtp = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);
    params.delete("mode");
    router.replace(`?${params.toString()}`);
    setIsPasswordMode(false);

    setAlertMessage({
      title: "Sending Code",
      description: `Sending one time password to ${email}...`,
      variant: "info",
    });

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      });

      if (otpError) {
        // Check if it's a rate limit error and extract the seconds
        const rateLimitMatch = otpError.message.match(/(\d+)\s*seconds/);
        if (rateLimitMatch) {
          const seconds = parseInt(rateLimitMatch[1] ?? "0");
          setCountdown(seconds);
          setAlertMessage({
            title: "Rate Limited",
            description: `Please wait ${seconds} seconds before requesting another code`,
            variant: "warning",
          });
        } else {
          setAlertMessage({
            title: "Error",
            description: otpError.message,
            variant: "destructive",
          });
        }
        return;
      }

      setAlertMessage({
        title: "Code Sent",
        description:
          "We've sent a verification code to your email. Please check your inbox!",
        variant: "info",
      });
      setCountdown(30);
    } catch {
      setAlertMessage({
        title: "Error",
        description: "Failed to send verification code",
        variant: "destructive",
      });
    }
  };

  // Add useEffect for OTP auto-submit
  useEffect(() => {
    if (
      isOtpMode &&
      !isPasswordMode &&
      otp.length === 6 &&
      isFirstOtpSubmission
    ) {
      setIsFirstOtpSubmission(false);
      const formEvent = new Event(
        "submit"
      ) as unknown as React.FormEvent<HTMLFormElement>;
      handleSubmit(formEvent);
    }
    // Reset isFirstOtpSubmission if user deletes a digit
    if (otp.length < 6 && !isFirstOtpSubmission) {
      setIsFirstOtpSubmission(true);
    }
  }, [otp, isOtpMode, isPasswordMode, isFirstOtpSubmission]);

  return (
    <div
      className={cn(
        "flex flex-col gap-6 transition-all duration-300",
        className
      )}
      {...props}
    >
      <Card className="overflow-hidden p-0 transition-all duration-300 border-[#00878e]/50">
        <CardContent className="grid p-0 md:grid-cols-2 min-h-[28rem]">
          <form onSubmit={handleSubmit} className="p-6 md:p-8">
            <div className="flex flex-col gap-6 h-full">
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-2 text-center w-full h-fit justify-center">
                  <Image
                    src="/images/bullyproof-logo.svg"
                    alt="Bullyproof Logo"
                    width={75}
                    height={75}
                  />
                  <ChevronsRight className="size-4 text-[#00878e] animate-pulse" />
                  <Image
                    src="/images/portal-text.svg"
                    alt="Portal Logo"
                    width={50}
                    height={50}
                  />
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
                        "bg-yellow-100 border-yellow-300 text-yellow-800",
                      alertMessage.variant === "info" &&
                        "bg-blue-100 border-blue-300 text-blue-800",
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
                    {alertMessage.variant === "info" && (
                      <Info className="size-5" />
                    )}
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
                    // Remove email param from URL if changed
                    const params = new URLSearchParams(window.location.search);
                    if (params.has("email")) {
                      params.delete("email");
                      const newUrl =
                        window.location.pathname +
                        (params.toString() ? `?${params.toString()}` : "");
                      window.history.replaceState({}, "", newUrl);
                    }
                  }}
                  disabled={isOtpMode}
                  label={
                    isOtpMode ? (
                      <div className="flex items-center justify-between w-full">
                        <span>Email</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setEmail("");
                            setIsOtpMode(false);
                            setOtp("");
                            setAlertMessage(null);
                            setIsButtonDisabled(false);
                            setIsFirstOtpSubmission(true);
                            setHasOtpError(false);
                            // Clear URL params
                            window.history.replaceState(
                              {},
                              "",
                              window.location.pathname
                            );
                          }}
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
                            onKeyPress={(
                              e: React.KeyboardEvent<HTMLInputElement>
                            ) => handlePasswordKeyPress(e)}
                            resetURL="/forgot-password"
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
                              setOtp(value as string);
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
                            <TooltipContent>
                              Sign in via password
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  className={cn(
                    "w-full",
                    (loading ||
                      (!isOtpMode && (!isValidEmail || isButtonDisabled)) ||
                      (isOtpMode && isPasswordMode && !password) ||
                      (isOtpMode && !isPasswordMode && otp.length !== 6)) &&
                      "cursor-not-allowed"
                  )}
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
                  ) : !isOtpMode && emailRateLimit > 0 ? (
                    `Available in ${emailRateLimit} seconds`
                  ) : isOtpMode ? (
                    "Sign In"
                  ) : (
                    "Continue"
                  )}
                </Button>
              </div>
            </div>
          </form>
          <div className="relative bg-gradient-to-b from-[#00878e]/10 to-[#00878e] hover:bg-[#00878e]/30 transition-all duration-300 hidden md:flex flex-col items-center justify-center overflow-hidden group/image">
            <AnimatedBackground className="absolute inset-0 animate-pulse" />
            <Image
              src="/images/login-image-bare.svg"
              alt="Login Image"
              width={800}
              height={800}
              className="object-fit px-10 pt-10 relative z-10 animate-hover-small-slow group-hover/image:animate-none"
            />
            <div className="p-8 text-center text-primary z-10">
              <div className="flex items-center justify-center select-none">
                <h3
                  className="text-xl flex items-center gap-1.5 text-white px-4 py-2 rounded-md"
                  key={`${currentTextIndex}-text`}
                >
                  <span className="animate-slide-down-fade-in-slow [animation-duration:1s] font-normal">
                    {cyclingTexts[currentTextIndex]?.text1}
                  </span>
                  <span className="opacity-0 animate-slide-up-fade-in-slow [animation-delay:0.5s] [animation-duration:1s] font-bold text-[#ff9c81]">
                    {cyclingTexts[currentTextIndex]?.text2}
                  </span>
                </h3>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <AuthFooter />
    </div>
  );
}
