import { describe, expect, it } from "vitest";
import { classifyRawItemBucket } from "@/server/inventory-normalisation/classify-raw-item-bucket";

describe("classifyRawItemBucket", () => {
  it("flags fuel surcharge as likely non-inventory", () => {
    expect(
      classifyRawItemBucket({ rawDescription: "Fuel surcharge - June" }),
    ).toBe("likely_non_inventory");
  });

  it("flags delivery fee keywords", () => {
    expect(
      classifyRawItemBucket({ rawDescription: "Metro delivery fee" }),
    ).toBe("likely_non_inventory");
  });

  it("flags Xero invoice header lines with due date", () => {
    expect(
      classifyRawItemBucket({ rawDescription: "Invoice No.4561: Due 10/06/2026" }),
    ).toBe("likely_non_inventory");
  });

  it("flags purely numeric lines", () => {
    expect(classifyRawItemBucket({ rawDescription: "206" })).toBe(
      "likely_non_inventory",
    );
    expect(classifyRawItemBucket({ rawDescription: "204" })).toBe(
      "likely_non_inventory",
    );
  });

  it("flags photography and video services", () => {
    expect(
      classifyRawItemBucket({ rawDescription: "Photography - 5th June" }),
    ).toBe("likely_non_inventory");
    expect(
      classifyRawItemBucket({ rawDescription: "Video editing - March" }),
    ).toBe("likely_non_inventory");
  });

  it("returns main for produce-like descriptions", () => {
    expect(
      classifyRawItemBucket({ rawDescription: "Gourmet tomato 10kg - Box" }),
    ).toBe("main");
    expect(
      classifyRawItemBucket({ rawDescription: "Cherry Truss Tomato" }),
    ).toBe("main");
    expect(
      classifyRawItemBucket({ rawDescription: "Peeled Garlic 1KG" }),
    ).toBe("main");
  });

  it("flags service units like varied", () => {
    expect(
      classifyRawItemBucket({
        rawDescription: "The Library",
        rawUnit: "varied",
      }),
    ).toBe("likely_non_inventory");
  });

  it("flags short venue or space titles (The …)", () => {
    expect(classifyRawItemBucket({ rawDescription: "The Library" })).toBe(
      "likely_non_inventory",
    );
    expect(classifyRawItemBucket({ rawDescription: "The Loft Bar" })).toBe(
      "likely_non_inventory",
    );
  });

  it("keeps produce lines in main even when supplier name sounds like a venue", () => {
    expect(
      classifyRawItemBucket({
        rawDescription: "Breast Fillet Skin Off",
        rawUnit: "Kg",
      }),
    ).toBe("main");
  });

  it("flags creative / marketing campaign lines on every parse variant", () => {
    expect(
      classifyRawItemBucket({ rawDescription: "Sebbys Scrolls Campaign" }),
    ).toBe("likely_non_inventory");
    expect(
      classifyRawItemBucket({
        rawDescription:
          "Sebbys Scrolls Campaign 1x Campaign Video 4x Images 7x Graphics",
      }),
    ).toBe("likely_non_inventory");
    expect(
      classifyRawItemBucket({ rawDescription: "Graphic design - logo refresh" }),
    ).toBe("likely_non_inventory");
  });

  it("flags room / venue bookings on every parse variant", () => {
    expect(classifyRawItemBucket({ rawDescription: "Room 204" })).toBe(
      "likely_non_inventory",
    );
    expect(classifyRawItemBucket({ rawDescription: "204" })).toBe(
      "likely_non_inventory",
    );
    expect(
      classifyRawItemBucket({
        rawDescription: "Room 204",
        rawUnit: "half day/hour",
      }),
    ).toBe("likely_non_inventory");
  });

  it("flags compound service units like 'half day/hour' regardless of description", () => {
    expect(
      classifyRawItemBucket({
        rawDescription: "The Loft",
        rawUnit: "half day/hour",
      }),
    ).toBe("likely_non_inventory");
  });
});
