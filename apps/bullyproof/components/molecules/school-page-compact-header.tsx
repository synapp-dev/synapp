"use client";

import { useRef } from "react";
import Image from "next/image";
import { Skeleton } from "@workspace/ui/components/skeleton";

const ANIMATION_DELAYS = {
  card: "0ms",
  banner: "150ms",
  gradient: "400ms",
  avatar: "600ms",
  name: "700ms",
} as const;

export type SchoolPageCompactHeaderProps = {
  bannerUrl?: string | null;
  avatarUrl?: string | null;
  title: string;
  description?: string | null;
  isLoading?: boolean;
  onAnimationComplete?: () => void;
};

export function SchoolPageCompactHeader({
  bannerUrl,
  avatarUrl,
  title,
  description,
  isLoading = false,
  onAnimationComplete,
}: SchoolPageCompactHeaderProps) {
  const hasCalledCompleteRef = useRef(false);
  const hasDescription = !!description;
  const headerHeight = hasDescription ? "h-28" : "h-24";

  const handleAnimationEnd = () => {
    if (!hasCalledCompleteRef.current && onAnimationComplete) {
      hasCalledCompleteRef.current = true;
      onAnimationComplete();
    }
  };

  if (isLoading) {
    return (
      <div className={`relative rounded-lg overflow-hidden ${headerHeight} bg-muted`}>
        <div
          className="absolute inset-0 bg-gradient-to-t from-[var(--brand-bullyproof-primary)] via-[var(--brand-bullyproof-primary)]/50 to-transparent opacity-60"
          aria-hidden
        />
        <div className="relative h-full flex items-end gap-3 p-4">
          <Skeleton className="h-16 w-16 rounded-lg flex-shrink-0" />
          <div className="flex flex-col gap-1 mb-0.5">
            <Skeleton className="h-8 w-32" />
            {hasDescription && <Skeleton className="h-4 w-48" />}
          </div>
        </div>
      </div>
    );
  }

  const AvatarPlaceholder = () => (
    <div className="h-16 w-16 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
      <Image
        src="/images/bp-small-logo.svg"
        alt=""
        width={64}
        height={64}
        className="w-12 h-12 object-contain opacity-90"
      />
    </div>
  );

  return (
    <div
      className={`relative rounded-lg overflow-hidden ${headerHeight} opacity-0 animate-slide-down-fade-in ${bannerUrl ? "bg-transparent" : "bg-[var(--brand-bullyproof-primary)]"}`}
      style={{
        animationDelay: ANIMATION_DELAYS.card,
        animationFillMode: "forwards",
      }}
    >
      {bannerUrl && (
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0 opacity-0 [animation:var(--animate-banner-reveal)]"
            style={{
              backgroundImage: `url(${bannerUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              animationDelay: ANIMATION_DELAYS.banner,
              animationFillMode: "forwards",
            }}
            aria-hidden
          />
        </div>
      )}
      <div
        className="absolute inset-0 opacity-0 [animation:var(--animate-slide-up-from-bottom)]"
        style={{
          backgroundImage: `linear-gradient(to top, var(--brand-bullyproof-primary) 0%, color-mix(in srgb, var(--brand-bullyproof-primary) 75%, transparent) 50%, transparent 100%)`,
          animationDelay: ANIMATION_DELAYS.gradient,
          animationFillMode: "forwards",
        }}
        aria-hidden
      />
      <div className="relative h-full flex items-end gap-3 p-4">
        <div
          className="flex-shrink-0 opacity-0 animate-slide-up-fade-in"
          style={{
            animationDelay: ANIMATION_DELAYS.avatar,
            animationFillMode: "forwards",
          }}
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 rounded-lg object-contain"
            />
          ) : (
            <AvatarPlaceholder />
          )}
        </div>
        <div className="flex flex-col gap-0.5 min-w-0 flex-1 pb-0.5">
          <h1
            className="text-4xl font-bold text-white opacity-0 animate-slide-left-fade-in"
            style={{
              animationDelay: ANIMATION_DELAYS.name,
              animationFillMode: "forwards",
            }}
            onAnimationEnd={handleAnimationEnd}
          >
            {title}
          </h1>
          {description && (
            <p
              className="text-sm text-white/90 opacity-0 animate-slide-left-fade-in"
              style={{
                animationDelay: ANIMATION_DELAYS.name,
                animationFillMode: "forwards",
              }}
            >
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
