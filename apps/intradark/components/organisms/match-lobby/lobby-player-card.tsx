"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { BadgeCheck, Star } from "lucide-react";

import type { LobbyPlayerMock } from "@/lib/match-lobby-mock-data";
import { cn } from "@workspace/ui/lib/utils";

import { DiscordIcon } from "./discord-icon";
import { useMatchLobbyMock } from "./match-lobby-mock-context";

const CS_MAN_LOGO = "/images/logos/cstrike-man-white.svg";

/** Matches DiscordIcon inactive (`text-zinc-600`) on dark cards — white asset → dim silhouette. */
const CS_ICON_INACTIVE_FILTER =
  "brightness-0 opacity-[0.42] saturate-0";

type LobbyPlayerCardProps = {
  player: LobbyPlayerMock;
  side: "north" | "south";
  /** When set, overrides pathname-based detection (e.g. `/admin/sandbox/pug-system` lobby step). */
  serverPhaseOverride?: boolean;
};

function InnerGameIcons({
  side,
  discordJoined,
  onDiscordClick,
  serverPhase,
  serverJoined,
  onCsClick,
}: {
  side: "north" | "south";
  discordJoined: boolean;
  onDiscordClick: () => void;
  serverPhase: boolean;
  serverJoined: boolean;
  onCsClick: () => void;
}) {
  const csImgClass = cn(
    "h-[2.1rem] w-auto shrink-0 object-contain transition-[filter,opacity] sm:h-[2.4rem]",
    side === "south" && "-scale-x-100",
    serverPhase &&
      (serverJoined
        ? "opacity-100 drop-shadow-[0_0_10px_rgba(227,136,22,0.55)]"
        : CS_ICON_INACTIVE_FILTER),
  );

  const cs = serverPhase ? (
    <button
      type="button"
      className={cn(
        "rounded-md outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-[#e38816]/75 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
        !serverJoined && "opacity-90 hover:opacity-100",
      )}
      aria-label={`Game server (mock): ${serverJoined ? "connected" : "not connected — click to toggle"}`}
      onClick={(e) => {
        e.stopPropagation();
        onCsClick();
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG from /public */}
      <img src={CS_MAN_LOGO} alt="" width={34} height={36} className={csImgClass} />
    </button>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG from /public
    <img src={CS_MAN_LOGO} alt="" width={34} height={36} className={csImgClass} />
  );

  const discord = (
    <button
      type="button"
      className="rounded-md outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#7289DA] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
      aria-label={`Discord voice (test): ${discordJoined ? "connected" : "not connected — click to toggle"}`}
      onClick={(e) => {
        e.stopPropagation();
        onDiscordClick();
      }}
    >
      <DiscordIcon
        joined={discordJoined}
        className="size-[2.1rem] shrink-0 sm:size-[2.4rem]"
      />
    </button>
  );

  return (
    <div className="flex shrink-0 flex-row items-center gap-2 sm:gap-2.5">
      {side === "north" ? (
        <>
          {discord}
          {cs}
        </>
      ) : (
        <>
          {cs}
          {discord}
        </>
      )}
    </div>
  );
}

export function LobbyPlayerCard({
  player,
  side,
  serverPhaseOverride,
}: LobbyPlayerCardProps) {
  const pathname = usePathname();
  const serverPhase =
    serverPhaseOverride ?? (pathname?.includes("/server") ?? false);

  const {
    isDiscordJoined,
    toggleDiscordJoined,
    isServerJoined,
    toggleServerJoined,
  } = useMatchLobbyMock();
  const discordJoined = isDiscordJoined(player.id);
  const serverJoined = isServerJoined(player.id);

  const discordActiveBorder =
    !serverPhase &&
    (side === "north"
      ? player.active && "border-l-[3px] border-l-[#7289DA]"
      : player.active && "border-r-[3px] border-r-[#7289DA]");

  const serverJoinedBorder =
    serverPhase &&
    serverJoined &&
    (side === "north"
      ? "border-l-[3px] border-l-[#e38816]"
      : "border-r-[3px] border-r-[#e38816]");

  return (
    <div
      tabIndex={0}
      aria-label={
        serverPhase
          ? `${player.displayName}: click row to toggle mock game server connected`
          : `${player.displayName}: click row to toggle mock Discord voice connected`
      }
      className={cn(
        "flex cursor-pointer items-stretch gap-2 rounded-lg bg-zinc-900/90 py-2 pl-2 pr-2 ring-1 ring-zinc-800 transition-colors hover:bg-zinc-800/80 sm:gap-3 sm:py-2.5 sm:pl-2.5 sm:pr-2.5",
        side === "south" && "flex-row-reverse",
        discordActiveBorder,
        serverJoinedBorder,
        serverPhase &&
          serverJoined &&
          "ring-[#e38816]/35 hover:bg-zinc-800/90",
      )}
      onClick={() =>
        serverPhase
          ? toggleServerJoined(player.id)
          : toggleDiscordJoined(player.id)
      }
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (serverPhase) {
            toggleServerJoined(player.id);
          } else {
            toggleDiscordJoined(player.id);
          }
        }
      }}
    >
      <div
        className={cn(
          "relative size-11 shrink-0 self-center overflow-hidden rounded-full bg-zinc-800 ring-1 ring-zinc-700 sm:size-12",
        )}
      >
        <Image
          src={player.avatarSrc}
          alt=""
          width={48}
          height={48}
          className="size-full object-cover"
        />
      </div>

      <div
        className={cn(
          "min-w-0 flex-1 space-y-1 self-center py-0.5",
          side === "south" && "text-right",
        )}
      >
        <div
          className={cn(
            "flex flex-wrap items-center gap-1",
            side === "south" && "justify-end",
          )}
        >
          <span className="truncate font-semibold text-zinc-100">
            {player.displayName}
          </span>
          {player.verified ? (
            <BadgeCheck
              className="size-4 shrink-0 text-sky-400"
              aria-label="Verified"
            />
          ) : null}
          {player.starred ? (
            <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
          ) : null}
        </div>
        <p className="truncate text-xs text-zinc-500">{player.org}</p>
        <div
          className={cn(
            "flex flex-wrap gap-x-3 gap-y-0.5 text-xs",
            side === "south" && "justify-end",
          )}
        >
          <span className="text-[#7289DA]">
            Rating {player.rating.toFixed(2)}
          </span>
          <span className="text-sky-700 dark:text-sky-600">
            Rank #{player.rank}
          </span>
        </div>
      </div>

      <InnerGameIcons
        side={side}
        discordJoined={discordJoined}
        onDiscordClick={() => toggleDiscordJoined(player.id)}
        serverPhase={serverPhase}
        serverJoined={serverJoined}
        onCsClick={() => toggleServerJoined(player.id)}
      />
    </div>
  );
}
