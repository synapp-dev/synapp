"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { softDeleteForumThreadAction } from "@/entities/forums/actions";
import { Button } from "@workspace/ui/components/button";

export function ForumThreadDeleteButton({
  threadId,
  categorySlug,
}: {
  threadId: string;
  categorySlug: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="text-destructive border-destructive/40"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this thread? Replies will no longer be visible.")) {
          return;
        }
        startTransition(async () => {
          const res = await softDeleteForumThreadAction({ threadId });
          if (!res.ok) {
            alert(res.message);
            return;
          }
          router.push(`/forums/${categorySlug}`);
          router.refresh();
        });
      }}
    >
      {pending ? "Deleting…" : "Delete thread"}
    </Button>
  );
}
