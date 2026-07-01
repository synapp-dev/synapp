import type { Metadata } from "next";

import { WelcomeReel } from "@/components/organisms/welcome/welcome-reel";
import { createServerClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Intradark — Welcome",
  description: "You're in. A guided boot sequence through the Intradark platform.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * First-run onboarding reel. Full-bleed by design — it deliberately lives
 * outside the (main) sidebar shell so the cinematic hero can take the whole
 * viewport, exactly like /coming-soon. Greets the signed-in operator by their
 * Steam display name.
 */
export default async function WelcomePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let persona = "operator";
  let personaAvatar: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("display_name, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();
    const name = profile?.display_name?.trim();
    if (name) persona = name;
    personaAvatar = profile?.avatar_url ?? null;
  }

  return <WelcomeReel persona={persona} personaAvatar={personaAvatar} />;
}
