/**
 * Vanilla CS2 server lifecycle test against Redline.
 *   create → poll install → report connect info  (does NOT delete)
 * Run: pnpm exec dotenv -e .env.local -- tsx scripts/redline-spinup.ts
 *
 * Teardown later with the id it prints:
 *   pnpm exec dotenv -e .env.local -- tsx scripts/redline-spinup.ts --delete <id>
 */

const BASE = (process.env.REDLINE_API_BASE_URL ?? "https://api.redlinepanel.com").replace(/\/$/, "");
const KEY = process.env.REDLINE_API_KEY;

async function call(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${KEY}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });
  if (res.status === 204) return { status: 204, ok: true, body: null };
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* raw */
  }
  return { status: res.status, ok: res.ok, body };
}

const TERMINAL = new Set(["running", "offline", "stopped", "install_failed", "reinstall_failed"]);

async function spinUp(minimal = false) {
  // GSLT (Steam Game Server Login Token) — needed for public/internet connects.
  const gslt = process.env.REDLINE_TEST_GSLT?.trim();

  const input = minimal
    ? {
        name: "intradark-minimal-test",
        egg: "cs2",
        location: "sydney",
        environment: {},
        start_on_completion: false,
      }
    : {
        name: "intradark-vanilla-test",
        egg: "cs2",
        location: "sydney",
        environment: {
          SRCDS_MAP: "de_dust2",
          SRCDS_MAXPLAYERS: "10",
          SRCDS_HOSTNAME: "Intradark Vanilla Test",
          SRCDS_RCONPW: "intradark-rcon-test",
          // Only include when set — empty STEAM_ACC = LAN-only / refused connects.
          ...(gslt ? { STEAM_ACC: gslt } : {}),
        },
        start_on_completion: true,
      };

  if (!minimal && !gslt) {
    console.warn(
      "⚠ REDLINE_TEST_GSLT not set — server will start without a GSLT and may refuse internet connections.\n",
    );
  }

  console.log("── POST /v1/servers ──");
  console.log("payload:", JSON.stringify(input, null, 2));
  const created = await call("/v1/servers", { method: "POST", body: JSON.stringify(input) });
  console.log(`status ${created.status}`);
  console.log(JSON.stringify(created.body, null, 2));
  if (!created.ok) {
    console.error("\n✗ create failed — stopping.");
    process.exit(1);
  }

  const id = (created.body as { server?: { id?: string } })?.server?.id;
  if (!id) {
    console.error("\n✗ no server id in response — stopping.");
    process.exit(1);
  }
  console.log(`\n✔ created server id: ${id}`);

  console.log("\n── polling install (GET /v1/servers/{id}) ──");
  const deadline = Date.now() + 6 * 60_000;
  let last = "";
  while (Date.now() < deadline) {
    const detail = await call(`/v1/servers/${encodeURIComponent(id)}`);
    const d = detail.body as { current_state?: string | null; status?: string; address?: string; tv_address?: string };
    const state = d?.current_state ?? d?.status ?? "unknown";
    if (state !== last) {
      console.log(`  [${new Date().toISOString().slice(11, 19)}] state=${state}${d?.address ? `  address=${d.address}` : ""}`);
      last = state;
    }
    if (TERMINAL.has(state)) {
      console.log("\n── final detail ──");
      console.log(JSON.stringify(detail.body, null, 2));
      console.log(`\n✔ reached terminal state: ${state}`);
      console.log(`\nTo tear it down:\n  pnpm exec dotenv -e .env.local -- tsx scripts/redline-spinup.ts --delete ${id}`);
      return;
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  console.error(`\n✗ did not reach a terminal state within 6 min (last: ${last}). id=${id}`);
}

async function teardown(id: string) {
  console.log(`── stop + force delete ${id} ──`);
  const stop = await call(`/v1/servers/${encodeURIComponent(id)}/power`, {
    method: "POST",
    body: JSON.stringify({ signal: "stop" }),
  });
  console.log(`stop: status ${stop.status}`);
  const del = await call(`/v1/servers/${encodeURIComponent(id)}?force=true`, { method: "DELETE" });
  console.log(`delete: status ${del.status}`);
  console.log(del.ok ? "\n✔ torn down." : `\n✗ delete returned ${del.status}: ${JSON.stringify(del.body)}`);
}

async function main() {
  if (!KEY) {
    console.error("✗ REDLINE_API_KEY is not set. Aborting.");
    process.exit(1);
  }
  const [flag, id] = process.argv.slice(2);
  if (flag === "--delete") {
    if (!id) {
      console.error("✗ usage: --delete <serverId>");
      process.exit(1);
    }
    await teardown(id);
    return;
  }
  await spinUp(flag === "--minimal");
}

main().catch((err) => {
  console.error("Spin-up failed:", err);
  process.exit(1);
});
