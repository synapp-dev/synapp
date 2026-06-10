"use client";

import Image from "next/image";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/carousel";
import { useCoinImages } from "@/entities/players/hooks/use-coin-images";

/** Extract showcased coin/medal defindexes from a GC `medals` payload. */
export function medalDefindexes(medals: unknown): number[] {
  if (!medals || typeof medals !== "object") return [];
  const coins = (medals as { display_items_defidx?: unknown })
    .display_items_defidx;
  if (!Array.isArray(coins)) return [];
  return coins.map((c) => Number(c)).filter((n) => Number.isFinite(n));
}

export interface CoinShowcaseProps {
  defindexes: number[];
  /** Lay the coins out as a single horizontal (scrollable) row. */
  singleRow?: boolean;
  /**
   * Show a fixed-size page of coins with prev/next arrows instead of a
   * scroller. When set, only `paginated` coins are visible at a time.
   */
  paginated?: number;
  className?: string;
}

function CoinImg({
  src,
  name,
  defindex,
}: {
  src: string;
  name: string | null;
  defindex: number;
}) {
  return (
    <Image
      src={src}
      alt={name ?? `Coin ${defindex}`}
      title={name ?? undefined}
      width={48}
      height={48}
      loading="lazy"
      className="size-12 shrink-0 object-contain"
    />
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

function CoinSkeletons({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="size-12 shrink-0 animate-pulse rounded-md bg-muted"
          aria-hidden
        />
      ))}
    </>
  );
}

/** Render showcased coins as their Steam economy images. */
export function CoinShowcase({
  defindexes,
  singleRow = false,
  paginated,
  className,
}: CoinShowcaseProps) {
  const { coins, loading } = useCoinImages(defindexes);

  // Paginated mode: one carousel slide per page of coins.
  if (paginated && paginated > 0) {
    if (loading) {
      return (
        <Carousel className={className ?? "w-full"}>
          <CarouselContent>
            <CarouselItem>
              <div className="flex items-center justify-center gap-1 px-6">
                <CoinSkeletons count={paginated} />
              </div>
            </CarouselItem>
          </CarouselContent>
        </Carousel>
      );
    }

    if (coins.length === 0) return null;

    const pages = chunk(coins, paginated);

    return (
      <Carousel
        className={className ?? "w-full"}
        opts={{ align: "center" }}
      >
        <CarouselContent>
          {pages.map((page, pageIndex) => (
            <CarouselItem key={pageIndex}>
              <div className="flex items-center justify-center gap-1 px-6">
                {page.map((coin) => (
                  <CoinImg
                    key={coin.defindex}
                    src={coin.image}
                    name={coin.name}
                    defindex={coin.defindex}
                  />
                ))}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious variant="ghost" className="left-0" />
        <CarouselNext variant="ghost" className="right-0" />
      </Carousel>
    );
  }

  const containerClass = singleRow
    ? "flex flex-nowrap gap-2 overflow-x-auto"
    : "flex flex-wrap gap-2";

  if (loading) {
    return (
      <div className={[containerClass, className].filter(Boolean).join(" ")}>
        {defindexes.map((d) => (
          <div
            key={d}
            className="size-12 shrink-0 animate-pulse rounded-md bg-muted"
            aria-hidden
          />
        ))}
      </div>
    );
  }

  if (coins.length === 0) return null;

  return (
    <div className={[containerClass, className].filter(Boolean).join(" ")}>
      {coins.map((coin) => (
        <CoinImg
          key={coin.defindex}
          src={coin.image}
          name={coin.name}
          defindex={coin.defindex}
        />
      ))}
    </div>
  );
}
