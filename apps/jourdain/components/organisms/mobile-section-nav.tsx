"use client";

import { usePathname, useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  activeSectionItem,
  resolveSectionNav,
} from "@/lib/nav/section-nav";

/**
 * Mobile-only replacement for a section's tab strip: the section name sits to
 * the left of a dropdown that switches between the section's pages. Shown in the
 * app header so the section header can drop out of the page on mobile.
 */
export function MobileSectionNav() {
  const pathname = usePathname();
  const router = useRouter();

  const section = resolveSectionNav(pathname);
  if (!section) return null;

  const active = activeSectionItem(section, pathname);
  const Icon = section.icon;

  return (
    <div className="flex min-w-0 items-center gap-2 md:hidden">
      <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold">
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
        {section.title}
      </span>
      <Select value={active?.href} onValueChange={(href) => router.push(href)}>
        <SelectTrigger
          aria-label={`${section.title} page`}
          className="h-8 min-w-0 max-w-[46vw] gap-1 truncate"
        >
          <SelectValue placeholder={section.title} />
        </SelectTrigger>
        <SelectContent>
          {section.items.map((item) => (
            <SelectItem key={item.href} value={item.href}>
              {item.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
