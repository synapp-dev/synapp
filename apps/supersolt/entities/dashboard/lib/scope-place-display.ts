/** Title-case words in a URL slug for display when real names are not loaded yet. */
export function formatSlugAsDisplayName(slug: string): string {
  return slug
    .split("-")
    .map((word) =>
      word.length === 0 ? "" : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

/**
 * If a venue name starts with the organisation name (e.g. "Piccolo Panini Bar
 * Hawthorn" for org "Piccolo Panini Bar"), strip the org prefix so the line
 * reads `Org · Hawthorn` instead of repeating the org in the venue segment.
 */
export function cleanVenueNameAgainstOrganisation(
  venueName: string,
  organisationName: string,
): string {
  const v = venueName.trim();
  const o = organisationName.trim();
  if (!o) {
    return v;
  }
  if (v.toLowerCase() === o.toLowerCase()) {
    return v;
  }
  if (v.toLowerCase().startsWith(o.toLowerCase())) {
    const rest = v.slice(o.length).replace(/^[\s\-·,:|]+/, "").trim();
    if (rest.length > 0) {
      return rest;
    }
  }
  return v;
}
