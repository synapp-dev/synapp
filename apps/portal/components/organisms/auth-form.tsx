"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { EmailInput } from "@/components/molecules/email-input";
import { PasswordInput } from "@/components/molecules/password-input";
import { NameInput } from "@/components/molecules/name-input";
import { MobileInput } from "@/components/molecules/mobile-input";
import { SocialLoginGroup } from "@/components/molecules/social-login-group";
import { AuthDivider } from "@/components/atoms/auth-divider";
import { AuthFooter } from "@/components/molecules/auth-footer";
import { createBrowserClient } from "@/utils/supabase/client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type AuthMode = "login" | "signup";

export function AuthForm({ className, ...props }: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = (searchParams.get("mode") as AuthMode) || "login";
  const supabase = createBrowserClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(error.message);
          return;
        }

        router.push("/home");
      } else {
        // Validate passwords match
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          return;
        }

        // Validate required fields
        if (!firstName || !lastName) {
          setError("Please fill in all required fields");
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              mobile_number: mobile,
            },
          },
        });

        if (error) {
          setError(error.message);
          return;
        }

        // Show success message and redirect to login
        setError("Please check your email to confirm your account.");
        router.push("/auth?mode=login");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    const newMode = mode === "login" ? "signup" : "login";
    router.push(`/auth?mode=${newMode}`);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-6 transition-all duration-300",
        className
      )}
      {...props}
    >
      <Card className="overflow-hidden p-0 transition-all duration-300">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form onSubmit={handleSubmit} className="p-6 md:p-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">
                  {mode === "login" ? "Welcome back" : "Create an account"}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {mode === "login"
                    ? "Login to your synapp account"
                    : "Sign up for a new synapp account"}
                </p>
              </div>
              {error && (
                <div className="text-destructive text-sm text-center">
                  {error}
                </div>
              )}
              <EmailInput
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {mode === "signup" && (
                <>
                  <NameInput
                    firstName={firstName}
                    lastName={lastName}
                    onFirstNameChange={(e) => setFirstName(e.target.value)}
                    onLastNameChange={(e) => setLastName(e.target.value)}
                  />
                  <MobileInput
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                  />
                </>
              )}
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                forgot={mode === "login"}
                showPassword={showPassword}
                onToggleVisibility={() => setShowPassword(!showPassword)}
              />
              {mode === "signup" && (
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  confirm
                  showPassword={showPassword}
                  onToggleVisibility={() => setShowPassword(!showPassword)}
                />
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? mode === "login"
                    ? "Logging in..."
                    : "Signing up..."
                  : mode === "login"
                    ? "Login"
                    : "Get Started"}
              </Button>
              <AuthDivider />
              <SocialLoginGroup />
              <div className="text-center text-sm">
                {mode === "login" ? (
                  <>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={toggleMode}
                      className="underline underline-offset-4"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={toggleMode}
                      className="underline underline-offset-4"
                    >
                      Login
                    </button>
                  </>
                )}
              </div>
            </div>
          </form>
          <div className="relative bg-black hidden md:flex overflow-hidden items-center justify-center">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-3/5 object-cover"
            >
              <source
                src="https://qcpaanr39l6dixw3.public.blob.vercel-storage.com/auth-background-p0YIIr0nFGzm7B1XMIDUgOT1SA7WGv.mp4"
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>
          </div>
        </CardContent>
      </Card>
      <AuthFooter />
    </div>
  );
}
