import Link from "next/link";
import { Lock } from "lucide-react";

import {
  type AdminNavItem,
  canAccessAdminItem,
} from "@/entities/admin/lib/admin-nav";
import { cn } from "@workspace/ui/lib/utils";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

/**
 * Grid of admin section cards. Accessible items link to their route; locked
 * ones render greyed-out and non-clickable. Shared by the `/admin` landing page
 * and each section index page so the card treatment stays consistent.
 */
export function AdminSectionCards({
  items,
  slugs,
}: {
  items: AdminNavItem[];
  slugs: readonly string[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const accessible = canAccessAdminItem(item, slugs);
        const Icon = item.icon;
        const card = (
          <Card
            className={cn(
              "h-full transition-colors",
              accessible ? "hover:border-primary/40" : "opacity-50",
            )}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Icon className="h-5 w-5" />
                {item.title}
                {accessible ? null : (
                  <Lock className="ml-auto h-4 w-4 text-muted-foreground" />
                )}
              </CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        );

        return accessible ? (
          <Link key={item.href} href={item.href} className="block">
            {card}
          </Link>
        ) : (
          <div
            key={item.href}
            aria-disabled
            title="You don't have access to this section"
          >
            {card}
          </div>
        );
      })}
    </div>
  );
}
