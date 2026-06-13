"use client";

import Link from "next/link";
import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";
import { usePeopleDetail } from "@/entities/workforce/people/hooks/use-people-detail";
import {
  COMPLIANCE_STRIP_LABEL,
  ROLE_BADGE_VARIANT,
  ROLE_STYLES,
  formatHourlyRate,
  formatStartDate,
  getInitials,
} from "@/entities/workforce/people/model/staff-model";
import { buildScopedPath } from "@/lib/build-scoped-path";

type PeopleDetailPageProps = {
  organisation: string;
  venue: string;
  userOrganisationId: string;
};

export function PeopleDetailPage({
  organisation,
  venue,
  userOrganisationId,
}: PeopleDetailPageProps) {
  const { employee, loadError, isLoading } = usePeopleDetail(organisation, userOrganisationId);
  const listHref = buildScopedPath(organisation, venue, "workforce/people");

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading employee…
      </div>
    );
  }

  if (loadError || !employee) {
    return (
      <section className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href={listHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to People
          </Link>
        </Button>
        <p className="text-sm text-destructive">{loadError ?? "Employee not found"}</p>
      </section>
    );
  }

  const compliance = employee.complianceStatus ?? "green";

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href={listHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            People
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold",
              ROLE_STYLES[employee.roleTier],
            )}
          >
            {getInitials(employee.name)}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{employee.name}</h1>
            <p className="text-sm text-muted-foreground">{employee.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant={ROLE_BADGE_VARIANT[employee.roleTier]}>
                {employee.roleDisplayName}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {employee.employmentType.replace("_", " ")}
              </Badge>
            </div>
          </div>
        </div>
        <Badge
          variant={compliance === "green" ? "secondary" : compliance === "amber" ? "outline" : "destructive"}
          className="gap-1"
        >
          {compliance !== "green" ? <ShieldAlert className="h-3 w-3" /> : null}
          {COMPLIANCE_STRIP_LABEL[compliance]}
        </Badge>
      </div>

      {employee.warnings.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Compliance warnings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {employee.warnings.map((w) => (
              <p key={w.code}>{w.message}</p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Separator />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Start date" value={formatStartDate(employee.startDate)} />
            <Row
              label="Continuous service"
              value={
                employee.continuousServiceStartDate
                  ? formatStartDate(employee.continuousServiceStartDate)
                  : "—"
              }
            />
            <Row label="Award" value={employee.awardCode ?? "—"} />
            <Row label="Classification" value={employee.classificationLevel ?? "—"} />
            {employee.needsSupersoltDetail ? (
              <p className="text-amber-700 dark:text-amber-400">
                Imported from Xero — complete award, venue, and certifications in Supersolt.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row
              label="Rate"
              value={
                employee.payRateCents != null
                  ? `${formatHourlyRate(employee.payRateCents)} / ${employee.payRatePeriod}`
                  : "—"
              }
            />
            <Row
              label="FWIS issued"
              value={employee.fwisIssuedDate ? formatStartDate(employee.fwisIssuedDate) : "—"}
            />
            <Row
              label="CEIS issued"
              value={employee.ceisIssuedDate ? formatStartDate(employee.ceisIssuedDate) : "—"}
            />
          </CardContent>
        </Card>

        {employee.sensitive ? (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Sensitive (Owner / self)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm md:grid-cols-2">
              <Row label="TFN on file" value={employee.sensitive.hasTfn ? "Yes" : "No"} />
              <Row label="TFN status" value={String(employee.sensitive.tfnStatus ?? "—")} />
              <Row label="Super USI" value={String(employee.sensitive.superFundUsi ?? "—")} />
              <Row label="Visa subclass" value={String(employee.sensitive.visaSubclass ?? "—")} />
            </CardContent>
          </Card>
        ) : (
          <Card className="md:col-span-2 border-dashed">
            <CardContent className="py-6 text-sm text-muted-foreground">
              Sensitive payroll fields are visible only to the employee and organisation Owner.
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
