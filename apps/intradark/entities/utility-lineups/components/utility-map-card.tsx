"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import Image from "next/image";

import {
  MAP_CARD_MIN_H,
  MAP_CARD_MIN_H_SM,
  MAP_CARD_ROW_MIN_H,
  MAP_CARD_ROW_MIN_H_SM,
  type UtilityMapCardData,
} from "./utility-map-list-model";

/** Slightly larger than the clip so `bg-cover` can pan from left to right without gaps. */
const BG_OVERSCAN = 1.2;

export type UtilityMapCardProps = {
  m: UtilityMapCardData;
  /** Used when not `selectable`. Defaults to `/utility/[slug]`. */
  href?: string;
  /** Selection mode (e.g. upload wizard) — renders a button instead of a link. */
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  /**
   * When some other map is selected — mute labels and darken the hero gradient
   * so the chosen map reads clearly.
   */
  dimmedUnselected?: boolean;
  /** Smaller card, badge, type, and gentler hover pan. */
  size?: "default" | "sm";
  /** No border / ring (e.g. upload wizard picker on muted background). */
  borderless?: boolean;
  /** When set, wraps the link/button in a staggered entrance (e.g. utility index). */
  staggerIndex?: number;
  staggerReducedMotion?: boolean;
};

export function UtilityMapCard({
  m,
  href = `/utility/${m.slug}`,
  selectable,
  selected,
  onSelect,
  dimmedUnselected,
  size = "default",
  borderless = false,
  staggerIndex,
  staggerReducedMotion = false,
}: UtilityMapCardProps) {
  const isSm = size === "sm";
  const bgUrl = m.mapScreenshotUrl?.trim();
  const hasBg = Boolean(bgUrl);
  const poolLabel = m.poolCategory?.trim();

  const minH = isSm ? MAP_CARD_MIN_H_SM : MAP_CARD_MIN_H;
  const rowMinH = isSm ? MAP_CARD_ROW_MIN_H_SM : MAP_CARD_ROW_MIN_H;

  const card = (
    <Card
      className={cn(
        "group relative grid h-full min-h-0 grid-cols-1 grid-rows-1 overflow-hidden rounded-xl transition-colors duration-300 ease-out",
        !borderless && "hover:border-primary/40",
        hasBg
          ? cn(
              minH,
              "isolate cursor-pointer gap-0 border-0 bg-transparent py-0",
              borderless ? "shadow-none" : "shadow-md ring-1 ring-border/70",
            )
          : cn("py-2", minH, borderless && "border-0 shadow-none"),
      )}
    >
      {hasBg ? (
        <>
          <div
            className="col-start-1 row-start-1 -z-10 h-full min-h-0 w-full min-w-0 overflow-hidden rounded-xl bg-muted/40"
            aria-hidden
          >
            <div className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden">
              <div
                className={cn(
                  "max-h-none max-w-none shrink-0 bg-cover bg-center bg-no-repeat grayscale transition-all duration-700 ease-in-out",
                  "[background-image:var(--map-bg)]",
                  "translate-x-0 translate-y-0 group-hover:translate-y-0 group-hover:grayscale-0",
                  selectable && selected && "grayscale-0",
                  isSm
                    ? "group-hover:translate-x-3"
                    : "group-hover:translate-x-8",
                )}
                style={
                  {
                    ["--map-bg" as string]: `url(${JSON.stringify(bgUrl)})`,
                    minHeight: "100%",
                    minWidth: "100%",
                    height: `${BG_OVERSCAN * 100}%`,
                    width: `${BG_OVERSCAN * 100}%`,
                  } as CSSProperties
                }
                aria-hidden
              />
            </div>
          </div>
          <div
            className="relative col-start-1 row-start-1 -z-10 pointer-events-none min-h-full w-full rounded-xl bg-gradient-to-t from-background via-background/78 to-background/32"
            aria-hidden
          >
            <div
              className={cn(
                "absolute inset-0 rounded-xl transition-opacity duration-300 ease-out",
                dimmedUnselected
                  ? "bg-background/92 opacity-100 group-hover:opacity-0"
                  : "bg-background/82 opacity-0",
              )}
              aria-hidden
            />
          </div>
        </>
      ) : null}
      <CardHeader
        className={cn(
          "col-start-1 row-start-1 z-10 flex min-h-full flex-row items-center space-y-0 self-stretch",
          isSm ? "gap-1.5 px-2 py-1.5" : "gap-2 px-4 py-2",
          selectable && (isSm ? "pr-6" : "pr-9"),
        )}
      >
        <div
          className={cn(
            "flex min-w-0 flex-row items-center",
            isSm ? "gap-1.5" : "gap-2",
          )}
        >
          {m.badgeImageUrl ? (
            <div
              className={cn(
                "shrink-0 transition-opacity duration-300",
                isSm ? "size-9" : "size-14",
                dimmedUnselected && "opacity-50 group-hover:opacity-100",
              )}
            >
              <Image
                src={m.badgeImageUrl}
                alt={`${m.displayName} map badge`}
                width={100}
                height={100}
                className="size-full object-contain drop-shadow-lg"
                loading="lazy"
              />
            </div>
          ) : null}
          <div
            className={cn(
              "min-w-0 flex-1 space-y-0 text-left transition-colors duration-300",
              dimmedUnselected &&
                "text-muted-foreground group-hover:text-foreground",
            )}
          >
            <CardTitle
              className={cn(
                "truncate",
                isSm
                  ? "text-sm font-semibold leading-tight"
                  : "text-2xl leading-none",
              )}
            >
              {m.displayName}
            </CardTitle>
            {poolLabel ? (
              <CardDescription
                className={cn(
                  isSm && "text-[11px] leading-snug",
                  dimmedUnselected &&
                    "text-muted-foreground/75 group-hover:text-muted-foreground",
                )}
              >
                {poolLabel}
              </CardDescription>
            ) : null}
          </div>
        </div>
      </CardHeader>
      {selectable && selected ? (
        <span
          className={cn(
            "pointer-events-none absolute z-20 rounded-full bg-primary animate-pulse",
            "top-1/2 -translate-y-1/2",
            isSm ? "right-4 size-2" : "right-2 size-2",
          )}
          aria-hidden
        />
      ) : null}
    </Card>
  );

  const outerClassName = cn("block h-full w-full", rowMinH);

  const wrapStagger = (node: ReactNode) =>
    staggerIndex !== undefined ? (
      <StaggeredAnimation
        index={staggerIndex}
        baseDelay={0}
        chainFromZero
        incrementDelay={0.065}
        reducedMotion={staggerReducedMotion}
        fadeDirection="up"
        className="h-full min-h-0 w-full"
      >
        {node}
      </StaggeredAnimation>
    ) : (
      node
    );

  if (selectable) {
    return (
      <li className="min-h-0">
        {wrapStagger(
          <button
            type="button"
            className={cn(
              outerClassName,
              "rounded-xl border-0 bg-transparent p-0 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            )}
            onClick={onSelect}
            aria-pressed={selected}
            aria-label={
              selected ? `Deselect ${m.displayName}` : `Select ${m.displayName}`
            }
          >
            {card}
          </button>,
        )}
      </li>
    );
  }

  return (
    <li className="min-h-0">
      {wrapStagger(
        <Link href={href} className={outerClassName}>
          {card}
        </Link>,
      )}
    </li>
  );
}
