import "server-only";

import { createRequire } from "node:module";

/**
 * Shared access to the native CS2 demo parser (@laihoe/demoparser2). It's a CJS
 * N-API addon listed in `serverExternalPackages`, so we `require` it at runtime
 * rather than letting Next bundle the `.node` binary. Imported by both the
 * insight registry and the radar-replay builder.
 */
const require = createRequire(import.meta.url);

export type EventRow = Record<string, unknown> & { event_name?: string; tick?: number };

export type DemoParser = {
  parseHeader: (path: string) => Record<string, unknown>;
  parsePlayerInfo: (path: string) => Array<Record<string, unknown>>;
  listGameEvents: (path: string) => string[];
  parseEvent: (
    path: string,
    event: string,
    playerExtra?: string[],
    otherExtra?: string[],
  ) => EventRow[];
  parseEvents: (
    path: string,
    events: string[],
    playerExtra?: string[],
    otherExtra?: string[],
  ) => EventRow[];
  parseTicks: (
    path: string,
    wantedProps: string[],
    wantedTicks?: number[],
  ) => Array<Record<string, unknown>>;
  parseGrenades: (path: string) => Array<Record<string, unknown>>;
};

export const dp = require("@laihoe/demoparser2") as DemoParser;
