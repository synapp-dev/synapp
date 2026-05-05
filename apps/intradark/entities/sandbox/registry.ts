export type SandboxChildMeta = {
  slug: string;
  title: string;
  description: string;
  href: string;
};

export const SANDBOX_CHILDREN: readonly SandboxChildMeta[] = [
  {
    slug: "pug-system",
    title: "PUG system",
    description:
      "Simulate queue → match found → accept → lobby (draft / Discord / veto / server) → result without real matchmaking.",
    href: "/admin/sandbox/pug-system",
  },
  {
    slug: "onboarding",
    title: "Onboarding",
    description:
      "Simulate Steam sign-in, account completion, dashboard, and Discord linking with fake profile states (no real OAuth).",
    href: "/admin/sandbox/onboarding",
  },
] as const;
