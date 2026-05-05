import { describe, expect, it } from "vitest";

import { getPublicMediaObjectUrl } from "@/lib/media/public-url";

describe("getPublicMediaObjectUrl", () => {
  it("builds encoded public URL", () => {
    const u = getPublicMediaObjectUrl(
      "https://abc.supabase.co",
      "maps/de_mirage/radar.png",
    );
    expect(u).toBe(
      "https://abc.supabase.co/storage/v1/object/public/intradark-media/maps/de_mirage/radar.png",
    );
  });
});
