"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

type OrganisationLogoAvatarProps = {
  logoUrl: string | null;
  fallbackIcon: LucideIcon;
  className?: string;
  fallbackClassName?: string;
};

/**
 * Renders an organisation's logo, falling back to an icon if there is no logo
 * or the image fails to load. Uses `unoptimized` so any remote storage URL
 * works without configuring Next image domains.
 */
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
