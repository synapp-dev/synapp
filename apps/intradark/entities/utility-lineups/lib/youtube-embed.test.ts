import { describe, expect, it } from "vitest";

import {
  buildYouTubeEmbedHoverPreviewSrc,
  buildYouTubeEmbedSrc,
  parseYouTubeVideoId,
} from "./youtube-embed";

describe("parseYouTubeVideoId", () => {
  it("parses watch URL", () => {
    expect(
      parseYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("parses short youtu.be", () => {
    expect(parseYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("rejects non-youtube hosts", () => {
    expect(parseYouTubeVideoId("https://example.com/watch?v=abc")).toBeNull();
  });
});

describe("buildYouTubeEmbedSrc", () => {
  it("builds nocookie embed with start", () => {
    const src = buildYouTubeEmbedSrc(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      5000,
      null,
    );
    expect(src).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(src).toContain("start=5");
  });
});

describe("buildYouTubeEmbedHoverPreviewSrc", () => {
  it("adds autoplay and loop (with playlist id) for muted hover preview", () => {
    const src = buildYouTubeEmbedHoverPreviewSrc(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      0,
      null,
    );
    expect(src).toContain("autoplay=1");
    expect(src).toContain("mute=1");
    expect(src).toContain("loop=1");
    expect(src).toContain("playlist=dQw4w9WgXcQ");
  });
});
