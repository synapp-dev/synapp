import { describe, expect, it } from "vitest";

import { parseDigestTabs } from "@/entities/dashboard/lib/parse-digest-tabs";

describe("parseDigestTabs", () => {
  it("splits marker-delimited sections into tabs", () => {
    const tabs = parseDigestTabs(
      "@@TAB Today\nYesterday closed at $4,200, 6% over forecast.\n@@TAB Stock\nMozzarella has 1.2 days of cover.\n- Order mozzarella today",
    );
    expect(tabs).toEqual([
      { title: "Today", text: "Yesterday closed at $4,200, 6% over forecast." },
      {
        title: "Stock",
        text: "Mozzarella has 1.2 days of cover.\n- Order mozzarella today",
      },
    ]);
  });

  it("falls back to a Today tab when the model ignores the marker format", () => {
    const tabs = parseDigestTabs("Plain digest without markers.\n- One bullet");
    expect(tabs).toEqual([
      { title: "Today", text: "Plain digest without markers.\n- One bullet" },
    ]);
  });

  it("handles a partially streamed marker section", () => {
    const tabs = parseDigestTabs("@@TAB Today\nYesterday clo");
    expect(tabs).toEqual([{ title: "Today", text: "Yesterday clo" }]);
  });

  it("returns no tabs for empty input", () => {
    expect(parseDigestTabs("")).toEqual([]);
  });

  it("prepends stray preamble before the first marker as Today", () => {
    const tabs = parseDigestTabs("Intro line\n@@TAB Sales\nSteady week.");
    expect(tabs).toEqual([
      { title: "Today", text: "Intro line" },
      { title: "Sales", text: "Steady week." },
    ]);
  });
});
