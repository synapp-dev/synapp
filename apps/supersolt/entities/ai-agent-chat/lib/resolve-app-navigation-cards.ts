import { APP_NAVIGATION_CATALOG } from "./app-navigation-catalog";
import type { AppNavigationDestinationKey } from "./app-navigation-catalog";
import { dedupeDestinationKeys } from "./app-navigation-tool-schema";
import type {
  AppNavigationCard,
  AppNavigationPeriod,
} from "./app-navigation-tool-schema";

export function buildInsightsPeriodQuery(period: AppNavigationPeriod): string {
  const params = new URLSearchParams();
  if (period.kind === "preset") {
    params.set("preset", period.preset);
  } else {
    params.set("preset", "custom");
    params.set("from", period.from);
    params.set("to", period.to);
  }
  return params.toString();
}

export function resolveAppNavigationCards(args: {
  organisationSlug: string;
  venueSlug: string;
  organisationName: string;
  venueName: string;
  destinationKeys: AppNavigationDestinationKey[];
  period?: AppNavigationPeriod;
}): AppNavigationCard[] {
  const keys = dedupeDestinationKeys(args.destinationKeys);
  const base = `/${args.organisationSlug}/${args.venueSlug}`;

  return keys.map((key) => {
    const entry = APP_NAVIGATION_CATALOG[key];
    let href = entry.globalHref ?? `${base}${entry.pathSuffix}`;
    if (args.period && entry.supportsInsightsPeriod && !entry.globalHref) {
      href = `${href}?${buildInsightsPeriodQuery(args.period)}`;
    }
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
