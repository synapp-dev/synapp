import { RedlineHarness } from "./redline-harness";

/**
 * Staff test harness for the Redline Panel provisioning API. Gated by the
 * sandbox layout (`sandbox.access`). All calls proxy through `/api/redline/*`
 * so the API key stays server-side. Works against the spec today; drop
 * REDLINE_API_KEY into .env.local to fire live calls.
 */
export default function AdminSandboxRedlinePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Redline provisioning</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Spin up / tear down CS2 servers and push our CounterStrikeSharp plugins
          via the host&apos;s zip-URL cache. Pass everything by hand to test the
          flow end to end.
        </p>
      </div>
      <RedlineHarness />
    </div>
  );
}
