import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { IntradarkSpinner } from "@/components/atoms/intradark-spinner";

export const metadata: Metadata = {
  title: "Intradark — Coming Soon",
  description: "Something is being built. Intradark is launching soon.",
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-6 text-center">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[60vmax] w-[60vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]"
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

      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="flex items-start gap-2 w-full justify-center">
          <Image
            src="/images/logos/intradark-symbol-blue.svg"
            alt="Intradark Logo"
            width={20}
            height={20}
            className="h-auto w-10 mb-12"
          />
          <Image
            src="/images/logos/intradark-wordmark-white.svg"
            alt="Intradark Logo"
            width={100}
            height={20}
            className="h-auto w-90"
          />
        </div>

        <div className="flex flex-col items-center gap-3">
          <h1 className="max-w-md text-balance text-2xl font-semibold tracking-tight text-foreground drop-shadow-[0_2px_24px_rgba(0,0,0,0.6)] sm:text-3xl">
            we&apos;re building...
          </h1>
          <p className="max-w-sm text-balance text-sm text-muted-foreground drop-shadow-[0_2px_16px_rgba(0,0,0,0.6)]">
            If you have early access, sign in through Steam below.
          </p>
        </div>

        <Link
          href="/auth"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground/70 underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          <Image
            src="/images/logos/steam-logo-white.svg"
            alt="Steam"
            width={20}
            height={20}
            className="h-auto w-5"
          />
          Sign In
        </Link>
      </div>
    </main>
  );
}
