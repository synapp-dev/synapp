import { APP_NAVIGATION_CATALOG } from "./app-navigation-catalog";
import type { AppNavigationDestinationKey } from "./app-navigation-catalog";
import { dedupeDestinationKeys } from "./app-navigation-tool-schema";
import type { AppNavigationCard } from "./app-navigation-tool-schema";

export function resolveAppNavigationCards(args: {
  organisationSlug: string;
  venueSlug: string;
  organisationName: string;
  venueName: string;
  destinationKeys: AppNavigationDestinationKey[];
}): AppNavigationCard[] {
  const keys = dedupeDestinationKeys(args.destinationKeys);
  const base = `/${args.organisationSlug}/${args.venueSlug}`;

  return keys.map((key) => {
    const entry = APP_NAVIGATION_CATALOG[key];
    const href = `${base}${entry.pathSuffix}`;
    return {
      title: entry.title,
      ...(entry.description ? { description: entry.description } : {}),
      href,
      destinationKey: key,
      organisationName: args.organisationName,
      venueName: args.venueName,
    };
  });
}
