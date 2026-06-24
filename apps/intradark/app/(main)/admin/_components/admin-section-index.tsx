import { ADMIN_NAV_ITEMS } from "@/entities/admin/lib/admin-nav";

import { AdminSectionCards } from "./admin-section-cards";

/**
 * Landing body for a parent admin section (e.g. DevTools, Utility). Pulls the
 * header (title/icon/description) and child cards from {@link ADMIN_NAV_ITEMS}
 * by `href`, so the section page stays in sync with the tab bar and registry.
 */
export function AdminSectionIndex({
  href,
  slugs,
}: {
  href: string;
  slugs: readonly string[];
}) {
  const item = ADMIN_NAV_ITEMS.find((i) => i.href === href);
  if (!item) return null;
  const Icon = item.icon;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Icon className="h-7 w-7" />
          {item.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
      </div>

      <AdminSectionCards items={item.children ?? []} slugs={slugs} />
    </div>
  );
}
