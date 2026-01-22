"use client";

import Image from "next/image";
import { Award } from "lucide-react";
import { Card } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import type { vUserProfileExpanded } from "@/drizzle/schema";
import { Badge } from "@workspace/ui/components/badge";

type UserProfile = typeof vUserProfileExpanded.$inferSelect;

interface TopicCertificateProps {
  user: UserProfile | null;
  completedAt: string | null | undefined;
  className?: string;
}

export function TopicCertificate({
  user,
  completedAt,
  className,
}: TopicCertificateProps) {
  if (!user || !completedAt) {
    return null;
  }

  // Split user's name into first and last name
  const firstName = user.firstName || (user.fullName ? user.fullName.split(" ")[0] : null) || "User";
  const lastName = user.lastName || (user.fullName ? user.fullName.split(" ").slice(1).join(" ") : null) || "";

  // Get user's position/role
  const position = 
    (user.schoolRoles && Array.isArray(user.schoolRoles) && user.schoolRoles.length > 0
      ? user.schoolRoles[0]?.roleName
      : null) ||
    (user.platformRoles && Array.isArray(user.platformRoles) && user.platformRoles.length > 0
      ? user.platformRoles[0]
      : null) ||
    null;

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

  // Format completion time for top left corner
  const completionTime = completedAt
    ? new Date(completedAt).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  return (
    <Card
      className={cn(
        "relative flex flex-row items-center justify-between gap-6 p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-2 border-blue-200 dark:border-blue-800 shadow-lg w-full",
        className
      )}
    >
      

      {/* Left side - User info */}
      <div className="flex flex-col justify-between flex-1 min-w-0 h-full">
        {/* Top: First Name */}
        <div className="flex flex-col gap-0">
          {completionDate && (
            <p className="text-sm font-normal text-muted-foreground">
              {completionDate}
            </p>
          )}
        </div>

        

        <div className="flex flex-col gap-0.5">
          <div className="flex flex-row gap-2 text-4xl">
           <p className="font-light text-foreground">
            {firstName}
          </p>
           {/* Bottom: Last Name */}
        {lastName && (
          <p className="font-black text-foreground">
            {lastName}
          </p>
        )}
        </div>
          <p className="text-md font-normal text-muted-foreground">
            Has successfully completed the <span className="font-bold">Amayda Program</span>
          </p>
        </div>

       
      </div>

      {/* Right side - Certificate info */}
      <div className="flex flex-col items-center justify-center gap-2 flex-shrink-0">
        {/* AP Logo */}
        <Image
          src="/images/ap-badge.svg"
          alt="AMAYDA Program Logo"
          width={96}
          height={96}
          className="shrink-0"
        />
        <Badge
          variant="default"
          className="text-md font-bold py-0.5 px-2 h-6 rounded-sm flex-shrink-0 bg-[var(--brand-bullyproof-secondary)] text-white"
        >
          AP Certified
        </Badge>
      </div>
    </Card>
  );
}
