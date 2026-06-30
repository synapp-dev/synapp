import type { Metadata } from "next";

import { IntradarkSpinner } from "@/components/atoms/intradark-spinner";
import { ComingSoonContent } from "@/components/organisms/coming-soon-content";
import { createServerClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Intradark — Coming Soon",
  description: "Something is being built. Intradark is launching soon.",
  robots: { index: false, follow: false },
};

export default async function ComingSoonPage() {
  // Anyone with a session who still lands here is unauthorized — the middleware
  // sends authorized users straight to the app — so detecting a session is
  // enough to show the "signed in, awaiting access" state.
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let account: { displayName: string | null } | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle();
    account = { displayName: profile?.display_name ?? null };
  }

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-6 text-center">
      {/* Looping abstract background video (shared with the tournaments hero) */}
      <video
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      >
        <source src="/video/abstract-dots-blue.webm" type="video/webm" />
        <source src="/video/abstract-dots-blue.mp4" type="video/mp4" />
      </video>
      {/* Darken the video so the star and text stay legible */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-background/60"
      />

      {/* Massive spinning star, centered behind everything */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 grid place-items-center"
      >
        <IntradarkSpinner
          size={760}
          speed={0.18}
          faceColor="background"
          strokeColor="#ffffff"
          strokeOpacity={1}
          strokeWidth={2}
          className="max-w-none [mask-image:radial-gradient(closest-side,black,transparent)]"
        />
      </div>

      {/* Vignette to keep the centered text legible over the bright star core */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 z-[1] h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,var(--background)_35%,transparent)]"
      />

      <ComingSoonContent account={account} />
    </main>
  );
}
