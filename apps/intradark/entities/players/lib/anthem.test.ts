import { describe, expect, it } from "vitest";

import {
  anthemProvider,
  parseAnthem,
  parseSoundcloudTrack,
  soundcloudEmbedParts,
} from "./anthem";

const SPOTIFY_ID = "4cOdK2wGLETKBW3PvgPWqT";
const SPOTIFY = `https://open.spotify.com/track/${SPOTIFY_ID}`;
const SC = "https://soundcloud.com/artist-name/track-slug";

describe("parseSoundcloudTrack", () => {
  it("normalizes a track URL and strips query", () => {
    expect(parseSoundcloudTrack(`${SC}?si=abc&in=x`)).toBe(SC);
  });

  it("accepts www/m subdomains, normalizing host", () => {
    expect(parseSoundcloudTrack("https://www.soundcloud.com/a/b")).toBe(
      "https://soundcloud.com/a/b",
    );
    expect(parseSoundcloudTrack("https://m.soundcloud.com/a/b")).toBe(
      "https://soundcloud.com/a/b",
    );
  });

  it("rejects sets/playlists", () => {
    expect(parseSoundcloudTrack("https://soundcloud.com/artist/sets/my-playlist")).toBeNull();
  });

  it("rejects user-only, too-deep, short links, and non-https", () => {
    expect(parseSoundcloudTrack("https://soundcloud.com/artist")).toBeNull();
    expect(parseSoundcloudTrack("https://soundcloud.com/a/b/c")).toBeNull();
    expect(parseSoundcloudTrack("https://on.soundcloud.com/AbCdEf")).toBeNull();
    expect(parseSoundcloudTrack("http://soundcloud.com/a/b")).toBeNull();
  });

  it("preserves a #t= start offset, normalizing mm:ss to seconds", () => {
    expect(parseSoundcloudTrack(`${SC}?si=x#t=2%3A39`)).toBe(`${SC}#t=159`);
    expect(parseSoundcloudTrack(`${SC}#t=2:39`)).toBe(`${SC}#t=159`);
    expect(parseSoundcloudTrack(`${SC}#t=1:02:03`)).toBe(`${SC}#t=3723`);
    expect(parseSoundcloudTrack(`${SC}#t=159`)).toBe(`${SC}#t=159`);
    expect(parseSoundcloudTrack(`${SC}#t=159s`)).toBe(`${SC}#t=159`);
  });

  it("ignores a zero/invalid start offset", () => {
    expect(parseSoundcloudTrack(`${SC}#t=0`)).toBe(SC);
    expect(parseSoundcloudTrack(`${SC}#t=abc`)).toBe(SC);
  });
});

describe("soundcloudEmbedParts", () => {
  it("splits the bare track URL from the start offset", () => {
    expect(soundcloudEmbedParts(`${SC}#t=159`)).toEqual({
      url: SC,
      startSeconds: 159,
    });
  });

  it("returns null start when there is no offset", () => {
    expect(soundcloudEmbedParts(SC)).toEqual({ url: SC, startSeconds: null });
  });
});

describe("parseAnthem", () => {
  it("detects spotify", () => {
    expect(parseAnthem(`${SPOTIFY}?si=x`)).toEqual({
      provider: "spotify",
      canonicalUrl: SPOTIFY,
    });
  });

  it("detects soundcloud", () => {
    expect(parseAnthem(`${SC}?si=x`)).toEqual({
      provider: "soundcloud",
      canonicalUrl: SC,
    });
  });

  it("rejects unsupported / garbage / non-strings", () => {
    expect(parseAnthem("https://music.apple.com/track/1")).toBeNull();
    expect(parseAnthem("https://open.spotify.com/album/" + SPOTIFY_ID)).toBeNull();
    expect(parseAnthem("")).toBeNull();
    expect(parseAnthem(null)).toBeNull();
    expect(parseAnthem(42)).toBeNull();
  });
});

describe("anthemProvider", () => {
  it("derives provider from a stored canonical URL", () => {
    expect(anthemProvider(SPOTIFY)).toBe("spotify");
    expect(anthemProvider(SC)).toBe("soundcloud");
  });

  it("accepts a soundcloud canonical with a #t= offset", () => {
    expect(anthemProvider(`${SC}#t=159`)).toBe("soundcloud");
  });

  it("returns null for null/non-canonical", () => {
    expect(anthemProvider(null)).toBeNull();
    expect(anthemProvider(`${SPOTIFY}?si=x`)).toBeNull();
    expect(anthemProvider("https://soundcloud.com/a/b/c")).toBeNull();
    expect(anthemProvider(`${SC}#t=abc`)).toBeNull();
  });
});
