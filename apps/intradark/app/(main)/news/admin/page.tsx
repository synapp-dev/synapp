import Link from "next/link";
import { format } from "date-fns";

import { MainSectionShell } from "@/components/organisms/main-section-shell";
import {
  getTagsForArticleIds,
  listAllNewsArticlesForAdmin,
} from "@/entities/news/lib/queries";
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

const SOURCE_LABELS: Record<string, string> = {
  steam_cs2: "CS2 feed",
};

export default async function NewsAdminIndexPage() {
  const rows = await listAllNewsArticlesForAdmin();
  const tagsByArticle = await getTagsForArticleIds(rows.map((r) => r.id));
  const draftCount = rows.filter((r) => r.status === "draft").length;

  return (
    <MainSectionShell
      title="News admin"
      description="Auto-imported CS2 updates land here as drafts. Review, tag, and publish."
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {rows.length} article{rows.length === 1 ? "" : "s"} ·{" "}
          <span className="text-foreground font-medium">{draftCount}</span> in
          draft queue
        </p>
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
              <TableHead>Source</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const tags = tagsByArticle.get(r.id) ?? [];
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium max-w-[260px] truncate">
                    {r.title}
                  </TableCell>
                  <TableCell>
                    {r.source ? (
                      <Badge variant="outline" className="text-[10px]">
                        {SOURCE_LABELS[r.source] ?? r.source}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">Manual</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {tags.length > 0 ? (
                        tags.map((t) => (
                          <Badge
                            key={t.slug}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {t.label}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={r.status === "published" ? "default" : "secondary"}
                    >
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
              );
            })}
          </TableBody>
        </Table>
      )}
    </MainSectionShell>
  );
}
