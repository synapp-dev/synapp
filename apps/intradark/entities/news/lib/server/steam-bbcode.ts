/**
 * Steam news `contents` is bbcode (e.g. `[img]`, `[list][*]`, `[p]`, `[url=]`,
 * with brackets escaped as `\[`). These pure helpers convert it to HTML (fed to
 * TipTap's `generateJSON`), pull a cover image, and build a plain-text excerpt.
 *
 * The HTML output does not need to be perfect — prosemirror's DOMParser (via
 * `generateJSON`) normalizes nesting and drops anything the schema doesn't allow.
 */

const STEAM_CLAN_IMAGE = "https://clan.akamai.steamstatic.com/images/";

/** Steam sometimes templates image hosts as `{STEAM_CLAN_IMAGE}/...`. */
function expandImageHost(url: string): string {
  return url.replace(/\{STEAM_CLAN_IMAGE\}\/?/g, STEAM_CLAN_IMAGE).trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** First image in the body — an `[img]` tag, else a `[video … poster="…"]` poster. */
export function extractFirstImageUrl(input: string): string | null {
  if (!input) return null;
  const img = input.match(/\[img\]([\s\S]*?)\[\/img\]/i);
  if (img?.[1]) {
    const url = expandImageHost(img[1]);
    if (url.length > 0) return url;
  }
  const poster = input.match(/\[video\b[^\]]*\bposter="([^"]+)"/i);
  if (poster?.[1]) {
    const url = expandImageHost(poster[1]);
    if (url.length > 0) return url;
  }
  return null;
}

/** Strip bbcode to readable plain text (collapsed whitespace), trimmed to `maxLen`. */
export function bbcodeToExcerpt(input: string, maxLen = 220): string {
  if (!input) return "";
  const text = input
    .replace(/\[img\][\s\S]*?\[\/img\]/gi, " ") // drop image URLs entirely
    .replace(/\[video\b[^\]]*\][\s\S]*?\[\/video\]/gi, " ") // drop video blocks
    .replace(/\[url=[^\]]*\]([\s\S]*?)\[\/url\]/gi, "$1") // keep link label
    .replace(/\[url\][\s\S]*?\[\/url\]/gi, " ")
    .replace(/\\([[\]])/g, "$1") // unescape \[ \] first so literals collapse cleanly
    .replace(/\[[^\]]*\]/g, " ") // drop any remaining bbcode-ish tokens (incl. [/*])
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLen) return text;
  const clipped = text.slice(0, maxLen);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${(lastSpace > 40 ? clipped.slice(0, lastSpace) : clipped).trim()}…`;
}

function convertInline(segment: string): string {
  let s = segment;
  // images
  s = s.replace(
    /\[img\]([\s\S]*?)\[\/img\]/gi,
    (_m, url: string) => `<img src="${escapeHtml(expandImageHost(url))}" />`,
  );
  // links
  s = s.replace(
    /\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi,
    (_m, href: string, label: string) =>
      `<a href="${escapeHtml(href.trim())}">${label}</a>`,
  );
  s = s.replace(
    /\[url\]([\s\S]*?)\[\/url\]/gi,
    (_m, href: string) =>
      `<a href="${escapeHtml(href.trim())}">${escapeHtml(href.trim())}</a>`,
  );
  // basic marks
  s = s
    .replace(/\[b\]([\s\S]*?)\[\/b\]/gi, "<strong>$1</strong>")
    .replace(/\[i\]([\s\S]*?)\[\/i\]/gi, "<em>$1</em>")
    .replace(/\[u\]([\s\S]*?)\[\/u\]/gi, "<u>$1</u>")
    .replace(/\[(?:s|strike)\]([\s\S]*?)\[\/(?:s|strike)\]/gi, "<s>$1</s>")
    .replace(/\[code\]([\s\S]*?)\[\/code\]/gi, "<code>$1</code>");
  return s;
}

function convertListBlock(inner: string, ordered: boolean): string {
  // items: `[*] text` until the next `[*]` or end (closing `[/*]` optional)
  const items = inner
    .split(/\[\*\]/)
    .map((chunk) => chunk.replace(/\[\/\*\]/g, "").trim())
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => `<li>${convertInline(chunk)}</li>`)
    .join("");
  const tag = ordered ? "ol" : "ul";
  return `<${tag}>${items}</${tag}>`;
}

/** Convert Steam bbcode to HTML suitable for TipTap `generateJSON`. */
export function steamBbcodeToHtml(input: string): string {
  if (!input) return "";
  let s = input.replace(/\r\n/g, "\n");

  // Block-level structures first.
  s = s.replace(
    /\[list\]([\s\S]*?)\[\/list\]/gi,
    (_m, inner: string) => convertListBlock(inner, false),
  );
  s = s.replace(
    /\[olist\]([\s\S]*?)\[\/olist\]/gi,
    (_m, inner: string) => convertListBlock(inner, true),
  );
  s = s.replace(
    /\[quote(?:=[^\]]*)?\]([\s\S]*?)\[\/quote\]/gi,
    (_m, inner: string) => `<blockquote>${convertInline(inner)}</blockquote>`,
  );
  s = s.replace(
    /\[h([1-3])\]([\s\S]*?)\[\/h\1\]/gi,
    (_m, level: string, inner: string) =>
      `<h${level}>${convertInline(inner)}</h${level}>`,
  );
  s = s.replace(/\[hr\]\s*(\[\/hr\])?/gi, "<hr />");
  // Video → poster image (so it shows + can be the cover); drop if no poster.
  s = s.replace(
    /\[video\b([^\]]*)\][\s\S]*?\[\/video\]/gi,
    (_m, attrs: string) => {
      const poster = /\bposter="([^"]+)"/i.exec(attrs)?.[1];
      return poster ? `<img src="${escapeHtml(expandImageHost(poster))}" />` : "";
    },
  );
  // YouTube embed → markup the Youtube extension parses (`div[data-youtube-video] iframe`).
  s = s.replace(
    /\[previewyoutube=([^\];]+)(?:;[^\]]*)?\]\s*(\[\/previewyoutube\])?/gi,
    (_m, id: string) =>
      `<div data-youtube-video><iframe src="https://www.youtube.com/embed/${escapeHtml(id.trim())}"></iframe></div>`,
  );
  s = s.replace(
    /\[p\]([\s\S]*?)\[\/p\]/gi,
    (_m, inner: string) => `<p>${convertInline(inner)}</p>`,
  );

  // Remaining inline tags.
  s = convertInline(s);

  // Strip any bbcode tags we don't handle (lowercase-anchored so it won't touch
  // literal headers like `[ MAPS ]`), plus stray list-item closers.
  s = s.replace(/\[\/?[a-z][a-z0-9]*\b[^\]]*\]/g, "").replace(/\[\/?\*\]/g, "");

  // Unescape literal brackets (Steam escapes `[` as `\[`) — after the strip above.
  s = s.replace(/\\([[\]])/g, "$1");

  // Wrap loose text into paragraphs, line by line. Block elements produced above
  // are single-line, so a line starting with one is kept; runs of plain lines
  // become a <p> (single newlines within a run become <br>).
  const blockStart =
    /^\s*<(?:ul|ol|p|h[1-6]|blockquote|pre|hr|img|figure|table|div)\b/i;
  const out: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length > 0) {
      out.push(`<p>${para.join("<br />")}</p>`);
      para = [];
    }
  };
  for (const rawLine of s.split("\n")) {
    const line = rawLine.trim();
    if (line.length === 0) {
      flush();
      continue;
    }
    if (blockStart.test(line)) {
      flush();
      out.push(line);
    } else {
      para.push(line);
    }
  }
  flush();

  return out.join("\n");
}
