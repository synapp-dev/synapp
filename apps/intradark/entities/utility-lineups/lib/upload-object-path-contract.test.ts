import { describe, expect, it } from "vitest";

import { buildUtilityLineupEnemyPovObjectPath } from "@/lib/media/utility-lineup-enemy-pov-upload-path";
import { buildUtilityLineupVideoObjectPath } from "@/lib/media/utility-lineup-upload-path";

import {
  buildUploadObjectPath,
  uploadObjectPathMatchesSubmit,
} from "./upload-object-path-contract";

describe("buildUploadObjectPath", () => {
  it("delegates lineup paths to the main builder", () => {
    const path = buildUploadObjectPath("lineup", {
      mapSlug: "dust2",
      grenadeType: "smoke",
      fileName: "abc-123.mp4",
    });
    expect(path).toBe(
      buildUtilityLineupVideoObjectPath({
        mapSlug: "dust2",
        grenadeType: "smoke",
        fileName: "abc-123.mp4",
      }),
    );
  });

  it("delegates enemy POV paths to the enemy builder", () => {
    const path = buildUploadObjectPath("enemy_pov", {
      mapSlug: "mirage",
      grenadeType: "he",
      fileName: "pov.webm",
    });
    expect(path).toBe(
      buildUtilityLineupEnemyPovObjectPath({
        mapSlug: "mirage",
        grenadeType: "he",
        fileName: "pov.webm",
      }),
    );
  });
});

describe("uploadObjectPathMatchesSubmit", () => {
  const lineupCases = [
    { mapSlug: "dust2", grenadeType: "smoke" as const, fileName: "a.mp4" },
    { mapSlug: "mirage", grenadeType: "molotov" as const, fileName: "b.webm" },
    { mapSlug: "nuke", grenadeType: "flashbang" as const, fileName: "c.mov" },
    { mapSlug: "ancient", grenadeType: "he" as const, fileName: "d.mp4" },
  ] as const;

  for (const input of lineupCases) {
    it(`accepts lineup path for ${input.mapSlug}/${input.grenadeType}`, () => {
      const path = buildUploadObjectPath("lineup", input);
      expect(
        uploadObjectPathMatchesSubmit(
          path,
          input.mapSlug,
          input.grenadeType,
          "lineup",
        ),
      ).toBe(true);
    });
  }

  it("accepts enemy POV paths built by the contract", () => {
    const path = buildUploadObjectPath("enemy_pov", {
      mapSlug: "dust2",
      grenadeType: "smoke",
      fileName: "enemy.mp4",
    });
    expect(
      uploadObjectPathMatchesSubmit(path, "dust2", "smoke", "enemy_pov"),
    ).toBe(true);
  });

  it("rejects wrong map slug", () => {
    const path = buildUploadObjectPath("lineup", {
      mapSlug: "dust2",
      grenadeType: "smoke",
      fileName: "a.mp4",
    });
    expect(
      uploadObjectPathMatchesSubmit(path, "mirage", "smoke", "lineup"),
    ).toBe(false);
  });

  it("rejects wrong grenade folder", () => {
    const path = buildUploadObjectPath("lineup", {
      mapSlug: "dust2",
      grenadeType: "smoke",
      fileName: "a.mp4",
    });
    expect(
      uploadObjectPathMatchesSubmit(path, "dust2", "he", "lineup"),
    ).toBe(false);
  });

  it("rejects kind mismatch (lineup path checked as enemy_pov)", () => {
    const path = buildUploadObjectPath("lineup", {
      mapSlug: "dust2",
      grenadeType: "smoke",
      fileName: "a.mp4",
    });
    expect(
      uploadObjectPathMatchesSubmit(path, "dust2", "smoke", "enemy_pov"),
    ).toBe(false);
  });

  it("rejects trailing segments and path traversal", () => {
    const path = buildUploadObjectPath("lineup", {
      mapSlug: "dust2",
      grenadeType: "smoke",
      fileName: "a.mp4",
    });
    expect(
      uploadObjectPathMatchesSubmit(`${path}/extra`, "dust2", "smoke", "lineup"),
    ).toBe(false);
    expect(
      uploadObjectPathMatchesSubmit(
        "utility/dust2/smoke/../mirage/he/x.mp4",
        "dust2",
        "smoke",
        "lineup",
      ),
    ).toBe(false);
  });

  it("strips leading slashes before matching", () => {
    const path = buildUploadObjectPath("lineup", {
      mapSlug: "dust2",
      grenadeType: "smoke",
      fileName: "a.mp4",
    });
    expect(
      uploadObjectPathMatchesSubmit(`/${path}`, "dust2", "smoke", "lineup"),
    ).toBe(true);
  });
});
