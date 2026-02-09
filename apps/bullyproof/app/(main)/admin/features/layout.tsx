"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getSectionByKey } from "@/lib/feature-sections";

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Parse route segments: /admin/features or /admin/features/[section]
  const segments = pathname.split("/").filter(Boolean);
  // segments: ["admin", "features"] or ["admin", "features", "admin"]
  const sectionSlug = segments.length > 2 ? segments[2] : null;
  const section = sectionSlug ? getSectionByKey(sectionSlug) : null;

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      {section && (
        <div className="border-b px-6 py-3 flex items-center gap-2 text-sm">
          <Link
            href="/admin/features"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            {(() => {
              const Icon = section.icon;
              return <Icon className="h-4 w-4 text-muted-foreground" />;
            })()}
            <span className="font-medium">{section.label}</span>
          </div>
        </div>
      )}

      {/* Content */}
      {children}
    </div>
  );
}
