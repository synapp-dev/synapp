import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dummySuperbotSuggestions } from "@/entities/dashboard/model/dummy-superbot-suggestions";

const prefs = vi.hoisted(() => ({ reduceMotion: false }));
const nav = vi.hoisted(() => ({
  resolvedScope: {
    organisationSlug: "acme",
    venueSlug: "richmond",
  } as { organisationSlug: string; venueSlug: string } | null,
}));

vi.mock("@/hooks/use-prefers-reduced-motion", () => ({
  usePrefersReducedMotion: () => prefs.reduceMotion,
}));

vi.mock("@/entities/access/scoped-navigation-context", () => ({
  useScopedNavigation: () => ({
    activeScopedContext: null,
    resolvedScope: nav.resolvedScope,
    setScopedContext: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { SuperbotSuggestionsCard } from "./superbot-suggestions-card";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  prefs.reduceMotion = false;
  nav.resolvedScope = {
    organisationSlug: "acme",
    venueSlug: "richmond",
  };
});

function cardRoot(): HTMLElement {
  return screen.getByTestId("superbot-suggestions-hover-surface");
}

describe("SuperbotSuggestionsCard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("advances to the next suggestion after 10 seconds", async () => {
    const first = dummySuperbotSuggestions[0]!.title;
    const second = dummySuperbotSuggestions[1]!.title;

    render(<SuperbotSuggestionsCard />);
    expect(screen.getByRole("heading", { level: 3, name: first })).toBeTruthy();

    await vi.advanceTimersByTimeAsync(10_000);

    expect(screen.getByRole("heading", { level: 3, name: second })).toBeTruthy();
  });

  it("pauses auto-advance while the pointer hovers the card", async () => {
    const first = dummySuperbotSuggestions[0]!.title;
    const second = dummySuperbotSuggestions[1]!.title;

    render(<SuperbotSuggestionsCard />);
    const root = cardRoot();

    await vi.advanceTimersByTimeAsync(5000);
    fireEvent.mouseEnter(root);
    await vi.advanceTimersByTimeAsync(8000);
    expect(screen.getByRole("heading", { level: 3, name: first })).toBeTruthy();

    fireEvent.mouseLeave(root);
    await vi.advanceTimersByTimeAsync(5000);

    expect(screen.getByRole("heading", { level: 3, name: second })).toBeTruthy();
  });

  it("jumps to a suggestion when its header icon is clicked", () => {
    const third = dummySuperbotSuggestions[2]!.title;

    render(<SuperbotSuggestionsCard />);
    const group = screen.getByRole("group", { name: "Jump to a suggestion" });
    const buttons = within(group).getAllByRole("button");
    fireEvent.click(buttons[2]!);

    expect(screen.getByRole("heading", { level: 3, name: third })).toBeTruthy();
  });

  it("does not auto-advance when prefers-reduced-motion is reduce", async () => {
    prefs.reduceMotion = true;
    const first = dummySuperbotSuggestions[0]!.title;
    const second = dummySuperbotSuggestions[1]!.title;

    render(<SuperbotSuggestionsCard />);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(screen.getByRole("heading", { level: 3, name: first })).toBeTruthy();
    expect(
      screen.queryByRole("heading", { level: 3, name: second }),
    ).toBeNull();
  });

  it("still changes slides via icons when motion is reduced", () => {
    prefs.reduceMotion = true;
    const second = dummySuperbotSuggestions[1]!.title;

    render(<SuperbotSuggestionsCard />);
    const group = screen.getByRole("group", { name: "Jump to a suggestion" });
    fireEvent.click(within(group).getAllByRole("button")[1]!);

    expect(screen.getByRole("heading", { level: 3, name: second })).toBeTruthy();
  });

  it("disables the CTA when there is no resolved venue scope", () => {
    nav.resolvedScope = null;
    const first = dummySuperbotSuggestions[0]!;

    render(<SuperbotSuggestionsCard />);
    const cta = screen.getByRole("button", { name: first.ctaLabel });
    expect(cta.hasAttribute("disabled")).toBe(true);
  });
});
