import { describe, expect, it } from "vitest";

import {
  bbcodeToExcerpt,
  extractFirstImageUrl,
  steamBbcodeToHtml,
} from "./steam-bbcode";

// Shapes taken from real CS2 Steam feed (appid 730) items.
const UPDATE_POST =
  "[p]\\[ COLOGNE 2026 ][/p][list][*][p]Added display of lowest and highest sticker price in the last 7 days.[/p][/*][*][p]Added stickers showcase to the Major Hub tile.[/p][/*][/list][p]\\[ MISC ][/p][list][*][p]Added multi-select in Storage Units.[/p][/*][/list]";

const ESPORTS_POST =
  "[img]https://clan.akamai.steamstatic.com/images/abc/def.png[/img]\nFollowing one of the most unforgettable days in Major history, two teams remain.\n\nThe Lanxess Arena will host the Playoffs:\n[list]\n[*] 9z Team vs. FURIA\n[*] Aurora vs. BetBoom\n[/list]";

describe("extractFirstImageUrl", () => {
  it("pulls the first [img] url", () => {
    expect(extractFirstImageUrl(ESPORTS_POST)).toBe(
      "https://clan.akamai.steamstatic.com/images/abc/def.png",
    );
  });

  it("returns null when there is no image", () => {
    expect(extractFirstImageUrl(UPDATE_POST)).toBeNull();
  });

  it("expands the {STEAM_CLAN_IMAGE} host template", () => {
    expect(extractFirstImageUrl("[img]{STEAM_CLAN_IMAGE}/x/y.png[/img]")).toBe(
      "https://clan.akamai.steamstatic.com/images/x/y.png",
    );
  });
});

describe("steamBbcodeToHtml", () => {
  it("converts lists to <ul><li>", () => {
    const html = steamBbcodeToHtml("[list][*]Alpha[*]Bravo[/list]");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>Alpha</li>");
    expect(html).toContain("<li>Bravo</li>");
  });

  it("converts [p] blocks and leaves no raw bbcode behind", () => {
    const html = steamBbcodeToHtml(UPDATE_POST);
    expect(html).toContain("<p>");
    expect(html).toContain("<ul>");
    expect(html).not.toMatch(/\[p\]|\[\/p\]|\[list\]|\[\*\]/);
  });

  it("unescapes literal brackets", () => {
    const html = steamBbcodeToHtml(UPDATE_POST);
    expect(html).toContain("[ COLOGNE 2026 ]");
    expect(html).toContain("[ MISC ]");
  });

  it("converts images and wraps loose paragraphs", () => {
    const html = steamBbcodeToHtml(ESPORTS_POST);
    expect(html).toContain(
      '<img src="https://clan.akamai.steamstatic.com/images/abc/def.png" />',
    );
    expect(html).toContain("<li>9z Team vs. FURIA</li>");
    expect(html).toMatch(/<p>Following one of the most unforgettable days/);
  });

  it("converts [url=]", () => {
    const html = steamBbcodeToHtml("See [url=https://x.test]the patch[/url].");
    expect(html).toContain('<a href="https://x.test">the patch</a>');
  });
});

describe("video + unknown tags", () => {
  const VIDEO_POST =
    '[video webm="https://clan.fastly.steamstatic.com/x/y.webm" mp4="https://clan.fastly.steamstatic.com/x/y.mp4" poster="https://clan.akamai.steamstatic.com/x/poster.jpg" autoplay="true"][/video]\nThe popular Cache map has finally returned.';

  it("uses the video poster as the cover image", () => {
    expect(extractFirstImageUrl(VIDEO_POST)).toBe(
      "https://clan.akamai.steamstatic.com/x/poster.jpg",
    );
  });

  it("converts [video] to its poster img and leaves no raw bbcode", () => {
    const html = steamBbcodeToHtml(VIDEO_POST);
    expect(html).toContain(
      '<img src="https://clan.akamai.steamstatic.com/x/poster.jpg" />',
    );
    expect(html).not.toContain("[video");
    expect(html).toContain("<p>The popular Cache map has finally returned.</p>");
  });

  it("strips unknown bbcode tags but keeps literal [ MAPS ] headers", () => {
    const html = steamBbcodeToHtml("[p]\\[ MAPS ][/p][spoiler]secret[/spoiler]");
    expect(html).toContain("[ MAPS ]");
    expect(html).not.toContain("[spoiler]");
  });

  it("converts [previewyoutube] to embeddable markup", () => {
    const html = steamBbcodeToHtml(
      "[previewyoutube=dQw4w9WgXcQ;full][/previewyoutube]",
    );
    expect(html).toContain("data-youtube-video");
    expect(html).toContain(
      'src="https://www.youtube.com/embed/dQw4w9WgXcQ"',
    );
    expect(html).not.toContain("[previewyoutube");
  });

  it("does not leak list-item closers into the excerpt", () => {
    const ex = bbcodeToExcerpt(
      "[list][*][p]Bomb radius increased.[/p][/*][/list]",
    );
    expect(ex).not.toContain("[");
    expect(ex).toContain("Bomb radius increased.");
  });
});

describe("bbcodeToExcerpt", () => {
  it("strips bbcode and collapses whitespace", () => {
    const ex = bbcodeToExcerpt(ESPORTS_POST, 80);
    expect(ex).not.toContain("[");
    expect(ex.startsWith("Following one of the most unforgettable")).toBe(true);
  });

  it("truncates with an ellipsis", () => {
    const ex = bbcodeToExcerpt("a ".repeat(300), 50);
    expect(ex.length).toBeLessThanOrEqual(51);
    expect(ex.endsWith("…")).toBe(true);
  });
});
