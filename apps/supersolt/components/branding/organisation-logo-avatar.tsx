"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

export const organisationLogoBoxClassName =
  "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card p-1.5 shadow-md";

export const organisationLogoBoxClassNameSm =
  "flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-card p-1 shadow-sm [&_img]:scale-[0.88]";

type OrganisationLogoAvatarProps = {
  logoUrl: string | null;
  fallbackIcon: LucideIcon;
  className?: string;
  fallbackClassName?: string;
};

export function OrganisationLogoAvatar({
  logoUrl,
  fallbackIcon: FallbackIcon,
  className,
  fallbackClassName = "h-4 w-4 text-muted-foreground",
}: OrganisationLogoAvatarProps) {
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [logoUrl]);

  const showLogo = Boolean(logoUrl && !hasImageError);

  return (
    <div className={className}>
      {showLogo ? (
        <Image
          src={logoUrl!}
          alt="Organisation logo"
          width={32}
          height={32}
          className="h-full w-full object-cover"
          unoptimized
          onError={() => setHasImageError(true)}
        />
      ) : (
        <FallbackIcon className={cn(fallbackClassName)} />
      )}
    </div>
  );
}
