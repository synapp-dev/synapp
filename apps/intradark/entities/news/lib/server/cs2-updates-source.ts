import "server-only";

/** Counter-Strike 2 (appid 730) news feed via the public Steam Web API (no key required). */
const STEAM_NEWS_URL =
  "https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/";
const CS2_APPID = 730;

export type Cs2NewsItem = {
  /** Stable upstream id — used for dedupe (`news_articles.external_id`). */
  gid: string;
  title: string;
  url: string;
  /** Raw bbcode body. */
  contents: string;
  /** ISO timestamp of the upstream post. */
  publishedAt: string;
  feedname: string;
  feedlabel: string;
  /** Our taxonomy slug (see `news_tags`). */
  tagSlug: NewsTagSlug;
};

export type NewsTagSlug =
  | "official-valve-update"
  | "esports"
  | "announcement"
  | "blog"
  | "community";

type RawSteamNewsItem = {
  gid?: string;
  title?: string;
  url?: string;
  contents?: string;
  date?: number;
  feedname?: string;
  feedlabel?: string;
};

const ESPORTS_HINT =
  /\b(major|playoffs?|grand finals?|semifinals?|quarterfinals?|iem|blast|esl|rmr|championship|tournament|group stage)\b/i;

/** Map a feed item to our tag taxonomy. Patch notes are titled exactly "Counter-Strike 2 Update". */
export function classifyNewsTag(item: {
  title: string;
  feedname: string;
}): NewsTagSlug {
  const title = item.title.toLowerCase();
  if (/counter-strike 2 update|release notes|\bupdate\b/i.test(title)) {
    return "official-valve-update";
  }
  if (ESPORTS_HINT.test(item.title)) return "esports";
  if (/blog|dev ?diary|behind the scenes/i.test(title)) return "blog";
  if (item.feedname === "steam_community_announcements") return "announcement";
  return "community";
}

/** Fetch and normalize the latest CS2 news items (newest first). */
export async function fetchCs2NewsItems(count = 15): Promise<Cs2NewsItem[]> {
  const url = `${STEAM_NEWS_URL}?appid=${CS2_APPID}&count=${count}&maxlength=0`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Steam news fetch failed (HTTP ${res.status}).`);
  }
  const json = (await res.json()) as {
    appnews?: { newsitems?: RawSteamNewsItem[] };
  };
  const items = json.appnews?.newsitems ?? [];

  return items
    .filter((it): it is Required<Pick<RawSteamNewsItem, "gid">> & RawSteamNewsItem =>
      Boolean(it.gid && it.title),
    )
    .map((it) => {
      const title = (it.title ?? "").trim();
      const feedname = it.feedname ?? "";
      return {
        gid: String(it.gid),
        title,
        url: it.url ?? "",
        contents: it.contents ?? "",
        publishedAt: new Date((it.date ?? 0) * 1000).toISOString(),
        feedname,
        feedlabel: it.feedlabel ?? "",
        tagSlug: classifyNewsTag({ title, feedname }),
      };
    });
}
