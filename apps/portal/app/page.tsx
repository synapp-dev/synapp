"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";

export default function Home() {
  const [step, setStep] = useState<"hello" | "redirect">("hello");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createBrowserClient();
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setLoading(false);
    };
    checkUser();
  }, []);

  useEffect(() => {
    if (!loading) {
      const helloTimeout = setTimeout(() => setStep("redirect"), 1200);
      const redirectTimeout = setTimeout(() => {
        if (user) {
          router.replace("/home");
        } else {
          router.replace("/auth");
        }
      }, 2600);
      return () => {
        clearTimeout(helloTimeout);
        clearTimeout(redirectTimeout);
      };
    }
  }, [loading, user, router]);

  // Animation classes
  const fadeClass = (show: boolean) =>
    `transition-opacity duration-700 ${show ? "opacity-100" : "opacity-0"}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="flex flex-col items-center justify-center gap-8">
        <div className="rounded-lg overflow-hidden shadow-lg w-[320px] h-[180px] bg-black flex items-center justify-center">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          >
            <source
              src="https://qcpaanr39l6dixw3.public.blob.vercel-storage.com/auth-background-p0YIIr0nFGzm7B1XMIDUgOT1SA7WGv.mp4"
              type="video/mp4"
            />
            Your browser does not support the video tag.
          </video>
        </div>
        <div className="relative h-16 w-72 flex items-center justify-center">
          {/* Hello text */}
          <span
            className={`absolute left-0 right-0 text-white text-2xl font-semibold text-center ${fadeClass(
              step === "hello"
            )}`}
          >
            {loading
              ? "Checking..."
              : user
                ? `Hello, ${user.user_metadata?.first_name || user.email || "user"}`
                : "Hello, guest"}
          </span>
          {/* Redirect text */}
          <span
            className={`absolute left-0 right-0 text-white text-2xl font-semibold text-center ${fadeClass(
              step === "redirect"
            )}`}
          >
            {user ? "Taking you home..." : "Taking you to login..."}
          </span>
        </div>
      </div>
    </div>
  );
}
