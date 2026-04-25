import { notFound } from "next/navigation";

import { getDummyCaseBySlug } from "@/lib/dummy-cases";
import { getDummyCorrespondence } from "@/lib/dummy-case-content";
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

type Props = {
  params: Promise<{ caseSlug: string }>;
};

export default async function CorrespondencePage({ params }: Props) {
  const { caseSlug } = await params;
  const c = getDummyCaseBySlug(caseSlug);
  if (!c) {
    notFound();
  }
  const rows = getDummyCorrespondence(caseSlug);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Correspondence</h1>
        <p className="text-muted-foreground text-sm">
          Demo log for {c.displayName} — Victoria youth justice (not real data).
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent contact</CardTitle>
          <CardDescription>
            Track how you have engaged with this case (placeholder rows).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Worker</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap">{row.date}</TableCell>
                  <TableCell>{row.channel}</TableCell>
                  <TableCell>{row.summary}</TableCell>
                  <TableCell>{row.worker}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
