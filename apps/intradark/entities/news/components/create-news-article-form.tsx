"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createNewsArticleDraftAction } from "@/entities/news/actions";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

export function CreateNewsArticleForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      void (async () => {
        setError(null);
        const res = await createNewsArticleDraftAction({
          title,
          slug: slug.trim() || undefined,
          excerpt: excerpt.trim() || null,
        });
        if (!res.ok) {
          setError(res.message);
          return;
        }
        router.push(`/news/admin/edit/${res.data.id}`);
      })();
    });
  };

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not create</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="new-title">Title</Label>
        <Input
          id="new-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={1}
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-slug">Slug (optional)</Label>
        <Input
          id="new-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="auto-generated from title if empty"
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-excerpt">Excerpt (optional)</Label>
        <Textarea
          id="new-excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={3}
        />
      </div>
      <Button type="submit" disabled={pending}>
        Create draft
      </Button>
    </form>
  );
}
