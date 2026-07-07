import { describe, expect, it } from "vitest";
import { scoreBand } from "./bands";

describe("scoreBand", () => {
  it("splits at 75 and 40, inclusive at the top of each band", () => {
    expect(scoreBand(100)).toBe("high");
    expect(scoreBand(75)).toBe("high");
    expect(scoreBand(74)).toBe("mid");
    expect(scoreBand(40)).toBe("mid");
    expect(scoreBand(39)).toBe("low");
    expect(scoreBand(0)).toBe("low");
  });
});
