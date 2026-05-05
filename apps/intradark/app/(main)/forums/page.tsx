import Link from "next/link";

import { ForumCategoryGrid } from "@/entities/forums/components/forum-category-grid";
import { listForumCategories } from "@/entities/forums/lib/queries";
import { MainSectionShell } from "@/components/organisms/main-section-shell";
import { Button } from "@workspace/ui/components/button";

export default async function ForumsPage() {
  const categories = await listForumCategories();

  return (
    <MainSectionShell
      title="Forums"
      description="CS2 discussion, LFT, feature ideas, and competitive talk — nested replies like Reddit."
    >
      <div className="space-y-6">
        <ForumCategoryGrid categories={categories} />
        <p className="text-muted-foreground text-sm">
          Pick a board to browse threads.{" "}
          <Button asChild variant="link" className="h-auto p-0 text-sm">
            <Link href="/auth?returnTo=%2Fforums">Sign in</Link>
          </Button>{" "}
          to start threads and reply.
        </p>
      </div>
    </MainSectionShell>
  );
}
