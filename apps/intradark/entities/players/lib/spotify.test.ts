import { describe, expect, it } from "vitest";

import { parseSpotifyTrack, trackIdFromCanonical } from "./spotify";

const ID = "4cOdK2wGLETKBW3PvgPWqT"; // 22-char base-62
const CANONICAL = `https://open.spotify.com/track/${ID}`;

describe("parseSpotifyTrack", () => {
  it("parses a plain track URL", () => {
    expect(parseSpotifyTrack(CANONICAL)).toEqual({ id: ID, canonicalUrl: CANONICAL });
  });

  it("strips the ?si= share query", () => {
    expect(parseSpotifyTrack(`${CANONICAL}?si=abc123DEF456`)).toEqual({
      id: ID,
      canonicalUrl: CANONICAL,
    });
  });

  it("strips a locale prefix (intl-xx)", () => {
    expect(
      parseSpotifyTrack(`https://open.spotify.com/intl-de/track/${ID}?si=x`),
    ).toEqual({ id: ID, canonicalUrl: CANONICAL });
  });

  it("accepts the spotify:track URI form", () => {
    expect(parseSpotifyTrack(`spotify:track:${ID}`)).toEqual({
      id: ID,
      canonicalUrl: CANONICAL,
    });
  });

  it("trims surrounding whitespace", () => {
    expect(parseSpotifyTrack(`  ${CANONICAL}  `)).toEqual({
      id: ID,
      canonicalUrl: CANONICAL,
    });
  });

  it("rejects non-track entity types", () => {
    expect(parseSpotifyTrack(`https://open.spotify.com/album/${ID}`)).toBeNull();
    expect(parseSpotifyTrack(`https://open.spotify.com/playlist/${ID}`)).toBeNull();
    expect(parseSpotifyTrack(`https://open.spotify.com/artist/${ID}`)).toBeNull();
    expect(parseSpotifyTrack(`https://open.spotify.com/episode/${ID}`)).toBeNull();
    expect(parseSpotifyTrack(`spotify:album:${ID}`)).toBeNull();
  });

  it("rejects non-spotify hosts", () => {
    expect(parseSpotifyTrack(`https://evil.com/track/${ID}`)).toBeNull();
    expect(parseSpotifyTrack(`https://open.spotify.com.evil.com/track/${ID}`)).toBeNull();
  });

  it("rejects non-https protocols", () => {
    expect(parseSpotifyTrack(`http://open.spotify.com/track/${ID}`)).toBeNull();
  });

  it("rejects malformed ids (wrong length / bad chars)", () => {
    expect(parseSpotifyTrack(`https://open.spotify.com/track/tooShort`)).toBeNull();
    expect(
      parseSpotifyTrack(`https://open.spotify.com/track/${ID}EXTRA`),
    ).toBeNull();
    expect(
      parseSpotifyTrack(`https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPW-_`),
    ).toBeNull();
  });

  it("rejects garbage and non-strings", () => {
    expect(parseSpotifyTrack("")).toBeNull();
    expect(parseSpotifyTrack("   ")).toBeNull();
    expect(parseSpotifyTrack("not a url")).toBeNull();
    expect(parseSpotifyTrack(null)).toBeNull();
    expect(parseSpotifyTrack(undefined)).toBeNull();
    expect(parseSpotifyTrack(42)).toBeNull();
  });
});

describe("trackIdFromCanonical", () => {
  it("extracts the id from a canonical URL", () => {
    expect(trackIdFromCanonical(CANONICAL)).toBe(ID);
  });

  it("returns null for null/empty/non-canonical input", () => {
    expect(trackIdFromCanonical(null)).toBeNull();
    expect(trackIdFromCanonical(undefined)).toBeNull();
    expect(trackIdFromCanonical("")).toBeNull();
    expect(trackIdFromCanonical(`${CANONICAL}?si=x`)).toBeNull();
    expect(trackIdFromCanonical(`https://open.spotify.com/album/${ID}`)).toBeNull();
  });
});
