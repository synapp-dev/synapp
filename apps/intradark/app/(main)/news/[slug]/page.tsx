import { notFound } from "next/navigation";

import { NewsArticleBodyHtml } from "@/entities/news/components/news-article-body-html";
import { NewsArticleView } from "@/entities/news/components/news-article-view";
import { collectNewsCommentIds } from "@/entities/news/lib/comments/build-comment-tree";
import { listNewsCommentsForArticle } from "@/entities/news/lib/comments/queries";
import {
  getPublishedArticleBySlug,
  getTagsForArticleIds,
} from "@/entities/news/lib/queries";
import { readTimeFromDoc } from "@/entities/news/lib/read-time";
import { getNewsSubscriptionState } from "@/entities/news/lib/subscribe/queries";
import { getNewsViewBreakdown } from "@/entities/news/lib/views/queries";
import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import {
  getReactionsForTarget,
  getReactionsForTargets,
} from "@/entities/reactions/lib/queries";
import type { ReactionAuthor } from "@/entities/reactions/lib/types";
import { viewerAuthorFromProfiles } from "@/entities/reactions/lib/viewer";
import { getCurrentUserProfiles } from "@/lib/get-current-user-profiles";

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) {
    notFound();
  }

  const [tagsMap, commentsPage, viewer, userId, views] = await Promise.all([
    getTagsForArticleIds([article.id]),
    listNewsCommentsForArticle(article.id),
    getCurrentUserProfiles(),
    getSessionUserId(),
    getNewsViewBreakdown(article.id),
  ]);

  const tags = tagsMap.get(article.id) ?? [];

  const commentIds = collectNewsCommentIds(commentsPage.trees);
  const [reactionsMap, articleReactions, subscription] = await Promise.all([
    getReactionsForTargets("news_comment", commentIds),
    getReactionsForTarget("news_article", article.id),
    getNewsSubscriptionState(userId),
  ]);
  const reactionsByComment = Object.fromEntries(reactionsMap);

  const author: ReactionAuthor = {
    userId: article.authorUserId,
    username: article.authorUsername,
    displayName: article.authorDisplayName,
    avatarUrl: article.authorAvatarUrl,
    countryFlag: article.authorCountryFlag,
    steamid64: article.authorSteamid64,
  };

  return (
    <NewsArticleView
      article={{
        id: article.id,
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        coverImageUrl: article.coverImageUrl,
        publishedAt: article.publishedAt,
        author,
        authorBio: article.authorBio,
      }}
      tags={tags}
      readTime={readTimeFromDoc(article.bodyJson)}
      views={views}
      subscription={subscription}
      body={<NewsArticleBodyHtml doc={article.bodyJson} />}
      commentsPage={commentsPage}
      reactionsByComment={reactionsByComment}
      articleReactions={articleReactions}
      viewerUserId={viewer?.user.id ?? null}
      viewerAuthor={viewerAuthorFromProfiles(viewer)}
      canWrite={Boolean(userId)}
    />
  );
}
