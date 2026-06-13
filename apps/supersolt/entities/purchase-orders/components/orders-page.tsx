"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ClipboardList, ShoppingBag } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { OrderGuideTab } from "./order-guide-tab";
import { PurchaseOrdersTab } from "./purchase-orders-tab";

export type OrdersTab = "guide" | "purchase-orders";

type OrdersPageClientProps = {
  organisation: string;
  venue: string;
  initialTab?: OrdersTab;
};

const TABS: Array<{ id: OrdersTab; label: string; icon: typeof ShoppingBag }> = [
  { id: "guide", label: "Order guide", icon: ShoppingBag },
  { id: "purchase-orders", label: "Purchase orders", icon: ClipboardList },
];

function tabHref(pathname: string, tab: OrdersTab) {
  const params = new URLSearchParams();
  if (tab !== "guide") {
    params.set("tab", tab);
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function OrdersPageClientInner({
  organisation,
  venue,
  initialTab = "guide",
}: OrdersPageClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab");
  const activeTab: OrdersTab =
    tabParam === "purchase-orders" ? "purchase-orders" : initialTab;

  return (
    <section className="flex min-h-[calc(100vh-10rem)] flex-col gap-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-muted-foreground text-sm">
          Forecast-driven ordering and purchase order lifecycle for this venue.
        </p>
      </div>

      <nav
        className="bg-muted text-muted-foreground inline-flex w-fit max-w-full gap-1 rounded-lg p-1"
        aria-label="Orders sections"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={tabHref(pathname, tab.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border border-transparent px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm border-input dark:bg-input/30"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {activeTab === "guide" ? (
        <OrderGuideTab
          organisation={organisation}
          venue={venue}
          onPosCreated={(poIds) => {
            const params = new URLSearchParams({ tab: "purchase-orders" });
            if (poIds[0]) params.set("po", poIds[0]);
            router.push(`${pathname}?${params.toString()}`);
          }}
        />
      ) : (
        <PurchaseOrdersTab
          organisation={organisation}
          venue={venue}
          initialPoId={searchParams.get("po")}
        />
      )}
    </section>
  );
}

export function OrdersPageClient(props: OrdersPageClientProps) {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground text-sm" aria-busy="true">
          Loading orders…
        </div>
      }
    >
      <OrdersPageClientInner {...props} />
    </Suspense>
  );
}
