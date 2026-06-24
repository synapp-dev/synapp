"use client";

import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import Link from "next/link";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useCallback, useRef, useState, useTransition } from "react";

import {
  publishNewsArticleAction,
  unpublishNewsArticleAction,
  updateNewsArticleDraftAction,
} from "@/entities/news/actions";
import { uploadNewsCoverFile } from "@/entities/news/lib/upload-cover-client";
import { NEWS_TIPTAP_EXTENSIONS } from "@/entities/news/lib/tiptap-extensions";
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
  initialCoverImageUrl,
  initialBody,
  initialStatus,
}: {
  articleId: string;
  initialTitle: string;
  initialSlug: string;
  initialExcerpt: string | null;
  initialCoverImageUrl: string | null;
  initialBody: unknown;
  initialStatus: "draft" | "published";
}) {
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState(initialSlug);
  const [excerpt, setExcerpt] = useState(initialExcerpt ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(
    initialCoverImageUrl,
  );
  const [coverUploading, setCoverUploading] = useState(false);
  const [status, setStatus] = useState<"draft" | "published">(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const coverInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: NEWS_TIPTAP_EXTENSIONS,
    content: (initialBody ?? {}) as JSONContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[280px] px-3 py-2 focus:outline-none prose prose-neutral dark:prose-invert max-w-none text-sm",
      },
    },
  });

  const saveDraft = useCallback(
    async (overrides?: { coverImageUrl?: string | null }) => {
      if (!editor) return false;
      setError(null);
      const nextCover =
        overrides && "coverImageUrl" in overrides
          ? overrides.coverImageUrl
          : coverImageUrl;
      const res = await updateNewsArticleDraftAction({
        id: articleId,
        title,
        slug,
        excerpt: excerpt || null,
        coverImageUrl: nextCover ?? null,
        bodyJson: editor.getJSON(),
      });
      if (!res.ok) {
        setError(res.message);
        return false;
      }
      return true;
    },
    [articleId, coverImageUrl, editor, excerpt, slug, title],
  );

  const onPickCover = () => coverInputRef.current?.click();

  const onCoverSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setError(null);
    setCoverUploading(true);
    void (async () => {
      const res = await uploadNewsCoverFile(articleId, file);
      if (!res.ok) {
        setError(res.message);
        setCoverUploading(false);
        return;
      }
      setCoverImageUrl(res.publicUrl);
      await saveDraft({ coverImageUrl: res.publicUrl });
      setCoverUploading(false);
    })();
  };

  const onRemoveCover = () => {
    setCoverImageUrl(null);
    startTransition(() => {
      void saveDraft({ coverImageUrl: null });
    });
  };

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
        <Label>Banner image</Label>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={onCoverSelected}
        />
        {coverImageUrl ? (
          <div className="space-y-2">
            <div className="bg-muted relative aspect-[2/1] w-full max-w-xl overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element -- Supabase CDN media */}
              <img
                src={coverImageUrl}
                alt="Article banner preview"
                className="size-full object-cover"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onPickCover}
                disabled={coverUploading || pending}
              >
                {coverUploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ImagePlus className="size-4" />
                )}
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemoveCover}
                disabled={coverUploading || pending}
              >
                <Trash2 className="size-4" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onPickCover}
            disabled={coverUploading}
            className="border-border bg-background hover:bg-accent/40 text-muted-foreground flex aspect-[2/1] w-full max-w-xl flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm transition-colors disabled:opacity-60"
          >
            {coverUploading ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <ImagePlus className="size-6" />
            )}
            {coverUploading ? "Uploading…" : "Add a banner image"}
          </button>
        )}
        <p className="text-muted-foreground text-xs">
          Shown at the top of the article and as the card image on /news. PNG,
          JPEG, WebP, or GIF. Uploads save immediately.
        </p>
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
