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

export function MobileSectionNav() {
  const pathname = usePathname();
  const router = useRouter();

  const section = resolveSectionNav(pathname);
  if (!section) return null;

  const active = activeSectionItem(section, pathname);

  return (
    <div className="md:hidden">
      <Select
        value={active?.href}
        onValueChange={(href) => router.push(href)}
      >
        <SelectTrigger
          aria-label={`${section.title} section navigation`}
          className="h-9 max-w-[60vw] truncate"
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
