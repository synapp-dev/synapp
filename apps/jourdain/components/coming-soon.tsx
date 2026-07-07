"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { PageHeader } from "@/components/page-header";

type ComingSoonProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  bullets?: string[];
};

export function ComingSoon({
  title,
  description,
  icon: Icon,
  bullets,
}: ComingSoonProps) {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col space-y-6">
      <PageHeader title={title} icon={<Icon className="h-5 w-5" />} />
      <div className="flex flex-1 items-center justify-center py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-xl"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-20 -top-24 -bottom-12"
            style={{
              background:
                "radial-gradient(ellipse 60% 55% at 50% 38%, color-mix(in oklch, var(--foreground) 5%, transparent), transparent 72%)",
            }}
          />
          <Card className="relative overflow-hidden border-border/60 shadow-sm">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 90% 70% at 50% 0%, color-mix(in oklch, var(--foreground) 3.5%, transparent), transparent 65%)",
              }}
            />
            <CardContent className="relative flex flex-col items-center gap-7 px-8 py-14 text-center sm:px-14">
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.5,
                  delay: 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-background ring-1 ring-border shadow-[0_0_0_8px_color-mix(in_oklch,var(--muted)_55%,transparent)]"
              >
                <Icon
                  className="h-7 w-7 text-muted-foreground"
                  strokeWidth={1.5}
                />
              </motion.div>
              <div className="space-y-3">
                <span className="inline-flex items-center rounded-full border border-border/70 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Planned
                </span>
                <p className="mx-auto max-w-md text-balance text-base leading-relaxed text-foreground/80">
                  {description}
                </p>
              </div>
              {bullets && bullets.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {bullets.slice(0, 3).map((bullet, i) => (
                    <motion.span
                      key={bullet}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.35,
                        delay: 0.25 + i * 0.07,
                        ease: "easeOut",
                      }}
                      className="rounded-full bg-muted/60 px-3.5 py-1.5 text-xs text-muted-foreground"
                    >
                      {bullet}
                    </motion.span>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
