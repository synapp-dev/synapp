"use client";

import Image from "next/image";
import { useState } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";

import { IntradarkSymbolDraw } from "@/components/atoms/intradark-symbol-draw";
import { IntradarkWordmarkDraw } from "@/components/atoms/intradark-wordmark-draw";
import { LoadingDots } from "@/components/atoms/loading-dots";
import { StreamText } from "@/components/atoms/stream-text";
import Link from "next/link";

// Streaming-text timing. "we're " streams first, then "building" picks up
// seamlessly, then the looping dots start the instant "building" lands.
const TEXT_START = 2400;
const CHAR = 55;
const FADE = 300;
const WERE = "we're ";
const BUILDING = "building";
const BUILDING_START = TEXT_START + WERE.length * CHAR;
const DOTS_START = BUILDING_START + (BUILDING.length - 1) * CHAR + FADE;

export interface ComingSoonContentProps {
  /**
   * The signed-in user, if any. Anyone signed in who still reaches this page is
   * unauthorized by definition — the middleware redirects authorized users
   * straight to the app — so a non-null value means "signed in, awaiting access".
   */
  account: { displayName: string | null } | null;
}

export function ComingSoonContent({ account }: ComingSoonContentProps) {
  // Surface the access state immediately for signed-in users; otherwise the
  // star toggles the Steam sign-in.
  const [revealed, setRevealed] = useState(account !== null);

  return (
    <div className="relative z-10 flex flex-col items-center gap-8">
      <style>{`
        @keyframes cs-card-in {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to { opacity: 1; transform: none; }
        }
      `}</style>

      <div className="flex flex-col items-end gap-2">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-expanded={revealed}
            aria-label={account ? "Show account status" : "Show early access sign-in"}
            className="rounded-md outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-[var(--brand-intradark-primary)]"
          >
            <IntradarkSymbolDraw className="h-auto w-8" />
          </button>
          <IntradarkWordmarkDraw className="h-auto w-90" />
        </div>

        <h1 className="text-balance text-2xl tracking-tight drop-shadow-[0_2px_24px_rgba(0,0,0,0.6)] sm:text-3xl">
          <StreamText
            text={WERE}
            startDelay={TEXT_START}
            charDelay={CHAR}
            className="font-light text-foreground"
          />
          <StreamText
            text={BUILDING}
            startDelay={BUILDING_START}
            charDelay={CHAR}
            className="font-semibold text-[var(--brand-intradark-primary)]"
          />
          <LoadingDots
            startDelay={DOTS_START}
            className="font-semibold text-[var(--brand-intradark-primary)]"
          />
        </h1>
      </div>

      {revealed &&
        (account ? (
          <Alert className="max-w-xs animate-slide-up-fade-in bg-card/80 text-left backdrop-blur-sm">
            <AlertTitle>You don&apos;t have access yet</AlertTitle>
            <AlertDescription className="text-sm">
              <p>
                Signed in as{" "}
                <span className="font-medium text-foreground">
                  {account.displayName ?? "your Steam account"}
                </span>
                . Stay posted — we&apos;ll let you in soon.
              </p>
              <a
                href="/api/auth/signout"
                className="mt-2 inline-flex items-center text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Sign out
              </a>
            </AlertDescription>
          </Alert>
        ) : (
          <Link
            href="/api/auth/steam"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-steam)] px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 animate-slide-up-fade-in"
          >
            <Image
              src="/images/logos/steam-logo-white.svg"
              alt=""
              width={20}
              height={20}
              className="h-auto w-5"
            />
            Steam
          </Link>
        ))}
    </div>
  );
}
