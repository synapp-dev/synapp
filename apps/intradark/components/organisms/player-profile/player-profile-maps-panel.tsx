"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import {
  MAP_SLIDES_FACEIT,
  MAP_SLIDES_OFFICIALS,
  mapStatIndicatorStyle,
  qualityLabel,
  type MapSlide,
} from "@/lib/player-profile-showcase-data";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@workspace/ui/components/carousel";
import { Progress } from "@workspace/ui/components/progress";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { Activity } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

type MapSource = "officials" | "faceit";

const sectionShell =
  "border-white/10 bg-[#0a0f1c] text-white shadow-black/40 shadow-xl";

const pillToggleClass =
  "data-[state=on]:border-primary data-[state=on]:text-primary-foreground data-[state=on]:bg-primary/15 border-white/20 text-white/70";

function MapSlideCard({ slide }: { slide: MapSlide }) {
  return (
    <Card className={cn("gap-0 overflow-hidden py-0", sectionShell)}>
      <div className="relative min-h-[280px] w-full overflow-hidden sm:min-h-[320px]">
        <Image
          src={slide.imageSrc}
          alt=""
          fill
          className="scale-110 object-cover object-center blur-sm opacity-40"
          sizes="100vw"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#0a0f1c] via-[#0a0f1c]/85 to-transparent"
          aria-hidden
        />
        <CardHeader className="relative z-[1] border-0 pb-2 pt-6">
          <CardTitle className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {slide.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-[1] px-4 pb-4 sm:px-6">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-3">
            {slide.stats.map((row) => (
              <div key={row.label} className="flex flex-col gap-1.5">
                <p className="text-xs text-white/55">{row.label}</p>
                <p className="text-lg font-bold tabular-nums text-white">
                  {row.valueDisplay}
                </p>
                <Progress
                  value={row.fillPercent}
                  className="h-1 bg-white/10"
                  indicatorStyle={mapStatIndicatorStyle(row.quality)}
                />
                <p
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-wide",
                    row.quality === "good" && "text-chart-2",
                    row.quality === "okay" && "text-chart-4",
                    row.quality === "poor" && "text-chart-1",
                  )}
                >
                  {qualityLabel(row.quality)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </div>
      <CardFooter className="relative z-[1] flex flex-col gap-3 border-t border-chart-2/40 bg-black/30 px-4 py-4 sm:px-6">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-chart-2">
          Best performance
        </p>
        <div className="flex w-full flex-row flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-row items-center gap-2">
              <span className="size-6 shrink-0 rounded-full bg-chart-2/30 ring-1 ring-white/20" />
              <span className="text-muted-foreground text-xs">vs</span>
              <span className="size-6 shrink-0 rounded-full bg-chart-1/40 ring-1 ring-white/20" />
            </div>
            <p className="truncate text-xl font-bold text-white">
              {slide.best.opponent}
            </p>
            <p className="text-xs text-white/55">
              {slide.best.event}
              <span className="text-white/35"> · </span>
              {slide.best.date}
            </p>
          </div>
          <div className="flex flex-row flex-wrap items-end justify-end gap-3">
            <p className="text-2xl font-bold tabular-nums text-white">
              {slide.best.score}
            </p>
            <Badge
              variant="outline"
              className="border-chart-2/60 bg-chart-2/10 text-chart-2"
            >
              <Activity aria-hidden />
              {slide.best.rating}
            </Badge>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

export type PlayerProfileMapsPanelProps = {
  playerId: string;
  className?: string;
};

export function PlayerProfileMapsPanel({
  playerId,
  className,
}: PlayerProfileMapsPanelProps) {
  void playerId;
  const [source, setSource] = useState<MapSource>("officials");
  const slides: MapSlide[] =
    source === "officials" ? MAP_SLIDES_OFFICIALS : MAP_SLIDES_FACEIT;

  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const onSelect = useCallback((carousel: CarouselApi | undefined) => {
    if (!carousel) return;
    setCurrent(carousel.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on("reInit", onSelect);
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api, onSelect]);

  useEffect(() => {
    setCurrent(0);
    api?.scrollTo(0);
  }, [source, api]);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-row flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight text-white">Maps</h2>
        <ToggleGroup
          type="single"
          value={source}
          onValueChange={(v) => {
            if (v === "officials" || v === "faceit") setSource(v);
          }}
          variant="outline"
          size="sm"
          spacing={0}
          className="rounded-full border border-white/15 bg-black/20 p-0.5"
        >
          <ToggleGroupItem
            value="officials"
            className={cn("rounded-full px-3 py-1.5 text-xs", pillToggleClass)}
          >
            Officials
          </ToggleGroupItem>
          <ToggleGroupItem
            value="faceit"
            className={cn("rounded-full px-3 py-1.5 text-xs", pillToggleClass)}
          >
            FaceIT
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Carousel setApi={setApi} className="w-full">
        <CarouselContent className="-ml-2">
          {slides.map((slide) => (
            <CarouselItem key={slide.id} className="pl-2">
              <MapSlideCard slide={slide} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <div
        className="flex flex-row items-center justify-center gap-1.5"
        role="tablist"
        aria-label="Map slides"
      >
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-selected={index === current}
            aria-label={`Show ${slide.name}`}
            className={cn(
              "size-2 rounded-full transition-colors",
              index === current ? "bg-white" : "bg-white/25 hover:bg-white/45",
            )}
            onClick={() => api?.scrollTo(index)}
          />
        ))}
      </div>
    </div>
  );
}
