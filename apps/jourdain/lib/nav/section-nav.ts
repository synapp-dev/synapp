export type SectionNavItem = {
  title: string;
  href: string;
  match?: (p: string) => boolean;
};

export type SectionNav = {
  key: string;
  title: string;
  match: (p: string) => boolean;
  items: SectionNavItem[];
};

export const SECTION_NAVS: SectionNav[] = [
  {
    key: "gym",
    title: "Gym",
    match: (p) => p.startsWith("/health/gym"),
    items: [
      {
        title: "Progress",
        href: "/health/gym/progress",
        match: (p) => p.startsWith("/health/gym/progress"),
      },
      {
        title: "Today",
        href: "/health/gym",
        match: (p) => p === "/health/gym",
      },
      {
        title: "Schedule",
        href: "/health/gym/schedule",
        match: (p) => p.startsWith("/health/gym/schedule"),
      },
      {
        title: "Session",
        href: "/health/gym/session",
        match: (p) => p.startsWith("/health/gym/session"),
      },
      {
        title: "Programs",
        href: "/health/gym/programs",
        match: (p) => p.startsWith("/health/gym/programs"),
      },
      {
        title: "Exercises",
        href: "/health/gym/exercises",
        match: (p) => p.startsWith("/health/gym/exercises"),
      },
    ],
  },
  {
    key: "vitals",
    title: "Vitals",
    match: (p) => p.startsWith("/health/vitals"),
    items: [
      { title: "Body Composition", href: "/health/vitals/body-composition" },
      { title: "Cardiovascular", href: "/health/vitals/cardiovascular" },
      { title: "Respiratory", href: "/health/vitals/respiratory" },
      { title: "Temperature", href: "/health/vitals/temperature" },
      { title: "Metabolic", href: "/health/vitals/metabolic" },
    ],
  },
];

export function resolveSectionNav(pathname: string): SectionNav | null {
  return SECTION_NAVS.find((nav) => nav.match(pathname)) ?? null;
}

export function activeSectionItem(
  nav: SectionNav,
  pathname: string,
): SectionNavItem | null {
  return (
    nav.items.find((item) =>
      (item.match ?? ((p) => p === item.href))(pathname),
    ) ?? null
  );
}
