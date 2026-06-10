"use client";

import Image from "next/image";

import { Badge } from "@workspace/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

const HLTV_BADGE_BG = "bg-[#2b6ea3] hover:bg-[#2b6ea3]/90";

function CsgoWordmark({ className }: { className?: string }) {
  return (
    <Image
      src="/images/logos/csgo-wordmark.svg"
      alt="CS:GO"
      width={40}
      height={8}
      className={cn(
        "block h-auto w-10 shrink-0 object-contain object-center",
        className,
      )}
    />
  );
}

function Cs2Wordmark({ className }: { className?: string }) {
  return (
    <Image
      src="/images/logos/cs2-wordmark.svg"
      alt="CS2"
      width={950}
      height={245}
      className={cn(
        "block h-auto w-8 shrink-0 object-contain object-center",
        className,
      )}
    />
  );
}

function getProTooltip(csgoPro: boolean, cs2Pro: boolean): string {
  if (csgoPro && cs2Pro) {
    return "Verified CS:GO Pro and CS2 Pro — HLTV match history on Leetify";
  }
  if (csgoPro) {
    return "Verified CS:GO Pro — HLTV match history on Leetify";
  }
  return "Verified CS2 Pro — HLTV match history on Leetify";
}

export function ProStatusBadge({
  csgoPro,
  cs2Pro,
  className,
}: {
  csgoPro: boolean;
  cs2Pro: boolean;
  className?: string;
}) {
  if (!csgoPro && !cs2Pro) return null;

  const tooltip = getProTooltip(csgoPro, cs2Pro);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="secondary"
          className={cn(
            "h-6 cursor-default gap-0 border-transparent px-2 py-0 text-[10px] font-semibold uppercase leading-none tracking-wide text-white",
            HLTV_BADGE_BG,
            className,
          )}
          aria-label={tooltip}
        >
          <span className="inline-flex items-center justify-center gap-1.5">
            <Image
              src="/images/logos/hltv-symbol.svg"
              alt=""
              aria-hidden
              width={16}
              height={12}
              className="block h-3 w-auto shrink-0 object-contain object-center"
            />
            {csgoPro && cs2Pro ? (
              <>
                <CsgoWordmark />
                <span
                  className="size-0.5 shrink-0 rounded-full bg-white/50"
                  aria-hidden
                />
                <Cs2Wordmark />
              </>
            ) : csgoPro ? (
              <CsgoWordmark />
            ) : (
              <Cs2Wordmark />
            )}
          </span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} align="center">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
