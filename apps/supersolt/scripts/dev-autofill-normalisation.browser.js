/**
 * Dev-only: bulk-autofill the normalisation queue so you can skip ahead to
 * testing the Products step without manually clicking through every item.
 *
 * Why this is a browser snippet and not a Node script: it deliberately reuses
 * your real, already-authenticated session (cookies) instead of a script
 * fabricating a service-role auth context, so it goes through the exact same
 * /suggest + /commit API routes and business logic the wizard UI uses -
 * cascading unit-size variants, portion/pack derivation, price history, etc.
 *
 * Usage:
 *   1. Open the target org/venue's Settings -> Inventory Setup -> Inventory
 *      page (the normalisation queue), e.g.
 *      /piccolo-panini-bar/hawthorn-vic/settings/inventory-setup/inventory
 *   2. Paste this whole file into the browser devtools console and press
 *      Enter (or ask Claude to run it via preview_eval).
 *   3. Run:  runAutofillNormalisation()
 *      (org/venue slugs are read from the current URL automatically; pass
 *      them explicitly as runAutofillNormalisation('org-slug', 'venue-slug')
 *      to target a different one without navigating first.)
 *   4. Poll progress any time with:  window.__autofillProgress
 *   5. Refresh the page when done to see the queue update.
 *
 * Skips (leaves pending) any group where a second AI opinion says
 * likelyNonInventory - matches what the real wizard would flag for a human
 * to review rather than silently forcing a bad ingredient into existence.
 */

function __autofillGroupItems(items) {
  const indexById = new Map(items.map((item, index) => [item.id, index]));
  const parent = items.map((_, index) => index);
  const find = (i) => {
    let root = i;
    while (parent[root] !== root) root = parent[root];
    let cursor = i;
    while (parent[cursor] !== root) {
      const next = parent[cursor];
      parent[cursor] = root;
      cursor = next;
    }
    return root;
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
  };
  items.forEach((item, index) => {
    for (const similar of item.similarPendingItems ?? []) {
      const otherIndex = indexById.get(similar.id);
      if (otherIndex != null) union(index, otherIndex);
    }
  });
  const groupsByRoot = new Map();
  items.forEach((item, index) => {
    const root = find(index);
    const members = groupsByRoot.get(root);
    if (members) members.push(item);
    else groupsByRoot.set(root, [item]);
  });
  return [...groupsByRoot.values()].map((variants) => {
    let representative = variants[0];
    for (const variant of variants) {
      if (variant.rawDescription.length < representative.rawDescription.length) {
        representative = variant;
      }
    }
    return { representative, variants };
  });
}

function __autofillDetectScope() {
  const match = window.location.pathname.match(/^\/([^/]+)\/([^/]+)\//);
  if (!match) throw new Error("Couldn't detect org/venue from URL - pass them explicitly.");
  return { organisation: match[1], venue: match[2] };
}

async function runAutofillNormalisation(organisation, venue, opts = {}) {
  const scope = organisation && venue ? { organisation, venue } : __autofillDetectScope();
  const concurrency = opts.concurrency ?? 4;
  const base = `/api/organisations/${scope.organisation}/venues/${scope.venue}/inventory-setup/normalise`;

  const queueJson = await fetch(`${base}/queue`, { cache: "no-store" }).then((r) => r.json());
  if (queueJson.error) throw new Error("Queue fetch failed: " + queueJson.error.message);

  const pendingMain = queueJson.data.items.filter(
    (i) => i.normalisationStatus === "pending" && i.bucket === "main",
  );
  const groups = __autofillGroupItems(pendingMain);

  window.__autofillProgress = {
    scope,
    total: groups.length,
    done: 0,
    committed: [],
    skippedNonInventory: [],
    failed: [],
    startedAt: Date.now(),
    finishedAt: null,
  };
  const progress = window.__autofillProgress;
  console.log(`[autofill] ${pendingMain.length} raw items -> ${groups.length} groups for ${scope.organisation}/${scope.venue}`);

  async function processGroup(group) {
    const rep = group.representative;
    const alsoRawItemIds = group.variants.filter((v) => v.id !== rep.id).map((v) => v.id);

    try {
      const suggestJson = await fetch(`${base}/suggest`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rawItemId: rep.id }),
      }).then((r) => r.json());
      if (suggestJson.error) throw new Error("suggest: " + suggestJson.error.message);
      const s = suggestJson.data;

      if (s.likelyNonInventory) {
        progress.skippedNonInventory.push({
          id: rep.id,
          description: rep.rawDescription,
          reason: s.nonInventoryReason,
        });
        return;
      }

      const commitBody = {
        rawItemId: rep.id,
        mode: "create",
        ingredient: {
          name: s.ingredientName,
          category: s.ingredientCategory,
          unit: s.ingredientUnit,
        },
        supplierProduct: {
          name: s.productName,
          packLabel: s.packLabel,
          unitsPerPack: s.unitsPerPack,
          packUnit: s.packUnit,
          unitPriceCents: s.unitPriceCents ?? rep.lastUnitPriceCents ?? 0,
        },
        alsoRawItemIds,
      };

      const commitJson = await fetch(`${base}/commit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(commitBody),
      }).then((r) => r.json());
      if (commitJson.error) throw new Error("commit: " + commitJson.error.message);

      progress.committed.push({ id: rep.id, description: rep.rawDescription, ingredientName: s.ingredientName });
    } catch (err) {
      progress.failed.push({ id: rep.id, description: rep.rawDescription, error: String(err) });
    } finally {
      progress.done += 1;
    }
  }

  let cursor = 0;
  async function worker() {
    while (cursor < groups.length) {
      const group = groups[cursor++];
      await processGroup(group);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  progress.finishedAt = Date.now();
  console.log(
    `[autofill] done: ${progress.committed.length} created, ${progress.skippedNonInventory.length} skipped (non-inventory), ${progress.failed.length} failed`,
  );
  return progress;
}

window.runAutofillNormalisation = runAutofillNormalisation;
