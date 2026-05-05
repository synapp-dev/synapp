import Link from "next/link";
import { format } from "date-fns";

import { MainSectionShell } from "@/components/organisms/main-section-shell";
import { listAllNewsArticlesForAdmin } from "@/entities/news/lib/queries";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

export default async function NewsAdminIndexPage() {
  const rows = await listAllNewsArticlesForAdmin();

  return (
    <MainSectionShell
      title="News admin"
      description="Create drafts, publish, and manage articles."
    >
      <div className="flex justify-end mb-6">
        <Button asChild>
          <Link href="/news/admin/new">Create article</Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground border border-dashed rounded-lg py-10 text-center">
          No articles yet.{" "}
          <Link href="/news/admin/new" className="text-primary underline">
            Create one
          </Link>
          .
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium max-w-[240px] truncate">
                  {r.title}
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {r.slug}
                </TableCell>
                <TableCell>
                  <Badge variant={r.status === "published" ? "default" : "secondary"}>
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {format(new Date(r.updatedAt), "MMM d, yyyy HH:mm")}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/news/admin/edit/${r.id}`}>Edit</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </MainSectionShell>
  );
}
