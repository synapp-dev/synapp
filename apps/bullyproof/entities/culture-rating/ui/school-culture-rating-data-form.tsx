"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
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
import { SchoolPageCompactHeader } from "@/components/molecules/school-page-compact-header";
import { useStorageImageUrl } from "@/hooks/use-storage-image-url";
import { useSchoolStore } from "@/stores/school-store";
import { cultureRatingsSchoolApi } from "@/entities/culture-rating/api/culture-ratings-school-api";
import type {
  CultureComparativeRow,
  SchoolCultureDetailResponse,
} from "@/entities/culture-rating/api/culture-ratings-admin-api";
import {
  CultureRatingMetricsFields,
  emptyCultureMetrics,
} from "@/entities/dashboard/ui/admin/sections/culture/culture-rating-metrics-fields";
import { usePageTitle } from "@/hooks/use-page-title";

export function SchoolCultureRatingDataForm({
  title,
  description,
  pageTitleSegments,
}: {
  title: string;
  description: string;
  pageTitleSegments: string[];
}) {
  usePageTitle(pageTitleSegments);

  const currentSchool = useSchoolStore((s) => s.currentSchool);
  const banner = useStorageImageUrl(currentSchool?.bannerUrl ?? null);
  const avatar = useStorageImageUrl(currentSchool?.avatarUrl ?? null);
  const headerReady =
    !(!!currentSchool?.bannerUrl && banner.loading) &&
    !(!!currentSchool?.avatarUrl && avatar.loading);

  const [detail, setDetail] = useState<SchoolCultureDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compStart, setCompStart] = useState("");
  const [compEnd, setCompEnd] = useState("");
  const [compMetrics, setCompMetrics] = useState(emptyCultureMetrics);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<CultureComparativeRow | null>(null);

  const schoolId = currentSchool?.id;

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    const res = await cultureRatingsSchoolApi.getDetail(schoolId);
    if (res.error) {
      setDetail(null);
      setError(res.error.message ?? "Failed to load");
    } else {
      setDetail(res.data);
    }
    setLoading(false);
  }, [schoolId]);

  useEffect(() => {
    if (schoolId) load();
  }, [schoolId, load]);

  async function addComparative() {
    if (!schoolId) return;
    setSaving(true);
    setError(null);
    const res = await cultureRatingsSchoolApi.postComparative(schoolId, {
      periodStart: compStart,
      periodEnd: compEnd,
      metrics: compMetrics,
    });
    setSaving(false);
    if (res.error) {
      setError(res.error.message ?? "Could not save");
      return;
    }
    setCompStart("");
    setCompEnd("");
    setCompMetrics(emptyCultureMetrics());
    await load();
  }

  async function saveEdit() {
    if (!schoolId || !editing) return;
    setSaving(true);
    setError(null);
    const res = await cultureRatingsSchoolApi.patchComparative(
      schoolId,
      editing.id,
      {
        periodStart: editing.periodStart,
        periodEnd: editing.periodEnd,
        metrics: editing.metrics,
      }
    );
    setSaving(false);
    if (res.error) {
      setError(res.error.message ?? "Could not save");
      return;
    }
    setEditing(null);
    await load();
  }

  if (!currentSchool) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-semibold">School not found</h1>
      </div>
    );
  }

  const bench = detail?.benchmark;

  return (
    <div className="space-y-6">
      <SchoolPageCompactHeader
        bannerUrl={banner.url}
        avatarUrl={avatar.url}
        title={title}
        description={description}
        isLoading={!headerReady}
      />

      <div className="space-y-6 px-1">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Benchmark</CardTitle>
            <CardDescription>
              {bench ? (
                <>
                  Benchmark data has been entered for period –{" "}
                  <span className="font-medium text-foreground">
                    {bench.periodStart} to {bench.periodEnd}
                  </span>
                  .
                </>
              ) : (
                <>Benchmark data has not been provided.</>
              )}
            </CardDescription>
          </CardHeader>
        </Card>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add comparative period</CardTitle>
                <CardDescription>
                  The comparative period must start after the benchmark period
                  end, must not overlap the benchmark, and must include at least
                  20 school days in the metrics. Bullyproof will review your
                  request and upload the official report when ready.
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
                  disabled={saving || !compStart || !compEnd}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save comparative period"
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your periods</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
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
                          <TableCell className="text-xs capitalize">
                            {c.report?.status ?? "—"}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              onClick={() => setEditing({ ...c })}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              onClick={async () => {
                                if (!schoolId) return;
                                const r = await cultureRatingsSchoolApi.requestReport(
                                  schoolId,
                                  c.id
                                );
                                if (r.error) setError(r.error.message ?? "");
                                else await load();
                              }}
                            >
                              Request report
                            </Button>
                            {c.report?.status === "completed" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                onClick={async () => {
                                  if (!schoolId) return;
                                  const r =
                                    await cultureRatingsSchoolApi.getReportDownloadUrl(
                                      schoolId,
                                      c.id
                                    );
                                  if (r.error) {
                                    setError(r.error.message ?? "");
                                    return;
                                  }
                                  window.open(
                                    r.data.url,
                                    "_blank",
                                    "noopener,noreferrer"
                                  );
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-muted-foreground text-sm"
                        >
                          No comparative periods yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {editing ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Edit period</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Period start</Label>
                      <Input
                        type="date"
                        value={editing.periodStart}
                        onChange={(e) =>
                          setEditing({ ...editing, periodStart: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Period end</Label>
                      <Input
                        type="date"
                        value={editing.periodEnd}
                        onChange={(e) =>
                          setEditing({ ...editing, periodEnd: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <CultureRatingMetricsFields
                    value={editing.metrics}
                    onChange={(m) => setEditing({ ...editing, metrics: m })}
                  />
                  <div className="flex gap-2">
                    <Button onClick={saveEdit} disabled={saving}>
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setEditing(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
