"use client";

import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "next/link";
import { useCallback, useState, useTransition } from "react";

import {
  publishNewsArticleAction,
  unpublishNewsArticleAction,
  updateNewsArticleDraftAction,
} from "@/entities/news/actions";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

export function NewsEditorShell({
  articleId,
  initialTitle,
  initialSlug,
  initialExcerpt,
  initialBody,
  initialStatus,
}: {
  articleId: string;
  initialTitle: string;
  initialSlug: string;
  initialExcerpt: string | null;
  initialBody: unknown;
  initialStatus: "draft" | "published";
}) {
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState(initialSlug);
  const [excerpt, setExcerpt] = useState(initialExcerpt ?? "");
  const [status, setStatus] = useState<"draft" | "published">(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const editor = useEditor({
    extensions: [StarterKit],
    content: (initialBody ?? {}) as JSONContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[280px] px-3 py-2 focus:outline-none prose prose-neutral dark:prose-invert max-w-none text-sm",
      },
    },
  });

  const saveDraft = useCallback(async () => {
    if (!editor) return false;
    setError(null);
    const res = await updateNewsArticleDraftAction({
      id: articleId,
      title,
      slug,
      excerpt: excerpt || null,
      bodyJson: editor.getJSON(),
    });
    if (!res.ok) {
      setError(res.message);
      return false;
    }
    return true;
  }, [articleId, editor, excerpt, slug, title]);

  const onSaveDraft = () => {
    startTransition(() => {
      void (async () => {
        await saveDraft();
      })();
    });
  };

  const onPublish = () => {
    startTransition(() => {
      void (async () => {
        const saved = await saveDraft();
        if (!saved) return;
        const res = await publishNewsArticleAction(articleId);
        if (!res.ok) {
          setError(res.message);
          return;
        }
        setStatus("published");
      })();
    });
  };

  const onUnpublish = () => {
    startTransition(() => {
      void (async () => {
        setError(null);
        const res = await unpublishNewsArticleAction(articleId);
        if (!res.ok) {
          setError(res.message);
          return;
        }
        setStatus("draft");
      })();
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/news/admin">← All articles</Link>
        </Button>
        {status === "published" ? (
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/news/${slug}`} target="_blank" rel="noreferrer">
              View live
            </Link>
          </Button>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not save</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="news-title">Title</Label>
          <Input
            id="news-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="news-slug">Slug</Label>
          <Input
            id="news-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2 flex items-end">
          <p className="text-xs text-muted-foreground pb-2">
            Status: <span className="font-medium text-foreground">{status}</span>
          </p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="news-excerpt">Excerpt (optional)</Label>
          <Textarea
            id="news-excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Body</Label>
        <div className="rounded-md border border-border bg-background">
          {editor ? <EditorContent editor={editor} /> : (
            <p className="p-4 text-sm text-muted-foreground">Loading editor…</p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Manual save only — leave the page before saving and you may lose changes.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onSaveDraft} disabled={pending || !editor}>
          Save draft
        </Button>
        {status === "draft" ? (
          <Button type="button" onClick={onPublish} disabled={pending || !editor}>
            Publish
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={onUnpublish} disabled={pending}>
            Unpublish
          </Button>
        )}
      </div>
    </div>
  );
}
