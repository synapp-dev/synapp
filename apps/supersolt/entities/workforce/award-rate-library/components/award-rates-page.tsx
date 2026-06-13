"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, Scale } from "lucide-react";
import { toast } from "sonner";
import { useScopedSettingsAccess } from "@/entities/access/model/use-scoped-settings-access";
import {
  awardRatesApi,
  type AwardRateCardDto,
  type AwardRatesListPayload,
} from "@/entities/workforce/award-rate-library/api/endpoints";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

type AwardRatesPageProps = {
  organisation: string;
  venue: string;
};

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function AwardRatesPage({ organisation, venue }: AwardRatesPageProps) {
  const access = useScopedSettingsAccess();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [payload, setPayload] = useState<AwardRatesListPayload | null>(null);
  const [rateCard, setRateCard] = useState<AwardRateCardDto | null>(null);
  const [awrOpen, setAwrOpen] = useState(false);
  const [awrRows, setAwrRows] = useState<Array<{
    userProfileId: string;
    currentRateCents: number | null;
    newMinimumCents: number;
    action: string;
    checked: boolean;
  }>>([]);
  const [defaultAward, setDefaultAward] = useState("MA000119");
  const [ebaCovered, setEbaCovered] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await awardRatesApi.list(organisation);
      setPayload(data);
      setDefaultAward(data.config.defaultAwardCode ?? "MA000119");
      setEbaCovered(data.config.isEbaCovered);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load award rates");
    } finally {
      setLoading(false);
    }
  }, [organisation]);

  useEffect(() => {
    void load();
  }, [load]);

  const openRateCard = useCallback(
    async (awardCode: string) => {
      setBusy(true);
      try {
        const card = await awardRatesApi.getRateCard(organisation, awardCode);
        setRateCard(card);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load rate card");
      } finally {
        setBusy(false);
      }
    },
    [organisation],
  );

  async function saveConfig() {
    setBusy(true);
    try {
      const data = await awardRatesApi.updateConfig(organisation, {
        defaultAwardCode: defaultAward,
        isEbaCovered: ebaCovered,
      });
      setPayload(data);
      toast.success("Organisation award settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setBusy(false);
    }
  }

  async function openAwrPreview() {
    setBusy(true);
    try {
      const preview = await awardRatesApi.previewAwr(organisation, "2026-07-01", 2026);
      setAwrRows(
        preview.rows.map((r) => ({
          userProfileId: r.userProfileId,
          currentRateCents: r.currentRateCents,
          newMinimumCents: r.newMinimumCents,
          action: r.action,
          checked: r.checkedByDefault,
        })),
      );
      setAwrOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load AWR preview");
    } finally {
      setBusy(false);
    }
  }

  async function applyAwr() {
    const selected = awrRows.filter((r) => r.checked);
    if (selected.length === 0) {
      toast.error("Select at least one employee");
      return;
    }
    setBusy(true);
    try {
      await awardRatesApi.applyAwr(organisation, {
        effectiveDate: "2026-07-01",
        awrYear: 2026,
        sourcePrReference: "PR786658",
        rows: selected.map((r) => ({
          userProfileId: r.userProfileId,
          newRateCents: r.newMinimumCents,
        })),
      });
      toast.success(`Applied uplift for ${selected.length} employees`);
      setAwrOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to apply AWR uplift");
    } finally {
      setBusy(false);
    }
  }

  const awards = payload?.awards ?? [];

  if (!access.canSeeAwardRates) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          You do not have permission to view award rates.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading award rates…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Scale className="size-5" aria-hidden />
            Award rates
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Fair Work award minimums and penalty schedules used by roster costing and payroll pre-flight.
          </p>
        </div>
        <Button variant="outline" onClick={() => void openAwrPreview()} disabled={busy || ebaCovered}>
          Run AWR uplift
        </Button>
      </div>

      {ebaCovered ? (
        <Card>
          <CardContent className="text-muted-foreground pt-6 text-sm">
            This organisation is marked as EBA-covered. Award minimum enforcement uses per-employee EBA rates.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Organisation configuration</CardTitle>
          <CardDescription>Default award for new employees and EBA flag.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="default-award">Default award</Label>
            <Select value={defaultAward} onValueChange={setDefaultAward}>
              <SelectTrigger id="default-award">
                <SelectValue placeholder="Select award" />
              </SelectTrigger>
              <SelectContent>
                {awards.map((a) => (
                  <SelectItem key={a.awardCode} value={a.awardCode}>
                    {a.awardShortName} ({a.awardCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Checkbox
              id="eba-covered"
              checked={ebaCovered}
              onCheckedChange={(v) => setEbaCovered(v === true)}
            />
            <Label htmlFor="eba-covered">Covered by EBA</Label>
          </div>
          <Button onClick={() => void saveConfig()} disabled={busy}>
            Save
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {awards.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground pt-6 text-sm">
              No awards loaded yet. Contact support if you need an award enabled.
            </CardContent>
          </Card>
        ) : (
          awards.map((award) => (
            <Card key={award.awardCode}>
              <CardHeader>
                <CardTitle className="text-base">{award.awardName}</CardTitle>
                <CardDescription>{award.awardCode} · {award.prReference}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => void openRateCard(award.awardCode)}>
                  View rate card
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <a href={award.sourceUrl} target="_blank" rel="noopener noreferrer">
                    Fair Work <ExternalLink className="ml-1 size-3" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Sheet open={Boolean(rateCard)} onOpenChange={(open) => !open && setRateCard(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {rateCard ? (
            <>
              <SheetHeader>
                <SheetTitle>{rateCard.award.awardName}</SheetTitle>
                <SheetDescription>
                  {rateCard.award.prReference}
                  {rateCard.lastUpdated
                    ? ` · Updated ${new Date(rateCard.lastUpdated.appliedAt).toLocaleDateString("en-AU")}`
                    : null}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="mb-2 text-sm font-medium">Minimum hourly rates</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Grade</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Base</TableHead>
                        <TableHead className="text-right">Casual</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rateCard.rates.map((r) => (
                        <TableRow key={`${r.grade}-${r.employmentType}`}>
                          <TableCell>{r.grade}</TableCell>
                          <TableCell>{r.employmentType.replace("_", " ")}</TableCell>
                          <TableCell className="text-right">{formatMoney(r.baseHourlyCents)}</TableCell>
                          <TableCell className="text-right">{formatMoney(r.casualLoadedHourlyCents)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium">Penalty schedule</h3>
                  <div className="flex flex-wrap gap-2">
                    {rateCard.penalties.map((p, i) => (
                      <Badge key={i} variant="secondary">
                        {p.dayType} {p.employmentTypeScope}{" "}
                        {p.upliftType === "percentage" ? `+${p.upliftValue}%` : `+$${(p.upliftValue / 100).toFixed(2)}/hr`}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={awrOpen} onOpenChange={setAwrOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AWR uplift preview</DialogTitle>
            <DialogDescription>
              Effective 1 July 2026. Select employees to apply new award minimums.
            </DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead>Employee</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>New min</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {awrRows.map((row) => (
                <TableRow key={row.userProfileId}>
                  <TableCell>
                    <Checkbox
                      checked={row.checked}
                      onCheckedChange={(v) =>
                        setAwrRows((prev) =>
                          prev.map((r) =>
                            r.userProfileId === row.userProfileId ? { ...r, checked: v === true } : r,
                          ),
                        )
                      }
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.userProfileId.slice(0, 8)}…</TableCell>
                  <TableCell>{row.currentRateCents != null ? formatMoney(row.currentRateCents) : "—"}</TableCell>
                  <TableCell>{formatMoney(row.newMinimumCents)}</TableCell>
                  <TableCell>{row.action.replace("_", " ")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAwrOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void applyAwr()} disabled={busy}>
              Apply selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
