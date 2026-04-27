"use client";

import { School } from "lucide-react";
import { StorageImage } from "@/components/atoms/storage-image";
import { cn } from "@workspace/ui/lib/utils";

export type SchoolAvatarLike = {
  name?: string | null;
  avatarUrl?: string | null;
};

/** Teal school glyph when there is no uploaded logo (matches sidebar school switcher). */
export function SchoolIconBadge({ size = "md" }: { size?: "sm" | "md" }) {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const containerSize = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  return (
    <div
      className={cn(
        containerSize,
        "flex aspect-square shrink-0 items-center justify-center rounded",
      )}
      style={{ backgroundColor: "#008993" }}
    >
      <School className={cn(iconSize, "text-background")} />
    </div>
  );
}

/** Avatar from storage when URL exists; otherwise the teal school badge. */
export function SchoolAvatarOrBadge({
  school,
  size = "md",
}: {
  school: SchoolAvatarLike | null;
  size?: "sm" | "md";
}) {
  const avatarUrl = school?.avatarUrl ?? null;

  if (avatarUrl) {
    const widthPx = size === "sm" ? 22 : 29;
    const widthClass = size === "sm" ? "w-5" : "w-7";
    return (
      <div className={cn(widthClass, "flex shrink-0")}>
        <StorageImage
          src={avatarUrl}
          alt={school?.name || "School"}
          width={widthPx}
          height={widthPx}
          className="h-auto w-full rounded object-contain"
          style={{ width: widthPx, height: "auto" }}
        />
      </div>
    );
  }

  return <SchoolIconBadge size={size} />;
}
