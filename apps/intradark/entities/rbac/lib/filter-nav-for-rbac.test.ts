import { describe, expect, it } from "vitest";

import { Play } from "lucide-react";

import type { NavMainSidebarItem } from "@/lib/main-nav-routes";

import { NAV_ANONYMOUS_SLUGS, NAV_SLUG } from "./nav-slugs";
import { applyNavRbacToItems } from "./filter-nav-for-rbac";

describe("applyNavRbacToItems", () => {
  it("keeps public nav for anonymous slugs", () => {
    const items: NavMainSidebarItem[] = [
      { title: "News", url: "/news" },
    ];
    const out = applyNavRbacToItems(items, NAV_ANONYMOUS_SLUGS);
    expect(out).toHaveLength(1);
  });

  it("drops dashboard without slug", () => {
    const items: NavMainSidebarItem[] = [
      { title: "Dashboard", url: "/dashboard" },
    ];
    const out = applyNavRbacToItems(items, NAV_ANONYMOUS_SLUGS);
    expect(out).toHaveLength(0);
  });

  it("disables Play without developer", () => {
    const items: NavMainSidebarItem[] = [
      { title: "Play", url: "/play", icon: Play, exact: true },
    ];
    const out = applyNavRbacToItems(items, NAV_ANONYMOUS_SLUGS);
    expect(out).toHaveLength(1);
    expect(out[0]?.disabled).toBe(true);
  });

  it("enables Play with dashboard slug replaced by developer", () => {
    const items: NavMainSidebarItem[] = [
      { title: "Play", url: "/play", icon: Play, exact: true },
    ];
    const out = applyNavRbacToItems(items, ["developer"]);
    expect(out[0]?.disabled).toBe(false);
  });

  it("shows dashboard with nav.dashboard", () => {
    const items: NavMainSidebarItem[] = [
      { title: "Dashboard", url: "/dashboard" },
    ];
    const out = applyNavRbacToItems(items, [NAV_SLUG.DASHBOARD]);
    expect(out).toHaveLength(1);
  });
});
