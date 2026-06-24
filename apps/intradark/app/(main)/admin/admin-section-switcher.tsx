"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  ChevronsUpDown,
  LayoutDashboard,
  Lock,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import {
  ADMIN_NAV_ITEMS,
  adminItemHrefs,
  canAccessAdminItem,
} from "@/entities/admin/lib/admin-nav";

type Section = {
  title: string;
  href: string;
  icon: LucideIcon;
  hrefs: string[];
  accessible: boolean;
};

/**
 * Section picker for the admin shell. Replaces the tab bar with a searchable
 * combobox (shadcn Popover + Command); sections the user can't access are
 * listed but disabled. Renders every admin section so the chrome is stable.
 */
export function AdminSectionSwitcher({ slugs }: { slugs: readonly string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const sections = React.useMemo<Section[]>(
    () => [
      {
        title: "Overview",
        href: "/admin",
        icon: LayoutDashboard,
        hrefs: ["/admin"],
        accessible: true,
      },
      ...ADMIN_NAV_ITEMS.map((item) => ({
        title: item.title,
        href: item.href,
        icon: item.icon,
        hrefs: adminItemHrefs(item),
        accessible: canAccessAdminItem(item, slugs),
      })),
    ],
    [slugs],
  );

  const matches = (href: string) =>
    href === "/admin"
      ? pathname === "/admin"
      : pathname === href || (pathname?.startsWith(`${href}/`) ?? false);

  const active =
    sections.find((s) => s.href !== "/admin" && s.hrefs.some(matches)) ??
    sections[0];

  const ActiveIcon = active?.icon ?? LayoutDashboard;

  const handleSelect = (section: Section) => {
    setOpen(false);
    if (section.accessible && section.href !== pathname) {
      router.push(section.href);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select admin section"
          className="w-full justify-between sm:w-72"
        >
          <span className="flex min-w-0 items-center gap-2">
            <ActiveIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{active?.title ?? "Admin"}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search sections..." />
          <CommandList>
            <CommandEmpty>No section found.</CommandEmpty>
            <CommandGroup>
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = section.href === active?.href;
                return (
                  <CommandItem
                    key={section.href}
                    value={section.title}
                    disabled={!section.accessible}
                    onSelect={() => handleSelect(section)}
                    className={cn(
                      "flex items-center gap-2",
                      !section.accessible && "opacity-50",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{section.title}</span>
                    {section.accessible ? (
                      isActive ? (
                        <span className="h-2 w-2 rounded-full bg-primary" />
                      ) : null
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
