"use client";

import Image from "next/image";
import { Card } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import type { vUserProfileExpanded } from "@/drizzle/schema";
import { Badge } from "@workspace/ui/components/badge";

type UserProfile = typeof vUserProfileExpanded.$inferSelect;

interface TopicCertificateProps {
  user: UserProfile | null;
  completedAt: string | null | undefined;
  className?: string;
  compact?: boolean;
}

export function TopicCertificate({
  user,
  completedAt,
  className,
  compact = false,
}: TopicCertificateProps) {
  if (!user || !completedAt) {
    return null;
  }

  // Split user's name into first and last name
  const firstName = user.firstName || (user.fullName ? user.fullName.split(" ")[0] : null) || "User";
  const lastName = user.lastName || (user.fullName ? user.fullName.split(" ").slice(1).join(" ") : null) || "";

  // Format completion date as "digit number Month, year" (e.g., "15 January 2024")
  const completionDate = completedAt
    ? (() => {
        const date = new Date(completedAt);
        const day = date.getDate();
        const month = date.toLocaleDateString(undefined, { month: "long" });
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
      })()
    : null;

  return (
    <Card
      className={cn(
        "relative flex flex-row items-center justify-between w-full border-2 shadow-lg",
        compact ? "gap-4 p-4" : "gap-6 p-6",
        "bg-gradient-to-br from-[color:var(--brand-bullyproof-primary)]/10 to-[color:var(--brand-bullyproof-primary)]/5 dark:from-[color:var(--brand-bullyproof-primary)]/20 dark:to-[color:var(--brand-bullyproof-primary)]/10",
        "border-[color:var(--brand-bullyproof-primary)]/30 dark:border-[color:var(--brand-bullyproof-primary)]/40",
        className
      )}
    >
      {/* Left side - User info: date top-left, name and completion below */}
      <div className="flex flex-col items-start justify-start gap-1 flex-1 min-w-0 text-left">
        {completionDate && (
          <p className={cn("font-normal text-muted-foreground", compact ? "text-xs" : "text-sm")}>
            {completionDate}
          </p>
        )}
        <div className={cn("flex flex-col", compact ? "gap-0" : "gap-0.5")}>
          <div className={cn("flex flex-row gap-2", compact ? "text-xl" : "text-4xl")}>
            <p className="font-light text-foreground">{firstName}</p>
            {lastName && (
              <p className="font-black text-foreground">{lastName}</p>
            )}
          </div>
          <p className={cn("font-normal text-muted-foreground", compact ? "text-xs" : "text-md")}>
            Has successfully completed the <span className="font-bold">Amayda Program</span>
          </p>
        </div>
      </div>

      {/* Right side - Certificate info */}
      <div className="flex flex-col items-center justify-center gap-1 flex-shrink-0">
        <Image
          src="/images/ap-badge.svg"
          alt="AMAYDA Program Logo"
          width={compact ? 48 : 96}
          height={compact ? 48 : 96}
          className="shrink-0"
        />
        <Badge
          variant="default"
          className={cn(
            "font-bold rounded-sm flex-shrink-0 bg-[var(--brand-bullyproof-secondary)] text-white",
            compact ? "text-xs py-0.5 px-1.5 h-5" : "text-md py-0.5 px-2 h-6"
          )}
        >
          AP Certified
        </Badge>
      </div>
    </Card>
  );
}
