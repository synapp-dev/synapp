"use client";

import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@workspace/ui/components/carousel";

import { SUPPLIER_TRACEBACK } from "@/entities/inventory-setup/components/wizard/welcome/welcome-copy";

const STEP_MS = 2000;

/**
 * The "everything traces back to the supplier" story as a horizontal carousel.
 * Cards run customer-event → supplier (so the sold sandwich is the last card and
 * "Order from supplier" is the first). It opens on the last card and auto-rewinds
 * one card at a time back to the supplier, landing on the root of the chain. A
 * row of dots under the card tracks position (and lets you jump).
 */
export function SupplierTracebackCarousel({
  active,
  reduceMotion,
}: {
  active: boolean;
  reduceMotion: boolean;
}) {
  // SUPPLIER_TRACEBACK is sandwich-first; reverse so card 1 = "Order from
  // supplier" and the last card = "Client buys a sandwich" (where we start).
  const cards = React.useMemo(() => [...SUPPLIER_TRACEBACK].reverse(), []);
  const lastIndex = cards.length - 1;
  const [api, setApi] = React.useState<CarouselApi>();
  const [selected, setSelected] = React.useState(lastIndex);

  // Track the selected card for the dots.
  React.useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelected(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // Open on the last card (the sold sandwich) and rewind back to the supplier.
  React.useEffect(() => {
    if (!api) return;
    if (reduceMotion || !active) {
      api.scrollTo(0, true);
      return;
    }
    api.scrollTo(lastIndex, true);
    const id = window.setInterval(() => {
      if (api.canScrollPrev()) api.scrollPrev();
      else window.clearInterval(id);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [api, active, reduceMotion, lastIndex]);

  return (
    <div className="mx-auto flex w-full max-w-[18rem] flex-col items-center gap-5 sm:max-w-[20rem]">
      <Carousel
        setApi={setApi}
        opts={{ startIndex: lastIndex, align: "center" }}
        className="w-full"
      >
        <CarouselContent>
          {cards.map((step) => {
            const Icon = step.icon;
            return (
              <CarouselItem key={step.label}>
                <Card className="bg-card">
                  <CardContent className="flex aspect-square flex-col items-center justify-center gap-4 p-8 text-center">
                    <span className="bg-muted text-foreground/70 flex h-16 w-16 items-center justify-center rounded-full">
                      <Icon className="h-8 w-8" aria-hidden />
                    </span>
                    <span className="text-lg font-medium leading-tight">
                      {step.label}
                    </span>
                  </CardContent>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      <div className="flex items-center gap-2">
        {cards.map((step, i) => (
          <button
            key={step.label}
            type="button"
            aria-label={`Show "${step.label}"`}
            aria-current={i === selected}
            onClick={() => api?.scrollTo(i)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === selected
                ? "w-5 bg-[var(--brand-supersolt-primary)]"
                : "bg-muted-foreground/30 w-2",
            )}
          />
        ))}
      </div>
    </div>
  );
}
