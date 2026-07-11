/**
 * One-shot verification for the consumption engine: finalizes a single
 * closed venue-day and prints the facts/exceptions it produced.
 * Run from apps/supersolt: pnpm tsx scripts/verify-consumption-engine.ts <venueId> <yyyy-mm-dd>
 */

import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });
config({ path: resolve(__dirname, "../.env") });

async function main() {
  const venueId = process.argv[2];
  const date = process.argv[3];
  if (!venueId || !date) {
    console.error("usage: tsx scripts/verify-consumption-engine.ts <venueId> <yyyy-mm-dd>");
    process.exit(1);
  }

  const { eq, and } = await import("drizzle-orm");
  const { createServiceAppDb } = await import("@/server/db/create-app-db");
  const { venues, ingredientConsumptionDaily, consumptionExceptions, ingredients } =
    await import("@/server/db/schema");
  const { consumptionService } = await import("@/server/consumption/consumption.service");

  const appDb = createServiceAppDb();
  const [venue] = await appDb.admin
    .select({
      id: venues.id,
      organisationId: venues.organisationId,
      timezone: venues.timezone,
      name: venues.name,
    })
    .from(venues)
    .where(eq(venues.id, venueId));

  if (!venue) {
    console.error(`venue ${venueId} not found`);
    process.exit(1);
  }

  console.log(`finalizing ${date} for ${venue.name} (${venue.timezone})`);
  const result = await consumptionService.finalizeDay(appDb, {
    venueId: venue.id,
    organisationId: venue.organisationId,
    timezone: venue.timezone ?? "Australia/Melbourne",
    date,
  });
  console.log("result:", result);

  const facts = await appDb.admin
    .select({
      ingredientId: ingredientConsumptionDaily.ingredientId,
      qty: ingredientConsumptionDaily.qtyConsumedBaseUnits,
      costCents: ingredientConsumptionDaily.costCents,
      isFinal: ingredientConsumptionDaily.isFinal,
      name: ingredients.name,
      unit: ingredients.unit,
    })
    .from(ingredientConsumptionDaily)
    .innerJoin(ingredients, eq(ingredients.id, ingredientConsumptionDaily.ingredientId))
    .where(
      and(
        eq(ingredientConsumptionDaily.venueId, venue.id),
        eq(ingredientConsumptionDaily.date, date),
      ),
    );

  console.log(`\nfacts (${facts.length}):`);
  for (const f of facts.slice(0, 20)) {
    console.log(
      `  ${f.name}: ${Number(f.qty).toFixed(2)} ${f.unit}  $${(Number(f.costCents) / 100).toFixed(2)}  final=${f.isFinal}`,
    );
  }
  if (facts.length > 20) console.log(`  ... and ${facts.length - 20} more`);

  const exceptions = await appDb.admin
    .select({
      kind: consumptionExceptions.kind,
      qty: consumptionExceptions.qty,
      valueCents: consumptionExceptions.valueCents,
      detail: consumptionExceptions.detail,
    })
    .from(consumptionExceptions)
    .where(
      and(
        eq(consumptionExceptions.venueId, venue.id),
        eq(consumptionExceptions.date, date),
      ),
    );

  const byKind = new Map<string, { n: number; valueCents: number }>();
  for (const e of exceptions) {
    const prev = byKind.get(e.kind) ?? { n: 0, valueCents: 0 };
    prev.n += 1;
    prev.valueCents += Number(e.valueCents ?? 0);
    byKind.set(e.kind, prev);
  }
  console.log(`\nexceptions (${exceptions.length}):`);
  for (const [kind, agg] of byKind) {
    console.log(`  ${kind}: ${agg.n} entries, $${(agg.valueCents / 100).toFixed(2)}`);
  }
  const samples = exceptions.slice(0, 5);
  for (const s of samples) {
    console.log(`   e.g. ${s.kind}:`, JSON.stringify(s.detail), s.qty, s.valueCents);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
