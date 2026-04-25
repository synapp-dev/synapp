import { notFound } from "next/navigation";

import { getDummyCaseBySlug } from "@/lib/dummy-cases";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

type Props = {
  params: Promise<{ caseSlug: string }>;
};

export default async function SafetyPlansPage({ params }: Props) {
  const { caseSlug } = await params;
  const c = getDummyCaseBySlug(caseSlug);
  if (!c) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Safety plans</h1>
        <p className="text-muted-foreground text-sm">
          Secure storage for plans linked to {c.displayName} (demo placeholder).
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            No files uploaded in this demo — workers would see versioned plans here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc text-sm text-muted-foreground space-y-2">
            <li>Youth safety plan v1 (draft)</li>
            <li>Carer emergency contacts sheet</li>
            <li>Risk review — last updated 2026-03-01</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
