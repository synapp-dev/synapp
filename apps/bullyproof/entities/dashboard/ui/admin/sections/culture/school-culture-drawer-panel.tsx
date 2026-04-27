"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ExternalLink } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  cultureRatingsAdminApi,
  type SchoolCultureDetailResponse,
} from "@/entities/culture-rating/api/culture-ratings-admin-api";

export function SchoolCultureDrawerPanel({ schoolId }: { schoolId: string }) {
  const [detail, setDetail] = useState<SchoolCultureDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const res = await cultureRatingsAdminApi.getSchoolDetail(schoolId);
      if (cancelled) return;
      if (res.error) {
        setDetail(null);
        setError(res.error.message ?? "Failed to load");
      } else {
        setDetail(res.data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  const bench = detail?.benchmark;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Benchmark data</CardTitle>
          <CardDescription>
            {bench ? (
              <>
                Benchmark data entered for period –{" "}
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
        <CardContent>
          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/admin/culture-ratings?schoolId=${encodeURIComponent(schoolId)}`}
              className="inline-flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              Enter benchmark & comparative data
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparative periods</CardTitle>
          <CardDescription>
            Comparative data only compares to benchmark once both exist.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Report</TableHead>
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
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-muted-foreground text-sm">
                    No comparative periods yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
