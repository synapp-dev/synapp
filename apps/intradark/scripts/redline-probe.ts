/**
 * One-off Redline API probe: verifies REDLINE_API_KEY and dumps discovery data.
 * Run: pnpm dlx dotenv -e .env.local -- tsx scripts/redline-probe.ts
 * (or: pnpm exec dotenv -e .env.local -- tsx scripts/redline-probe.ts)
 */

const BASE = (process.env.REDLINE_API_BASE_URL ?? "https://api.redlinepanel.com").replace(/\/$/, "");
const KEY = process.env.REDLINE_API_KEY;

async function call(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${KEY}`, Accept: "application/json" },
    cache: "no-store",
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* leave raw */
  }
  return { status: res.status, ok: res.ok, body };
}

async function main() {
  if (!KEY) {
    console.error("✗ REDLINE_API_KEY is not set in this env. Aborting.");
    process.exit(1);
  }
  console.log(`Base URL: ${BASE}`);
  console.log(`Key:      ${KEY.slice(0, 6)}…${KEY.slice(-4)} (len ${KEY.length})`);
  console.log("");

  console.log("── GET /v1/eggs ──");
  const eggs = await call("/v1/eggs");
  console.log(`status ${eggs.status}`);
  console.log(JSON.stringify(eggs.body, null, 2));
  console.log("");

  // If eggs came back, surface the variable allow-list per egg compactly so we
  // can spot the plugins-zip env key without scrolling the raw dump.
  const list = (eggs.body as { eggs?: Array<{ slug: string; name: string; variables?: Array<{ env: string; name: string; required: boolean; default?: string }>; locations?: Array<{ key: string; name: string }> }> })?.eggs;
  if (Array.isArray(list)) {
    console.log("── egg summary ──");
    for (const egg of list) {
      console.log(`\n• ${egg.slug}  (${egg.name})`);
      console.log(`  locations: ${(egg.locations ?? []).map((l) => `${l.key}:${l.name}`).join(", ") || "(none)"}`);
      for (const v of egg.variables ?? []) {
        console.log(`  - ${v.env}${v.required ? " *required" : ""}  "${v.name}"${v.default ? `  default=${v.default}` : ""}`);
      }
    }
    console.log("");
  }

  console.log("── GET /v1/servers ──");
  const servers = await call("/v1/servers");
  console.log(`status ${servers.status}`);
  console.log(JSON.stringify(servers.body, null, 2));
}

main().catch((err) => {
  console.error("Probe failed:", err);
  process.exit(1);
});
