import { Construction } from "lucide-react";

import { ADMIN_NAV_ITEMS } from "@/entities/admin/lib/admin-nav";

/**
 * Placeholder body for a per-module admin section. Title, icon, and blurb come
 * from {@link ADMIN_NAV_ITEMS} (keyed by `href`) so the page header, the tab
 * bar, and the `/admin` landing card all stay in sync from one source.
 */
export function AdminModulePlaceholder({ href }: { href: string }) {
  const item = ADMIN_NAV_ITEMS.find((i) => i.href === href);
  const Icon = item?.icon ?? Construction;
  const title = item?.title ?? "Admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Icon className="h-7 w-7" />
          {title}
        </h1>
        {item?.description ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {item.description}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-20 text-center">
        <Construction className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Coming soon</p>
        <p className="max-w-md text-xs text-muted-foreground">
          This admin module is a placeholder. Tools for managing{" "}
          {title.toLowerCase()} will live here.
        </p>
      </div>
    </div>
  );
}
