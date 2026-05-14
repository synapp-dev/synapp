import { describe, expect, it } from "vitest";
import { LayoutDashboard, Newspaper, Trophy } from "lucide-react";
import {
  buildBreadcrumbTrail,
  formatSegment,
  formatUtilityMapSlugLabel,
} from "./main-nav-routes";

describe("formatSegment", () => {
  it("title-cases kebab-case", () => {
    expect(formatSegment("match-lab")).toBe("Match Lab");
    expect(formatSegment("foo")).toBe("Foo");
  });
});

describe("formatUtilityMapSlugLabel", () => {
  it("strips de_/cs_ prefixes and title-cases the map name", () => {
    expect(formatUtilityMapSlugLabel("de_mirage")).toBe("Mirage");
    expect(formatUtilityMapSlugLabel("cs_office")).toBe("Office");
  });

  it("handles multi-word map slugs and non-prefixed slugs", () => {
    expect(formatUtilityMapSlugLabel("de_ancient")).toBe("Ancient");
    expect(formatUtilityMapSlugLabel("custom_map_name")).toBe("Custom Map Name");
  });
});

describe("buildBreadcrumbTrail", () => {
  it("returns empty crumbs for root", () => {
    expect(buildBreadcrumbTrail("/")).toEqual({
      crumbs: [],
      segmentCount: 0,
    });
    expect(buildBreadcrumbTrail(null)).toEqual({
      crumbs: [],
      segmentCount: 0,
    });
  });

  it("builds /dashboard with one crumb and dashboard meta", () => {
    const { crumbs, segmentCount } = buildBreadcrumbTrail("/dashboard");
    expect(segmentCount).toBe(1);
    expect(crumbs).toHaveLength(1);
    expect(crumbs[0]).toMatchObject({
      href: "/dashboard",
      label: "Dashboard",
      iconOnlyDisplay: false,
    });
    expect(crumbs[0]?.icon).toBe(LayoutDashboard);
  });

  it("adds icon for first main slug on /news", () => {
    const { crumbs, segmentCount } = buildBreadcrumbTrail("/news");
    expect(segmentCount).toBe(1);
    expect(crumbs[0]?.icon).toBe(Newspaper);
    expect(crumbs[0]?.iconOnlyDisplay).toBe(false);
  });

  it("uses formatSegment for unknown segments", () => {
    const { crumbs } = buildBreadcrumbTrail("/unknown-segment");
    expect(crumbs[0]?.label).toBe("Unknown Segment");
    expect(crumbs[0]?.icon).toBeUndefined();
  });

  it("sets iconOnlyDisplay when segment count >= 4 for main-nav crumb", () => {
    const { crumbs, segmentCount } = buildBreadcrumbTrail(
      "/news/a/b/c",
    );
    expect(segmentCount).toBe(4);
    expect(crumbs[0]?.icon).toBe(Newspaper);
    expect(crumbs[0]?.iconOnlyDisplay).toBe(true);
    expect(crumbs[1]?.icon).toBeUndefined();
    expect(crumbs[1]?.iconOnlyDisplay).toBe(false);
  });

  it("keeps label on main crumb when segment count is 3", () => {
    const { crumbs, segmentCount } = buildBreadcrumbTrail("/news/a/b");
    expect(segmentCount).toBe(3);
    expect(crumbs[0]?.iconOnlyDisplay).toBe(false);
  });

  it("icons first main slug even when not first segment", () => {
    const { crumbs } = buildBreadcrumbTrail("/foo/news");
    expect(crumbs[0]?.icon).toBeUndefined();
    expect(crumbs[1]?.icon).toBe(Newspaper);
  });

  it("builds cumulative hrefs", () => {
    const { crumbs } = buildBreadcrumbTrail("/match/123/veto");
    expect(crumbs.map((c) => c.href)).toEqual([
      "/match",
      "/match/123",
      "/match/123/veto",
    ]);
    expect(crumbs[0]?.icon).toBe(Trophy);
  });

  it("formats utility map slugs after /utility", () => {
    const { crumbs } = buildBreadcrumbTrail("/utility/de_mirage");
    expect(crumbs.map((c) => c.label)).toEqual(["Utility", "Mirage"]);
    const office = buildBreadcrumbTrail("/utility/cs_office");
    expect(office.crumbs.map((c) => c.label)).toEqual(["Utility", "Office"]);
  });
});
