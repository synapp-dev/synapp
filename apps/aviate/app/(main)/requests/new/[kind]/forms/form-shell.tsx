"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Card } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";

import { kindConfig, type RequestKind } from "@/lib/requests/config";
import { KindIcon } from "@/app/(main)/requests/components/request-visuals";
import { useMyEmployee } from "@/hooks/requests/use-requests";

/**
 * Chrome shared by every request form: back link, kind header, the approval
 * chain the submission will follow, and the "acting as" identity. The form
 * fields and submit button are passed as children.
 */
export function RequestFormShell({
  kind,
  children,
}: {
  kind: RequestKind;
  children: React.ReactNode;
}) {
  const config = kindConfig(kind);
  const { data: me } = useMyEmployee();

  return (
    <div className="space-y-6 py-6">
      <Link
        href="/requests"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All requests
      </Link>

      <div className="flex items-start gap-3">
        <KindIcon kind={kind} className="size-11" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{config.label}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {config.description}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="p-5">{children}</Card>

        <div className="space-y-4">
          <Card className="gap-3 p-5">
            <p className="text-sm font-semibold">Approval chain</p>
            <ol className="space-y-2">
              {config.chain.map((step, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                    {i + 1}
                  </span>
                  {step.label}
                </li>
              ))}
            </ol>
            <Separator />
            <p className="text-xs text-muted-foreground">
              Digitises the paper{" "}
              <span className="font-medium text-foreground">
                {config.paperForm}
              </span>{" "}
              form.
            </p>
          </Card>

          <Card className="gap-1 p-5">
            <p className="text-xs text-muted-foreground">Submitting as</p>
            <p className="font-medium">
              {me ? me.fullName : "Your account"}
            </p>
            {me ? (
              <p className="text-xs text-muted-foreground">
                {me.jobTitle ? `${me.jobTitle} · ` : ""}
                {me.employeeCode}
              </p>
            ) : (
              <p className="text-xs text-amber-600">
                Not linked to an employee record — the request may not be
                attributed to you.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
