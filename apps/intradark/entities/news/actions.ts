"use server";

import { track } from "@vercel/analytics/server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { allocateUniqueUrlSlug } from "@/entities/content/lib/slug";
import { formatZodActionError } from "@/entities/content/lib/format-zod-error";
import { isPostgresUniqueViolation } from "@/entities/content/lib/postgres-errors";
import { getEffectiveRoleSlugsForUser } from "@/entities/rbac/lib/get-effective-role-slugs";
import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { db } from "@/server/db/drizzle";
import { newsArticles } from "@/server/db/schema";

import type { NewsActionResult } from "./lib/action-types";
import { parseAndValidateBodyJson } from "./lib/article-payload";
import { hasNewsEditorRole } from "./lib/roles";
import { isNewsSlugTaken } from "./lib/queries";
import {
  articleIdSchema,
  createArticleDraftSchemaWithSlug,
  updateArticleDraftSchemaWithSlug,
} from "./lib/schemas";
import { slugifyTitle, validateSlug } from "./lib/slug";
import { EMPTY_TIPTAP_DOC_JSON } from "./lib/constants";

async function requireNewsEditor(): Promise<
  NewsActionResult<{ userId: string }>
> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, code: "FORBIDDEN", message: "Sign in required." };
  }
  const slugs = await getEffectiveRoleSlugsForUser(userId);
  if (!hasNewsEditorRole(slugs)) {
    return { ok: false, code: "FORBIDDEN", message: "News editor role required." };
  }
  return { ok: true, data: { userId } };
}

async function allocateUniqueSlug(preferred: string): Promise<string> {
  return allocateUniqueUrlSlug({
    preferred,
    slugify: slugifyTitle,
    validate: validateSlug,
    isTaken: isNewsSlugTaken,
  });
}

export async function createNewsArticleDraftAction(input: {
  title: string;
  slug?: string;
  excerpt?: string | null;
}): Promise<NewsActionResult<{ id: string; slug: string }>> {
  const gate = await requireNewsEditor();
  if (!gate.ok) return gate;

  const parsed = createArticleDraftSchemaWithSlug.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodActionError(parsed.error),
    };
  }

  const { title, slug: slugInput, excerpt } = parsed.data;
  const baseSlug =
    slugInput && slugInput.length > 0 ? slugInput : slugifyTitle(title);
  const slugFirst = validateSlug(baseSlug).ok ? baseSlug : slugifyTitle(title);
  const slugFinal = await allocateUniqueSlug(slugFirst);

  const now = new Date().toISOString();
  try {
    const [row] = await db
      .insert(newsArticles)
      .values({
        title,
        slug: slugFinal,
        excerpt: excerpt ?? null,
        bodyJson: EMPTY_TIPTAP_DOC_JSON,
        status: "draft",
        publishedAt: null,
        authorUserId: gate.data.userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: newsArticles.id, slug: newsArticles.slug });

    if (!row) {
      return { ok: false, code: "UNKNOWN", message: "Could not create article." };
    }
    revalidatePath("/news");
    revalidatePath("/news/admin");
    return { ok: true, data: { id: row.id, slug: row.slug } };
  } catch (err) {
    if (isPostgresUniqueViolation(err)) {
      return {
        ok: false,
        code: "DUPLICATE_SLUG",
        message: "Slug is already in use. Try a different slug.",
      };
    }
    console.error("[news] createNewsArticleDraftAction", err);
    return {
      ok: false,
      code: "UNKNOWN",
      message: "Something went wrong. Try again.",
    };
  }
}

export async function updateNewsArticleDraftAction(input: {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  bodyJson: unknown;
}): Promise<NewsActionResult<{ slug: string }>> {
  const gate = await requireNewsEditor();
  if (!gate.ok) return gate;

  const parsed = updateArticleDraftSchemaWithSlug.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodActionError(parsed.error),
    };
  }

  const body = parseAndValidateBodyJson(parsed.data.bodyJson);
  if (!body.ok) {
    const message =
      body.code === "oversize"
        ? "Article body is too large."
        : "Article body must be a JSON object.";
    return {
      ok: false,
      code: body.code === "oversize" ? "OVERSIZE_BODY" : "VALIDATION",
      message,
    };
  }

  const existing = await db
    .select()
    .from(newsArticles)
    .where(eq(newsArticles.id, parsed.data.id))
    .limit(1);
  const article = existing[0];
  if (!article) {
    return { ok: false, code: "NOT_FOUND", message: "Article not found." };
  }

  if (parsed.data.slug !== article.slug) {
    if (await isNewsSlugTaken(parsed.data.slug, parsed.data.id)) {
      return {
        ok: false,
        code: "DUPLICATE_SLUG",
        message: "Slug is already in use. Try a different slug.",
      };
    }
  }

  const now = new Date().toISOString();
  try {
    await db
      .update(newsArticles)
      .set({
        title: parsed.data.title,
        slug: parsed.data.slug,
        excerpt: parsed.data.excerpt ?? null,
        bodyJson: body.value,
        updatedAt: now,
      })
      .where(eq(newsArticles.id, parsed.data.id));

    revalidatePath("/news");
    revalidatePath("/news/admin");
    revalidatePath(`/news/${parsed.data.slug}`);
    revalidatePath(`/news/${article.slug}`);
    return { ok: true, data: { slug: parsed.data.slug } };
  } catch (err) {
    if (isPostgresUniqueViolation(err)) {
      return {
        ok: false,
        code: "DUPLICATE_SLUG",
        message: "Slug is already in use. Try a different slug.",
      };
    }
    console.error("[news] updateNewsArticleDraftAction", err);
    return {
      ok: false,
      code: "UNKNOWN",
      message: "Something went wrong. Try again.",
    };
  }
}

export async function publishNewsArticleAction(
  id: string,
): Promise<NewsActionResult<{ slug: string }>> {
  const gate = await requireNewsEditor();
  if (!gate.ok) return gate;

  const idParsed = articleIdSchema.safeParse({ id });
  if (!idParsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodActionError(idParsed.error),
    };
  }

  const rows = await db
    .select()
    .from(newsArticles)
    .where(eq(newsArticles.id, idParsed.data.id))
    .limit(1);
  const article = rows[0];
  if (!article) {
    return { ok: false, code: "NOT_FOUND", message: "Article not found." };
  }

  if (article.status === "published") {
    revalidatePath("/news");
    revalidatePath(`/news/${article.slug}`);
    return { ok: true, data: { slug: article.slug } };
  }

  const now = new Date().toISOString();
  await db
    .update(newsArticles)
    .set({
      status: "published",
      publishedAt: now,
      updatedAt: now,
    })
    .where(eq(newsArticles.id, idParsed.data.id));

  revalidatePath("/news");
  revalidatePath("/news/admin");
  revalidatePath(`/news/${article.slug}`);

  try {
    const h = await headers();
    await track(
      "news_published",
      { slug: article.slug },
      { request: { headers: h } },
    );
  } catch (e) {
    console.warn("[news] analytics track failed", e);
  }

  return { ok: true, data: { slug: article.slug } };
}

export async function unpublishNewsArticleAction(
  id: string,
): Promise<NewsActionResult<undefined>> {
  const gate = await requireNewsEditor();
  if (!gate.ok) return gate;

  const idParsed = articleIdSchema.safeParse({ id });
  if (!idParsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodActionError(idParsed.error),
    };
  }

  const rows = await db
    .select()
    .from(newsArticles)
    .where(eq(newsArticles.id, idParsed.data.id))
    .limit(1);
  const article = rows[0];
  if (!article) {
    return { ok: false, code: "NOT_FOUND", message: "Article not found." };
  }

  await db
    .update(newsArticles)
    .set({
      status: "draft",
      publishedAt: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(newsArticles.id, idParsed.data.id));

  revalidatePath("/news");
  revalidatePath("/news/admin");
  revalidatePath(`/news/${article.slug}`);
  return { ok: true, data: undefined };
}
