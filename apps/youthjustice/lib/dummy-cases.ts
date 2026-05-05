export type DummyCase = {
  id: string;
  slug: string;
  displayName: string;
  subtitle: string;
  hasUnread?: boolean;
};

export const DUMMY_CASES: DummyCase[] = [
  {
    id: "1",
    slug: "rebecca-king",
    displayName: "Rebecca King",
    subtitle: "Youth Justice — Melbourne, VIC",
  },
  {
    id: "2",
    slug: "mia-fernandez",
    displayName: "Mia Fernandez",
    subtitle: "Youth Justice — Geelong, VIC",
    hasUnread: true,
  },
  {
    id: "3",
    slug: "liam-cartwright",
    displayName: "Liam Cartwright",
    subtitle: "Youth Justice — Ballarat, VIC",
  },
  {
    id: "4",
    slug: "chloe-rahman",
    displayName: "Chloe Rahman",
    subtitle: "Youth Justice — Bendigo, VIC",
    hasUnread: true,
  },
  {
    id: "5",
    slug: "isaac-delaney",
    displayName: "Isaac Delaney",
    subtitle: "Youth Justice — Shepparton, VIC",
  },
  {
    id: "6",
    slug: "ruby-mitchell",
    displayName: "Ruby Mitchell",
    subtitle: "Youth Justice — Mildura, VIC",
  },
  {
    id: "7",
    slug: "noah-byrne",
    displayName: "Noah Byrne",
    subtitle: "Youth Justice — Wodonga, VIC",
    hasUnread: true,
  },
  {
    id: "8",
    slug: "sienna-khan",
    displayName: "Sienna Khan",
    subtitle: "Youth Justice — Traralgon, VIC",
  },
  {
    id: "9",
    slug: "ethan-lowe",
    displayName: "Ethan Lowe",
    subtitle: "Youth Justice — Warrnambool, VIC",
  },
  {
    id: "10",
    slug: "amelia-grant",
    displayName: "Amelia Grant",
    subtitle: "Youth Justice — Horsham, VIC",
  },
  {
    id: "11",
    slug: "jackson-obrien",
    displayName: "Jackson O'Brien",
    subtitle: "Youth Justice — Echuca, VIC",
    hasUnread: true,
  },
  {
    id: "12",
    slug: "hannah-zhang",
    displayName: "Hannah Zhang",
    subtitle: "Youth Justice — Bairnsdale, VIC",
  },
  {
    id: "13",
    slug: "cooper-marsden",
    displayName: "Cooper Marsden",
    subtitle: "Youth Justice — Dandenong, VIC",
  },
  {
    id: "14",
    slug: "ella-james",
    displayName: "Ella James",
    subtitle: "Youth Justice — Frankston, VIC",
  },
  {
    id: "15",
    slug: "xavier-brown",
    displayName: "Xavier Brown",
    subtitle: "Youth Justice — Sunshine, VIC",
  },
  {
    id: "16",
    slug: "layla-singh",
    displayName: "Layla Singh",
    subtitle: "Youth Justice — Craigieburn, VIC",
    hasUnread: true,
  },
  {
    id: "17",
    slug: "nathaniel-ford",
    displayName: "Nathaniel Ford",
    subtitle: "Youth Justice — Broadmeadows, VIC",
  },
  {
    id: "18",
    slug: "zoe-hart",
    displayName: "Zoe Hart",
    subtitle: "Youth Justice — Ringwood, VIC",
  },
  {
    id: "19",
    slug: "aiden-ryan",
    displayName: "Aiden Ryan",
    subtitle: "Youth Justice — Melton, VIC",
  },
  {
    id: "20",
    slug: "isla-patel",
    displayName: "Isla Patel",
    subtitle: "Youth Justice — Werribee, VIC",
    hasUnread: true,
  },
  {
    id: "21",
    slug: "logan-chambers",
    displayName: "Logan Chambers",
    subtitle: "Youth Justice — Pakenham, VIC",
  },
  {
    id: "22",
    slug: "charlotte-reid",
    displayName: "Charlotte Reid",
    subtitle: "Youth Justice — Cranbourne, VIC",
  },
  {
    id: "23",
    slug: "ryan-mccarthy",
    displayName: "Ryan McCarthy",
    subtitle: "Youth Justice — Sale, VIC",
  },
  {
    id: "24",
    slug: "matilda-hughes",
    displayName: "Matilda Hughes",
    subtitle: "Youth Justice — Swan Hill, VIC",
    hasUnread: true,
  },
  {
    id: "25",
    slug: "finn-murphy",
    displayName: "Finn Murphy",
    subtitle: "Youth Justice — Colac, VIC",
  },
  {
    id: "26",
    slug: "grace-almeida",
    displayName: "Grace Almeida",
    subtitle: "Youth Justice — Morwell, VIC",
  },
  {
    id: "27",
    slug: "hudson-mason",
    displayName: "Hudson Mason",
    subtitle: "Youth Justice — Benalla, VIC",
  },
  {
    id: "28",
    slug: "evie-clarke",
    displayName: "Evie Clarke",
    subtitle: "Youth Justice — Ararat, VIC",
  },
  {
    id: "29",
    slug: "kye-nicholson",
    displayName: "Kye Nicholson",
    subtitle: "Youth Justice — Seymour, VIC",
    hasUnread: true,
  },
  {
    id: "30",
    slug: "jade-watson",
    displayName: "Jade Watson",
    subtitle: "Youth Justice — Castlemaine, VIC",
  },
];

export const DEFAULT_CASE_SLUG = DUMMY_CASES[0]!.slug;

export function getDummyCaseBySlug(slug: string): DummyCase | undefined {
  return DUMMY_CASES.find((c) => c.slug === slug);
}

export function isKnownCaseSlug(slug: string): boolean {
  return DUMMY_CASES.some((c) => c.slug === slug);
}

/** When switching cases, preserve the current section (e.g. correspondence → correspondence). */
export function buildCaseNavigationPath(pathname: string, newCaseSlug: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "cases" && segments.length >= 3) {
    const tail = segments.slice(2).join("/");
    return `/cases/${newCaseSlug}/${tail}`;
  }
  return `/cases/${newCaseSlug}/correspondence`;
}

/**
 * Case slug from URL when the user is in a case-scoped or message-thread route.
 * Callers should still validate with {@link isKnownCaseSlug} before trusting the value.
 */
export function getCaseSlugFromPathname(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "cases" && segments[1]) {
    return segments[1];
  }
  if (segments[0] === "messages" && segments[1]) {
    return segments[1];
  }
  return null;
}
