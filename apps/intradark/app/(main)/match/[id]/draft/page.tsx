import { Users } from "lucide-react";

import { Button } from "@workspace/ui/components/button";

export default function MatchDraftPhasePage() {
  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <div className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
        <Users className="size-5 text-[#7289DA]" aria-hidden />
        Draft phase
      </div>
      <p className="max-w-sm text-center text-sm text-zinc-400">
        Captains alternate picks until both teams have five players. Mock order
        below — no live draft yet.
      </p>
      <ol className="w-full max-w-xs space-y-2 text-sm text-zinc-300">
        <li className="rounded-md bg-zinc-900/80 px-3 py-2 ring-1 ring-zinc-800">
          1. Team North — NiKo
        </li>
        <li className="rounded-md bg-zinc-900/80 px-3 py-2 ring-1 ring-zinc-800">
          2. Team South — TeSeS
        </li>
        <li className="rounded-md bg-zinc-900/80 px-3 py-2 ring-1 ring-zinc-800">
          3. Team South — ZywOo
        </li>
        <li className="rounded-md bg-zinc-900/40 px-3 py-2 ring-1 ring-dashed ring-zinc-700 text-zinc-500">
          …
        </li>
      </ol>
      <Button
        type="button"
        variant="secondary"
        className="pointer-events-none bg-zinc-800 text-zinc-400"
        disabled
      >
        Waiting for captain…
      </Button>
    </div>
  );
}
