import { listAcFlags } from "@/entities/anticheat/admin-actions";

import { AcFlagsTable } from "./flags-table";

export const dynamic = "force-dynamic";

export default async function AdminAnticheatPage() {
  const flags = await listAcFlags();

  const open = flags.filter((f) => f.status === "open" || f.status === "reviewing");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Anticheat review</h1>
        <p className="text-muted-foreground text-sm">
          {open.length} open {open.length === 1 ? "flag" : "flags"}. Confirming a flag
          records the verdict and nudges the player&apos;s legitimacy score — it never
          bans automatically. Bans remain a separate, manual action.
        </p>
      </div>
      <AcFlagsTable flags={flags} />
    </div>
  );
}
