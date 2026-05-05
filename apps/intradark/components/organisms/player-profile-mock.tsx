"use client";

import Image from "next/image";
import Link from "next/link";
import { BA } from "country-flag-icons/react/3x2";
import { Instagram, Send } from "lucide-react";

import { GoldVerifiedBadge } from "@/components/atoms/gold-verified-badge";
import { cn } from "@workspace/ui/lib/utils";
import { PlayerProfileTabs } from "@/components/organisms/player-profile-tabs";
import { Separator } from "@workspace/ui/components/separator";

import { FaceitElo } from "./faceit-elo";
import { PremierEloBadge } from "../atoms/premier-elo-badge";

const MOCK = {
  handle: "NiKo",
  displayName: "Nikola Kovač",
  role: "Rifler",
  roleIconSrc: "/images/icons/ak47-icon-white.svg",
  teamName: "Falcons",
  teamLogoSrc: "/images/teams/falcons-logo.png",
  quote:
    "One of the most decorated riflers in Counter-Strike, known for crisp mechanics, relentless entry impact, and a decade of elite tier-one play. A cornerstone piece wherever he competes, with a highlight reel that could fill a stadium screen.",
  attribution: {
    name: "Intradark · demo profile",
    date: "April 2026",
    avatarSrc: "/images/players/niko-headshot.png",
  },
  portraitSrc: "/images/players/niko-headshot.png",
  social: [
    { label: "Twitch", href: "#", icon: "twitch" as const },
    { label: "X", href: "#", icon: "x" as const },
    { label: "Instagram", href: "#", icon: "instagram" as const },
    { label: "Telegram", href: "#", icon: "send" as const },
  ],
} satisfies Record<string, unknown>;

function TwitchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function SocialIcon({
  kind,
  className,
}: {
  kind: "twitch" | "x" | "instagram" | "send";
  className?: string;
}) {
  const iconClass = className ?? "size-5";
  switch (kind) {
    case "twitch":
      return <TwitchIcon className={iconClass} />;
    case "x":
      return <XIcon className={iconClass} />;
    case "instagram":
      return <Instagram className={iconClass} aria-hidden />;
    case "send":
      return <Send className={iconClass} aria-hidden />;
  }
}

export type PlayerProfileMockProps = {
  /** Route param; reserved for wiring real player data. */
  playerId: string;
};

export function PlayerProfileMock({ playerId }: PlayerProfileMockProps) {
  return (
    <>
      <header className="relative z-[1] mx-auto w-full max-w-md overflow-hidden rounded-2xl bg-transparent lg:mx-0 lg:max-w-none">
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[rgba(6,52,38,0.78)] via-[rgba(6,52,38,0.08)] to-transparent"
          aria-hidden
        />
        <div className="relative z-[2] flex w-full min-w-0 flex-row items-stretch">
          <div className="relative flex shrink-0 self-stretch pl-3 sm:pl-4 md:pl-5">
            <div
              className="pointer-events-none absolute bottom-0 left-0 top-0 z-0 w-[min(200%,22rem)] -translate-x-[32%] sm:w-[min(190%,24rem)] sm:-translate-x-[28%] md:w-[min(175%,26rem)] md:-translate-x-[24%] lg:w-[min(160%,28rem)] lg:-translate-x-[20%]"
              aria-hidden
              style={{
                WebkitMaskImage:
                  "linear-gradient(to bottom, #000 0%, #000 12%, rgba(0,0,0,0.75) 38%, rgba(0,0,0,0.25) 68%, transparent 100%)",
                maskImage:
                  "linear-gradient(to bottom, #000 0%, #000 12%, rgba(0,0,0,0.75) 38%, rgba(0,0,0,0.25) 68%, transparent 100%)",
                WebkitMaskSize: "100% 100%",
                maskSize: "100% 100%",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
              }}
            >
              <Image
                src={MOCK.teamLogoSrc}
                alt=""
                fill
                className="object-contain object-left opacity-[0.5]"
                sizes="(max-width: 640px) 320px, (max-width: 1024px) 384px, 448px"
              />
            </div>
            <div className="relative z-[2] h-full min-h-[220px] w-[7.75rem] shrink-0 overflow-hidden sm:w-36 md:w-44 lg:w-52">
              <Image
                src={MOCK.portraitSrc}
                alt="NiKo — Nikola Kovač"
                fill
                className="object-cover object-top"
                sizes="(max-width: 640px) 124px, (max-width: 1024px) 176px, 208px"
                priority
              />
            </div>
          </div>

          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-5 p-6 pb-16 md:flex-row md:items-stretch md:gap-6 md:pb-6">
            <div className="flex w-full min-w-0 flex-1 flex-col justify-end gap-2">
              <div>
                <div className="flex min-w-0 flex-wrap items-start gap-2">
                  <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                    {MOCK.handle}
                  </h1>
                  <GoldVerifiedBadge />
                </div>
                <p
                  className="inline-flex items-center gap-2 text-sm text-white/75 sm:text-base"
                  aria-label={`${MOCK.displayName}, Bosnia and Herzegovina`}
                >
                  <BA
                    title="Bosnia and Herzegovina"
                    className="h-3 w-auto ring-1 ring-white/20"
                    aria-hidden
                  />
                  <span>{MOCK.displayName}</span>
                </p>
              </div>
              <Separator className="my-0.5 w-1/3 max-w-1/12 bg-white/10" />
              <div className="flex flex-row flex-wrap items-center gap-x-3 text-sm font-medium text-white/90">
                <div className="inline-flex items-center gap-1.5">
                  <Image
                    src={MOCK.roleIconSrc}
                    alt=""
                    width={28}
                    height={16}
                    className="h-auto w-8 shrink-0 object-contain sm:h-[1.125rem]"
                    aria-hidden
                  />
                  <p className="text-sm text-white/90 font-light">
                    {MOCK.role}
                  </p>
                </div>
                <p className="text-xs leading-none text-primary/50">@</p>
                <div className="inline-flex items-center gap-1.5">
                  <Image
                    src={MOCK.teamLogoSrc}
                    alt={`${MOCK.teamName} logo`}
                    width={40}
                    height={16}
                    className="h-5 w-auto shrink-0 object-contain"
                  />
                  <p className="text-emerald-300 text-sm font-semibold">
                    {MOCK.teamName}
                  </p>
                </div>
              </div>
              <Separator className="my-0.5 w-1/3 max-w-1/12 bg-white/10" />
              <div className="flex flex-row items-start gap-y-3 gap-x-3 text-sm font-medium text-white/90">
                <div className="mb-1">
                  <PremierEloBadge rank={32000} size="sm" />
                </div>
                <div className="mt-0.5">
                  <FaceitElo />
                </div>
              </div>
            </div>

            <div
              className={cn(
                "flex w-full min-w-0 flex-col gap-3 border-t border-white/10 pt-4 md:ml-auto md:w-auto md:max-w-sm md:border-t-0 md:border-l md:border-white/10 md:pt-0 md:pl-6 lg:max-w-md lg:pl-8",
                "md:items-end md:justify-center md:text-right",
              )}
            >
              <blockquote className="relative text-pretty">
                <span
                  className="pointer-events-none absolute -left-0.5 -top-1 font-serif text-3xl leading-none text-white/20 md:-right-1 md:left-auto md:text-4xl"
                  aria-hidden
                >
                  &ldquo;
                </span>
                <p className="pl-4 text-sm italic leading-relaxed text-white/80 md:pl-0 md:text-base">
                  {MOCK.quote}
                </p>
                <span
                  className="pointer-events-none mt-1 block text-right font-serif text-3xl leading-none text-white/20 md:text-4xl"
                  aria-hidden
                >
                  &rdquo;
                </span>
              </blockquote>
              <footer className="flex items-center gap-2.5 max-md:justify-start md:ml-auto md:justify-end">
                <p className="text-left text-xs text-white/60 sm:text-sm md:text-right">
                  <span className="font-medium text-white/85">
                    {MOCK.attribution.name}
                  </span>
                  <span className="text-white/35"> · </span>
                  <span>{MOCK.attribution.date}</span>
                </p>
                <div className="relative size-8 shrink-0 overflow-hidden rounded-full ring-2 ring-white/20">
                  <Image
                    src={MOCK.attribution.avatarSrc}
                    alt=""
                    fill
                    className="object-cover object-top"
                    sizes="32px"
                  />
                </div>
              </footer>
            </div>

            <nav
              className="absolute bottom-4 right-4 z-[3] flex flex-row flex-wrap items-center justify-end gap-1 sm:bottom-5 sm:right-5 sm:gap-1.5 md:bottom-6 md:right-6"
              aria-label="Social links"
            >
              {MOCK.social.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  className="flex size-8 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-emerald-200 sm:size-9"
                >
                  <span className="sr-only">{s.label}</span>
                  <SocialIcon
                    kind={s.icon}
                    className="size-4 sm:size-[1.125rem]"
                  />
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <PlayerProfileTabs playerId={playerId} className="mt-5 lg:mt-6" />
    </>
  );
}
