"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Fingerprint } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Spinner } from "@workspace/ui/components/spinner";
import { cn } from "@workspace/ui/lib/utils";
import { PageHeader } from "@/components/page-header";
import { IDENTITY_SECTION_LIST } from "@/components/identity/sections";
import { useIdentityEntries } from "@/hooks/identity/use-identity";
import type { IdentityEntry } from "@/entities/identity/model/types";

function CompletionRing({ filled, total }: { filled: number; total: number }) {
  const size = 56;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? filled / total : 0;

  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="stroke-primary"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums">
        {filled}/{total}
      </span>
    </div>
  );
}

export default function IdentityPage() {
  const { data: entries, isLoading } = useIdentityEntries();

  const bySection = new Map<string, IdentityEntry[]>();
  for (const entry of entries ?? []) {
    const list = bySection.get(entry.section) ?? [];
    list.push(entry);
    bySection.set(entry.section, list);
  }
  const filled = IDENTITY_SECTION_LIST.filter(
    (section) => (bySection.get(section.slug)?.length ?? 0) > 0
  ).length;

  return (
    <section className="w-full space-y-4">
      <PageHeader
        title="Identity"
        subtitle="Who you are, on the record. Twelve lenses on one person."
        icon={<Fingerprint className="h-5 w-5" />}
        actions={
          isLoading ? null : (
            <CompletionRing filled={filled} total={IDENTITY_SECTION_LIST.length} />
          )
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {IDENTITY_SECTION_LIST.map((section, index) => {
            const sectionEntries = bySection.get(section.slug) ?? [];
            const count = sectionEntries.length;
            const first = sectionEntries[0];
            const Icon = section.icon;
            return (
              <motion.div
                key={section.slug}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.4) }}
              >
                <Link href={`/identity/${section.slug}`} className="block h-full">
                  <Card className="h-full transition-colors hover:border-primary/40 hover:bg-muted/30">
                    <CardContent className="flex h-full flex-col gap-2 p-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                            count > 0
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className="min-w-0 flex-1 truncate text-sm font-medium">
                          {section.title}
                        </p>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {count > 0
                            ? `${count} ${count === 1 ? "entry" : "entries"}`
                            : ""}
                        </span>
                      </div>
                      {first ? (
                        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {first.title}
                          {first.body ? ` · ${first.body}` : ""}
                        </p>
                      ) : (
                        <p className="text-xs italic text-muted-foreground/60">
                          Not started
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}
