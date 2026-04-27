"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Check,
  ChevronsUpDown,
  Download,
  Loader2,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@workspace/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Textarea } from "@workspace/ui/components/textarea";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  cultureRatingsAdminApi,
  type CultureComparativeRow,
  type CultureRatingsSchoolSummary,
  type SchoolCultureDetailResponse,
} from "@/entities/culture-rating/api/culture-ratings-admin-api";
import {
  CultureRatingMetricsFields,
  emptyCultureMetrics,
} from "./culture-rating-metrics-fields";
import { cn } from "@workspace/ui/lib/utils";

export function CultureRatingsAdminSection() {
  usePageTitle(["admin", "culture-ratings"]);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qpSchoolId = searchParams.get("schoolId");

  const [summary, setSummary] = useState<CultureRatingsSchoolSummary[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SchoolCultureDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [benchStart, setBenchStart] = useState("");
  const [benchEnd, setBenchEnd] = useState("");
  const [benchMetrics, setBenchMetrics] = useState(emptyCultureMetrics);
  const [benchNotes, setBenchNotes] = useState("");
  const [savingBench, setSavingBench] = useState(false);

  const [compStart, setCompStart] = useState("");
  const [compEnd, setCompEnd] = useState("");
  const [compMetrics, setCompMetrics] = useState(emptyCultureMetrics);
  const [savingComp, setSavingComp] = useState(false);

  const [editingComp, setEditingComp] = useState<CultureComparativeRow | null>(null);
  const [schoolComboOpen, setSchoolComboOpen] = useState(false);

  useEffect(() => {
    let ok = true;
    (async () => {
      setSummaryLoading(true);
      setSummaryError(null);
      const res = await cultureRatingsAdminApi.getSummary();
      if (!ok) return;
      if (res.error) {
        setSummaryError(res.error.message ?? "Failed to load schools");
        setSummary([]);
      } else {
        setSummary(res.data);
      }
      setSummaryLoading(false);
    })();
    return () => {
      ok = false;
    };
  }, []);

  useEffect(() => {
    if (qpSchoolId) setSelectedSchoolId(qpSchoolId);
  }, [qpSchoolId]);

  const loadDetail = useCallback(async (schoolId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    const res = await cultureRatingsAdminApi.getSchoolDetail(schoolId);
    if (res.error) {
      setDetail(null);
      setDetailError(res.error.message ?? "Failed to load school");
    } else {
      setDetail(res.data);
      if (res.data.benchmark) {
        setBenchStart(res.data.benchmark.periodStart);
        setBenchEnd(res.data.benchmark.periodEnd);
        setBenchMetrics({ ...res.data.benchmark.metrics });
        setBenchNotes(res.data.benchmark.sourceNotes ?? "");
      } else {
        setBenchStart("");
        setBenchEnd("");
        setBenchMetrics(emptyCultureMetrics());
        setBenchNotes("");
      }
    }
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    if (!selectedSchoolId) {
      setDetail(null);
      return;
    }
    loadDetail(selectedSchoolId);
  }, [selectedSchoolId, loadDetail]);

  const selectedSchoolName = useMemo(() => {
    if (!selectedSchoolId) return null;
    return summary.find((s) => s.schoolId === selectedSchoolId)?.schoolName ?? null;
  }, [summary, selectedSchoolId]);

  const chartRows = useMemo(() => {
    if (!detail?.comparatives?.length) return [];
    return [...detail.comparatives]
      .sort(
        (a, b) =>
          a.periodEnd.localeCompare(b.periodEnd) ||
          a.createdAt.localeCompare(b.createdAt)
      )
      .map((c) => ({
        label: `${c.periodStart} → ${c.periodEnd}`,
        attendanceΔ: c.improvement?.attendanceRateChangePercent ?? null,
        behaviourΔ: c.improvement?.behaviourIncidentsRateChangePercent ?? null,
        suspensionsΔ: c.improvement?.suspensionsRateChangePercent ?? null,
        exclusionsΔ: c.improvement?.exclusionsRateChangePercent ?? null,
        culture: c.improvement?.cultureRatingPercent ?? null,
      }));
  }, [detail]);

  async function saveBenchmark() {
    if (!selectedSchoolId) return;
    setSavingBench(true);
    const res = await cultureRatingsAdminApi.putBenchmark(selectedSchoolId, {
      periodStart: benchStart,
      periodEnd: benchEnd,
      metrics: benchMetrics,
      sourceNotes: benchNotes || null,
    });
    setSavingBench(false);
    if (res.error) {
      setDetailError(res.error.message ?? "Save failed");
      return;
    }
    await loadDetail(selectedSchoolId);
    const sum = await cultureRatingsAdminApi.getSummary();
    if (!sum.error) setSummary(sum.data);
  }

  async function addComparative() {
    if (!selectedSchoolId) return;
    setSavingComp(true);
    setDetailError(null);
    const res = await cultureRatingsAdminApi.postComparative(selectedSchoolId, {
      periodStart: compStart,
      periodEnd: compEnd,
      metrics: compMetrics,
    });
    setSavingComp(false);
    if (res.error) {
      setDetailError(res.error.message ?? "Failed to add comparative period");
      return;
    }
    setCompStart("");
    setCompEnd("");
    setCompMetrics(emptyCultureMetrics());
    await loadDetail(selectedSchoolId);
    const sum = await cultureRatingsAdminApi.getSummary();
    if (!sum.error) setSummary(sum.data);
  }

  async function saveEditedComparative() {
    if (!selectedSchoolId || !editingComp) return;
    setSavingComp(true);
    setDetailError(null);
    const res = await cultureRatingsAdminApi.patchComparative(
      selectedSchoolId,
      editingComp.id,
      {
        periodStart: editingComp.periodStart,
        periodEnd: editingComp.periodEnd,
        metrics: editingComp.metrics,
      }
    );
    setSavingComp(false);
    if (res.error) {
      setDetailError(res.error.message ?? "Update failed");
      return;
    }
    setEditingComp(null);
    await loadDetail(selectedSchoolId);
  }

  function selectSchool(schoolId: string) {
    setSelectedSchoolId(schoolId);
    setSchoolComboOpen(false);
    router.replace(
      `${pathname}?schoolId=${encodeURIComponent(schoolId)}`,
      { scroll: false }
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Culture ratings</h1>
        <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
          Enter benchmark data per school, add comparative periods outside the benchmark
          window, request reports, and upload completed PDFs. Improvement metrics follow
          the AP Culture Rating template.
        </p>
      </div>

      <div className="max-w-xl space-y-2">
        <Label htmlFor="culture-school-combo">School</Label>
        {summaryLoading ? (
          <div className="flex h-10 w-full max-w-xl items-center justify-center rounded-md border border-input bg-muted/30">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : summaryError ? (
          <p className="text-sm text-destructive">{summaryError}</p>
        ) : (
          <Popover open={schoolComboOpen} onOpenChange={setSchoolComboOpen}>
            <PopoverTrigger asChild>
              <Button
                id="culture-school-combo"
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={schoolComboOpen}
                className="h-10 w-full max-w-xl justify-between gap-2 px-3 font-normal shadow-none"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span
                    className={cn(
                      "truncate text-left",
                      selectedSchoolId ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {selectedSchoolName ?? "Search or select a school…"}
                  </span>
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[var(--radix-popover-trigger-width)] p-0"
              align="start"
            >
              <Command className="rounded-md border-0 shadow-none">
                <CommandInput placeholder="Search schools…" className="h-9" />
                <CommandList>
                  <CommandEmpty>No school found.</CommandEmpty>
                  <CommandGroup>
                    {summary.map((s) => (
                      <CommandItem
                        key={s.schoolId}
                        value={`${s.schoolName} ${s.slug ?? ""} ${s.schoolId}`}
                        onSelect={() => selectSchool(s.schoolId)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            selectedSchoolId === s.schoolId
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                          <span className="truncate font-medium">{s.schoolName}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {s.benchmarkPeriodStart
                              ? `Benchmark ${s.benchmarkPeriodStart}–${s.benchmarkPeriodEnd}`
                              : "No benchmark"}
                            {" · "}
                            {s.comparativeCount} comparative
                            {s.comparativeCount === 1 ? "" : "s"}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="space-y-4">
          {!selectedSchoolId ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Choose a school above to enter benchmark and comparative data.
                </p>
              </CardContent>
            </Card>
          ) : detailLoading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {detailError ? (
                <p className="text-sm text-destructive">{detailError}</p>
              ) : null}
              <Card>
                <CardHeader>
                  <CardTitle>{selectedSchoolName ?? "School"}</CardTitle>
                  <CardDescription>
                    Deep link:{" "}
                    <Link
                      className="text-primary underline-offset-4 hover:underline"
                      href={`/admin/culture-ratings?schoolId=${encodeURIComponent(selectedSchoolId)}`}
                    >
                      this school
                    </Link>
                  </CardDescription>
                </CardHeader>
              </Card>

              <Tabs defaultValue="benchmark">
                <TabsList>
                  <TabsTrigger value="benchmark">Benchmark</TabsTrigger>
                  <TabsTrigger value="comparatives">Comparative periods</TabsTrigger>
                  <TabsTrigger value="trends">Trends</TabsTrigger>
                </TabsList>

                <TabsContent value="benchmark" className="space-y-4 pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Benchmark period</CardTitle>
                      <CardDescription>
                        One benchmark per school. Comparative periods must not overlap
                        these dates.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Period start</Label>
                          <Input
                            type="date"
                            value={benchStart}
                            onChange={(e) => setBenchStart(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Period end</Label>
                          <Input
                            type="date"
                            value={benchEnd}
                            onChange={(e) => setBenchEnd(e.target.value)}
                          />
                        </div>
                      </div>
                      <CultureRatingMetricsFields
                        value={benchMetrics}
                        onChange={setBenchMetrics}
                      />
                      <div className="space-y-2">
                        <Label>Source notes (optional)</Label>
                        <Textarea
                          value={benchNotes}
                          onChange={(e) => setBenchNotes(e.target.value)}
                          rows={2}
                          placeholder="e.g. received from school via email …"
                        />
                      </div>
                      <Button onClick={saveBenchmark} disabled={savingBench || !benchStart || !benchEnd}>
                        {savingBench ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Save benchmark"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="comparatives" className="space-y-4 pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Add comparative period</CardTitle>
                      <CardDescription>
                        Must fall entirely outside the benchmark range (no overlapping
                        days).
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Period start</Label>
                          <Input
                            type="date"
                            value={compStart}
                            onChange={(e) => setCompStart(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Period end</Label>
                          <Input
                            type="date"
                            value={compEnd}
                            onChange={(e) => setCompEnd(e.target.value)}
                          />
                        </div>
                      </div>
                      <CultureRatingMetricsFields
                        value={compMetrics}
                        onChange={setCompMetrics}
                      />
                      <Button
                        onClick={addComparative}
                        disabled={savingComp || !compStart || !compEnd}
                      >
                        {savingComp ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Add comparative period"
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Existing periods</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Period</TableHead>
                            <TableHead>Culture %</TableHead>
                            <TableHead>Report</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detail?.comparatives?.length ? (
                            detail.comparatives.map((c) => (
                              <TableRow key={c.id}>
                                <TableCell className="font-mono text-xs">
                                  {c.periodStart} → {c.periodEnd}
                                </TableCell>
                                <TableCell>
                                  {c.improvement?.cultureRatingPercent != null
                                    ? `${c.improvement.cultureRatingPercent.toFixed(1)}%`
                                    : "—"}
                                </TableCell>
                                <TableCell>
                                  <span className="text-xs capitalize">
                                    {c.report?.status ?? "—"}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex flex-wrap justify-end gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      type="button"
                                      onClick={() => setEditingComp({ ...c })}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      type="button"
                                      onClick={async () => {
                                        if (!selectedSchoolId) return;
                                        const r =
                                          await cultureRatingsAdminApi.requestReport(
                                            selectedSchoolId,
                                            c.id
                                          );
                                        if (r.error) setDetailError(r.error.message ?? "");
                                        else await loadDetail(selectedSchoolId);
                                      }}
                                    >
                                      Request report
                                    </Button>
                                    <label className="inline-flex cursor-pointer">
                                      <input
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        className="sr-only"
                                        onChange={async (ev) => {
                                          const file = ev.target.files?.[0];
                                          ev.target.value = "";
                                          if (!file || !selectedSchoolId) return;
                                          const up =
                                            await cultureRatingsAdminApi.uploadReport(
                                              selectedSchoolId,
                                              c.id,
                                              file,
                                              file.name
                                            );
                                          if (up.ok === false) setDetailError(up.message);
                                          else await loadDetail(selectedSchoolId);
                                        }}
                                      />
                                      <span className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-secondary px-2 text-xs font-medium hover:bg-secondary/80">
                                        <Upload className="mr-1 h-3.5 w-3.5" />
                                        PDF
                                      </span>
                                    </label>
                                    {c.report?.status === "completed" ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        type="button"
                                        onClick={async () => {
                                          if (!selectedSchoolId) return;
                                          const r =
                                            await cultureRatingsAdminApi.getReportDownloadUrl(
                                              selectedSchoolId,
                                              c.id
                                            );
                                          if (r.error) {
                                            setDetailError(r.error.message ?? "");
                                            return;
                                          }
                                          window.open(
                                            r.data.url,
                                            "_blank",
                                            "noopener,noreferrer"
                                          );
                                        }}
                                      >
                                        <Download className="h-3.5 w-3.5" />
                                      </Button>
                                    ) : null}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      type="button"
                                      className="text-destructive"
                                      onClick={async () => {
                                        if (!selectedSchoolId) return;
                                        if (
                                          !confirm(
                                            "Delete this comparative period and its report record?"
                                          )
                                        )
                                          return;
                                        const r =
                                          await cultureRatingsAdminApi.deleteComparative(
                                            selectedSchoolId,
                                            c.id
                                          );
                                        if (r.error) setDetailError(r.error.message ?? "");
                                        else await loadDetail(selectedSchoolId);
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-muted-foreground">
                                No comparative periods yet.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {editingComp ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Edit comparative</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Period start</Label>
                            <Input
                              type="date"
                              value={editingComp.periodStart}
                              onChange={(e) =>
                                setEditingComp({
                                  ...editingComp,
                                  periodStart: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Period end</Label>
                            <Input
                              type="date"
                              value={editingComp.periodEnd}
                              onChange={(e) =>
                                setEditingComp({
                                  ...editingComp,
                                  periodEnd: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                        <CultureRatingMetricsFields
                          value={editingComp.metrics}
                          onChange={(m) =>
                            setEditingComp({ ...editingComp, metrics: m })
                          }
                        />
                        <div className="flex gap-2">
                          <Button onClick={saveEditedComparative} disabled={savingComp}>
                            {savingComp ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Save changes"
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            type="button"
                            onClick={() => setEditingComp(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}
                </TabsContent>

                <TabsContent value="trends" className="space-y-4 pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Improvement vs benchmark by period
                      </CardTitle>
                      <CardDescription>
                        Percentage change metrics (template-aligned). Requires benchmark
                        plus comparative periods.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[360px] w-full">
                      {chartRows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Add comparative periods to see trends.
                        </p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartRows}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} height={60} />
                            <YAxis tick={{ fontSize: 11 }} unit="%" />
                            <Tooltip />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="attendanceΔ"
                              name="Attendance rate Δ"
                              stroke="hsl(var(--chart-1))"
                              strokeWidth={2}
                              dot
                            />
                            <Line
                              type="monotone"
                              dataKey="behaviourΔ"
                              name="Behaviour rate Δ"
                              stroke="hsl(var(--chart-2))"
                              strokeWidth={2}
                              dot
                            />
                            <Line
                              type="monotone"
                              dataKey="suspensionsΔ"
                              name="Suspension rate Δ"
                              stroke="hsl(var(--chart-3))"
                              strokeWidth={2}
                              dot
                            />
                            <Line
                              type="monotone"
                              dataKey="exclusionsΔ"
                              name="Exclusion rate Δ"
                              stroke="hsl(var(--chart-4))"
                              strokeWidth={2}
                              dot
                            />
                            <Line
                              type="monotone"
                              dataKey="culture"
                              name="Culture rating %"
                              stroke="hsl(var(--primary))"
                              strokeWidth={2}
                              dot
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
      </div>
    </div>
  );
}
