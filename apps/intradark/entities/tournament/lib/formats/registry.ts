/**
 * Format-driver registry — slug → driver. Adding a format = implement a driver
 * and register it here. No schema change, no migration.
 * See docs/tournaments/plan.md §3.
 */
import { bracketDriver } from "./bracket";
import { ladderDriver } from "./ladder";
import { leagueDriver } from "./league";
import { queueDriver } from "./queue";
import type { FormatDriver } from "./types";

const REGISTRY: Record<string, FormatDriver> = {
  [ladderDriver.slug]: ladderDriver,
  [leagueDriver.slug]: leagueDriver,
  [bracketDriver.slug]: bracketDriver,
  [queueDriver.slug]: queueDriver,
};

export function getDriver(slug: string): FormatDriver | undefined {
  return REGISTRY[slug];
}

/** Throws if the slug is unknown — use where a driver is required. */
export function requireDriver(slug: string): FormatDriver {
  const driver = REGISTRY[slug];
  if (!driver) throw new Error(`Unknown competition format: ${slug}`);
  return driver;
}

export function listDrivers(): FormatDriver[] {
  return Object.values(REGISTRY);
}

export function isValidFormat(slug: string): boolean {
  return slug in REGISTRY;
}
