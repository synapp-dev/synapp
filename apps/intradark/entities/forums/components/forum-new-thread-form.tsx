"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createForumThreadAction } from "@/entities/forums/actions";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

type Tag = { id: string; slug: string; label: string };

export function ForumNewThreadForm({
  categorySlug,
  tags,
}: {
  categorySlug: string;
  tags: Tag[];
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const selectedSlugs = React.useMemo(
    () => tags.filter((t) => selected[t.slug]).map((t) => t.slug),
    [tags, selected],
  );

  function toggleTag(slug: string, checked: boolean) {
    setSelected((prev) => {
      const next = { ...prev, [slug]: checked };
      const count = tags.filter((t) => next[t.slug]).length;
      if (checked && count > 5) return prev;
      return next;
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createForumThreadAction({
        categorySlug,
        title,
        body,
        tagSlugs: selectedSlugs,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.push(`/forums/${res.data.categorySlug}/${res.data.threadSlug}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="forum-title">Title</Label>
        <Input
          id="forum-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={500}
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="forum-body">Body</Label>
        <Textarea
          id="forum-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={10}
          className="min-h-[200px] resize-y"
        />
        <p className="text-muted-foreground text-xs">
          Plain text for MVP — keep it constructive.
        </p>
      </div>
      {tags.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Tags (max 5)</legend>
          <div className="flex flex-wrap gap-4">
            {tags.map((t) => (
              <label
                key={t.id}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={Boolean(selected[t.slug])}
                  onCheckedChange={(v) => toggleTag(t.slug, v === true)}
                />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Posting…" : "Create thread"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={`/forums/${categorySlug}`}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
