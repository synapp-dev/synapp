import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Eye, EyeOff, FileText, Upload } from "lucide-react";

import { getDummyCaseBySlug } from "@/lib/dummy-cases";
import {
  getDummyCaseDocuments,
  type CaseDocumentCategory,
} from "@/lib/dummy-case-extras";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";

type Props = {
  params: Promise<{ caseSlug: string }>;
};

const CATEGORY_STYLES: Record<CaseDocumentCategory, string> = {
  Court:
    "border-destructive/40 bg-destructive/5 text-destructive",
  Assessment:
    "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  Consent:
    "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Plan: "border-primary/40 bg-primary/5 text-primary",
  Report:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

export default async function DocumentsPage({ params }: Props) {
  const { caseSlug } = await params;
  const c = getDummyCaseBySlug(caseSlug);
  if (!c) {
    notFound();
  }
  const documents = getDummyCaseDocuments(caseSlug);
  const firstName = c.displayName.split(" ")[0]!;

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="text-muted-foreground text-sm">
            Case document library for {c.displayName} (demo data).
          </p>
        </div>
        <Button size="sm" disabled title="Not wired in the demo">
          <Upload />
          Upload
        </Button>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="whitespace-nowrap">Version</TableHead>
                <TableHead className="whitespace-nowrap">Updated</TableHead>
                <TableHead>Visibility</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium">{doc.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {doc.sizeLabel}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "px-1.5 py-0 text-[10px]",
                        CATEGORY_STYLES[doc.category],
                      )}
                    >
                      {doc.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    v{doc.version}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {format(doc.updatedAt, "d MMM yyyy")}
                    <span className="ml-1 text-xs">· {doc.updatedBy}</span>
                  </TableCell>
                  <TableCell>
                    {doc.sharedWithYouth ? (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                        <Eye className="h-3.5 w-3.5" />
                        Shared with {firstName}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <EyeOff className="h-3.5 w-3.5" />
                        Worker only
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
