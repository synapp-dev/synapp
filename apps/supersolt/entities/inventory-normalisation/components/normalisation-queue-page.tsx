"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { buildScopedPath } from "@/lib/build-scoped-path";
import { isInventorySetupSectionsUnlockedForDev } from "@/lib/inventory-setup/dev-unlock-all-sections";
import { SetupStepperBanner } from "@/entities/inventory-setup/components/setup-stepper-banner";
import { useInventorySetupProgressQuery } from "@/entities/inventory-setup/model/useInventorySetupProgressQuery";
import { NormalisationWizardSheet } from "@/entities/inventory-normalisation/components/normalisation-wizard-sheet";
import { useNormalisationQueueQuery } from "@/entities/inventory-normalisation/model/useNormalisationQueueQuery";
import { useNormalisationMutations } from "@/entities/inventory-normalisation/model/useNormalisationMutations";
import type { NormalisationQueueItem } from "@/entities/inventory-normalisation/model/types";

type NormalisationQueuePageProps = {
  organisation: string;
  venue: string;
};

function formatCurrency(cents: number | null): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function sortQueueItems(items: NormalisationQueueItem[]): NormalisationQueueItem[] {
  return [...items].sort((a, b) => {
    const bySupplier = a.supplierName.localeCompare(b.supplierName, undefined, {
      sensitivity: "base",
    });
    if (bySupplier !== 0) return bySupplier;
    return a.rawDescription.localeCompare(b.rawDescription, undefined, {
      sensitivity: "base",
    });
  });
}

type SupplierQueueGroup = {
  supplierId: string;
  supplierName: string;
  items: NormalisationQueueItem[];
};

function groupQueueItemsBySupplier(items: NormalisationQueueItem[]): SupplierQueueGroup[] {
  const groups: SupplierQueueGroup[] = [];

  for (const item of sortQueueItems(items)) {
    const last = groups.at(-1);
    if (last && last.supplierId === item.supplierId) {
      last.items.push(item);
      continue;
    }

    groups.push({
      supplierId: item.supplierId,
      supplierName: item.supplierName,
      items: [item],
    });
  }

  return groups;
}

function QueueItemsTable({
  items,
  showSupplierColumn,
  onNormalise,
  onSkip,
  onUnskip,
  onEdit,
  showSkip,
  showUnskip,
}: {
  items: NormalisationQueueItem[];
  showSupplierColumn: boolean;
  onNormalise: (item: NormalisationQueueItem) => void;
  onSkip?: (item: NormalisationQueueItem) => void;
  onUnskip?: (item: NormalisationQueueItem) => void;
  onEdit?: (item: NormalisationQueueItem) => void;
  showSkip?: boolean;
  showUnskip?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className={showSupplierColumn ? "w-[36%]" : "w-[46%]"}>
              Description
            </TableHead>
            {showSupplierColumn ? (
              <TableHead className="w-[18%]">Supplier</TableHead>
            ) : null}
            <TableHead className="w-[10%]">Unit</TableHead>
            <TableHead className="w-[12%] text-right">Last price</TableHead>
            <TableHead className="w-[10%]">Status</TableHead>
            <TableHead className="w-[14%]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell
                className="max-w-0 truncate font-medium"
                title={item.rawDescription}
              >
                <span className="inline-flex max-w-full items-center gap-1.5">
                  <span className="truncate">{item.rawDescription}</span>
                  {(item.similarPendingItems?.length ?? 0) > 0 ? (
                    <Badge variant="outline" className="shrink-0 text-xs">
                      Similar ({item.similarPendingItems?.length ?? 0})
                    </Badge>
                  ) : null}
                </span>
              </TableCell>
              {showSupplierColumn ? (
                <TableCell
                  className="text-muted-foreground max-w-0 truncate text-sm"
                  title={item.supplierName}
                >
                  {item.supplierName}
                </TableCell>
              ) : null}
              <TableCell className="text-sm">{item.rawUnit ?? "—"}</TableCell>
              <TableCell className="text-right tabular-nums text-sm">
                {formatCurrency(item.lastUnitPriceCents)}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{item.normalisationStatus}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap justify-end gap-1">
                  {item.normalisationStatus === "pending" ? (
                    <>
                      <Button size="sm" onClick={() => onNormalise(item)}>
                        Normalise
                      </Button>
                      {showSkip && onSkip ? (
                        <Button size="sm" variant="outline" onClick={() => onSkip(item)}>
                          Skip
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                  {item.normalisationStatus === "normalised" && onEdit ? (
                    <Button size="sm" variant="outline" onClick={() => onEdit(item)}>
                      Edit
                    </Button>
                  ) : null}
                  {item.normalisationStatus === "skipped" && showUnskip && onUnskip ? (
                    <Button size="sm" variant="outline" onClick={() => onUnskip(item)}>
                      Unskip
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function QueueSection({
  title,
  description,
  items,
  groupBySupplier = false,
  onNormalise,
  onSkip,
  onUnskip,
  onEdit,
  showSkip,
  showUnskip,
}: {
  title: string;
  description?: string;
  items: NormalisationQueueItem[];
  groupBySupplier?: boolean;
  onNormalise: (item: NormalisationQueueItem) => void;
  onSkip?: (item: NormalisationQueueItem) => void;
  onUnskip?: (item: NormalisationQueueItem) => void;
  onEdit?: (item: NormalisationQueueItem) => void;
  showSkip?: boolean;
  showUnskip?: boolean;
}) {
  if (items.length === 0) return null;

  const sortedItems = sortQueueItems(items);
  const supplierGroups = groupBySupplier ? groupQueueItemsBySupplier(sortedItems) : [];

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>

      {groupBySupplier ? (
        <div className="space-y-6">
          {supplierGroups.map((group) => (
            <div key={group.supplierId} className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="font-medium">{group.supplierName}</h4>
                <span className="text-muted-foreground text-xs">
                  {group.items.length} {group.items.length === 1 ? "item" : "items"}
                </span>
              </div>
              <QueueItemsTable
                items={group.items}
                showSupplierColumn={false}
                onNormalise={onNormalise}
                onSkip={onSkip}
                onUnskip={onUnskip}
                onEdit={onEdit}
                showSkip={showSkip}
                showUnskip={showUnskip}
              />
            </div>
          ))}
        </div>
      ) : (
        <QueueItemsTable
          items={sortedItems}
          showSupplierColumn
          onNormalise={onNormalise}
          onSkip={onSkip}
          onUnskip={onUnskip}
          onEdit={onEdit}
          showSkip={showSkip}
          showUnskip={showUnskip}
        />
      )}
    </div>
  );
}

export function NormalisationQueuePage({ organisation, venue }: NormalisationQueuePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<NormalisationQueueItem | null>(null);

  const progressQuery = useInventorySetupProgressQuery({
    organisationSlug: organisation,
    venueSlug: venue,
  });

  const queueQuery = useNormalisationQueueQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    search: search.trim() || undefined,
  });

  const { skip, unskip } = useNormalisationMutations({
    organisationSlug: organisation,
    venueSlug: venue,
  });

  const items = queueQuery.data?.items ?? [];
  const counts = queueQuery.data?.counts;

  const pendingMain = useMemo(
    () =>
      items.filter(
        (i) => i.normalisationStatus === "pending" && i.bucket === "main",
      ),
    [items],
  );
  const pendingNonInventory = useMemo(
    () =>
      items.filter(
        (i) =>
          i.normalisationStatus === "pending" && i.bucket === "likely_non_inventory",
      ),
    [items],
  );
  const doneItems = useMemo(
    () =>
      items.filter(
        (i) => i.normalisationStatus === "normalised" || i.normalisationStatus === "skipped",
      ),
    [items],
  );

  useEffect(() => {
    if (isInventorySetupSectionsUnlockedForDev()) return;
    if (!progressQuery.data?.phase1Complete) {
      router.replace(buildScopedPath(organisation, venue, "settings/inventory-setup/suppliers"));
    }
  }, [progressQuery.data?.phase1Complete, organisation, venue, router]);

  useEffect(() => {
    const rawItemId = searchParams.get("rawItem");
    if (!rawItemId || items.length === 0) return;
    const match = items.find((i) => i.id === rawItemId);
    if (match && match.normalisationStatus === "pending") {
      setActiveItem(match);
      setWizardOpen(true);
    }
  }, [searchParams, items]);

  function openWizard(item: NormalisationQueueItem) {
    setActiveItem(item);
    setWizardOpen(true);
  }

  async function handleSkip(item: NormalisationQueueItem) {
    try {
      await skip.mutateAsync(item.id);
      toast.success("Item skipped");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to skip");
    }
  }

  async function handleUnskip(item: NormalisationQueueItem) {
    try {
      await unskip.mutateAsync(item.id);
      toast.success("Item returned to queue");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to unskip");
    }
  }

  const progress = progressQuery.data;
  const actioned = counts?.actioned ?? 0;
  const total = counts?.total ?? 0;

  return (
    <div className="space-y-5">
      {progress ? <SetupStepperBanner steps={progress.steps} /> : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Normalise supplier items</h2>
          <p className="text-muted-foreground text-sm">
            Convert invoice lines into master inventory ingredients and supplier products.
          </p>
        </div>
        {progress?.phase2Complete ? (
          <Button
            variant="outline"
            onClick={() =>
              router.push(
                buildScopedPath(organisation, venue, "settings/inventory-setup/master-inventory-list"),
              )
            }
          >
            Open master inventory list
          </Button>
        ) : null}
      </div>

      {progress?.hasNewPendingSinceComplete ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-start gap-2 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            <span>
              New invoice lines need normalisation ({progress.counts.pendingRawItemCount} pending).
              Other setup sections stay available.
            </span>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary">
          {actioned} of {total} actioned
        </Badge>
        {counts ? (
          <span className="text-muted-foreground text-sm">
            {counts.pending} pending · {counts.skipped} skipped · {counts.normalised} normalised
          </span>
        ) : null}
      </div>

      <div className="relative max-w-md">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          className="pl-9"
          placeholder="Search items or suppliers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {queueQuery.isLoading ? (
        <p className="text-muted-foreground text-sm" aria-busy="true">
          Loading queue…
        </p>
      ) : total === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm">
            <p className="font-medium">No raw items yet</p>
            <p className="text-muted-foreground mt-1">
              Add suppliers and raw items before normalising.
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() =>
                router.push(buildScopedPath(organisation, venue, "settings/inventory-setup/suppliers"))
              }
            >
              Go to suppliers
            </Button>
          </CardContent>
        </Card>
      ) : progress?.phase2Complete && counts?.pending === 0 ? (
        <Card>
          <CardContent className="space-y-3 p-6 text-sm">
            <p className="font-medium">Normalisation complete</p>
            <p className="text-muted-foreground">
              All raw items have been normalised or skipped. Continue to recipes and POS setup.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <QueueSection
        title="To normalise"
        items={pendingMain}
        groupBySupplier
        onNormalise={openWizard}
        onSkip={handleSkip}
        showSkip
      />

      <QueueSection
        title="Likely non-inventory"
        description="Fees, surcharges, and delivery charges — skip unless they should be tracked as inventory."
        items={pendingNonInventory}
        onNormalise={openWizard}
        onSkip={handleSkip}
        showSkip
      />

      <QueueSection
        title="Done"
        items={doneItems}
        onNormalise={openWizard}
        onEdit={openWizard}
        onUnskip={handleUnskip}
        showUnskip
      />

      <NormalisationWizardSheet
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        organisation={organisation}
        venue={venue}
        item={activeItem}
      />
    </div>
  );
}
