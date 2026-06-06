"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@workspace/ui/lib/utils";

const PHASES = [
  { segment: "draft", label: "Draft" },
  { segment: "discord", label: "Discord" },
  { segment: "veto", label: "Veto" },
  { segment: "server", label: "Server" },
] as const;

type MatchLobbyPhaseNavProps = {
  matchId: string;
};

export function MatchLobbyPhaseNav({ matchId }: MatchLobbyPhaseNavProps) {
  const pathname = usePathname();
  const base = `/match/${matchId}`;

  return (
    <nav
      className="mb-4 flex flex-wrap items-center justify-center gap-1 text-xs sm:text-sm"
      aria-label="Match phases"
    >
      {PHASES.map(({ segment, label }, i) => {
        const href = `${base}/${segment}`;
        const active = pathname === href || pathname?.startsWith(`${href}/`);
        return (
          <span key={segment} className="flex items-center gap-1">
            {i > 0 ? (
              <span className="text-zinc-600" aria-hidden>
                →
              </span>
            ) : null}
            <Link
              href={href}
              className={cn(
                "rounded-md px-2 py-1 transition-colors",
                active
                  ? "bg-zinc-800 text-[#7289DA]"
                  : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300",
              )}
            >
              {label}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
