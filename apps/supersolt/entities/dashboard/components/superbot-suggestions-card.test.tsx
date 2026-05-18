import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dummySuperbotSuggestions } from "@/entities/dashboard/model/dummy-superbot-suggestions";
import { SLIDE_EXIT_FADE_MS } from "@/entities/dashboard/components/superbot-suggestions-carousel-constants";

const prefs = vi.hoisted(() => ({ reduceMotion: false }));
const nav = vi.hoisted(() => ({
  resolvedScope: {
    organisationSlug: "acme",
    venueSlug: "richmond",
  } as { organisationSlug: string; venueSlug: string } | null,
}));
const handoffMocks = vi.hoisted(() => ({
  beginSuperbotSuggestionNavigation: vi.fn(),
  push: vi.fn(),
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

vi.mock("@/entities/venues/model/useAccessibleVenueGroupsQuery", () => ({
  useAccessibleVenueGroupsQuery: () => ({
    data: [] as const,
    isPending: false,
    isError: false,
  }),
}));

vi.mock("@/entities/ai-agent-chat/components/agent-chat-provider", () => ({
  useAgentChat: () => ({
    beginSuperbotSuggestionNavigation:
      handoffMocks.beginSuperbotSuggestionNavigation,
  }),
}));

vi.mock("@workspace/ui/components/avatar", () => ({
  Avatar: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="avatar-mock">{children}</div>
  ),
  AvatarFallback: ({ children }: { children?: React.ReactNode }) => (
    <span>{children}</span>
  ),
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

import { SuperbotSuggestionsCardView } from "./superbot-suggestions-card";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  prefs.reduceMotion = false;
  nav.resolvedScope = {
    organisationSlug: "acme",
    venueSlug: "richmond",
  };
  handoffMocks.beginSuperbotSuggestionNavigation.mockClear();
  handoffMocks.push.mockClear();
});

function cardRoot(): HTMLElement {
  return screen.getByTestId("superbot-suggestions-hover-surface");
}

/** Advance past icon delay + title/body typewriter so headings match full titles. */
function settleStreamingUi() {
  act(() => {
    vi.advanceTimersByTime(520);
  });
  act(() => {
    vi.advanceTimersByTime(4000);
  });
}

describe("SuperbotSuggestionsCard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("advances to the next suggestion after 10 seconds", async () => {
    const first = dummySuperbotSuggestions[0]!.title;
    const second = dummySuperbotSuggestions[1]!.title;

    render(
      <SuperbotSuggestionsCardView navigate={handoffMocks.push} />,
    );
    settleStreamingUi();
    expect(screen.getByRole("heading", { level: 3, name: first })).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000 + SLIDE_EXIT_FADE_MS + 50);
    });

    settleStreamingUi();
    expect(screen.getByRole("heading", { level: 3, name: second })).toBeTruthy();
  });

  it("pauses auto-advance while the pointer hovers the suggestion rail", async () => {
    const first = dummySuperbotSuggestions[0]!.title;
    const second = dummySuperbotSuggestions[1]!.title;

    render(
      <SuperbotSuggestionsCardView navigate={handoffMocks.push} />,
    );
    const root = cardRoot();
    settleStreamingUi();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    fireEvent.mouseEnter(root);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });
    expect(screen.getByRole("heading", { level: 3, name: first })).toBeTruthy();

    fireEvent.mouseLeave(root);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000 + SLIDE_EXIT_FADE_MS + 50);
    });

    settleStreamingUi();
    expect(screen.getByRole("heading", { level: 3, name: second })).toBeTruthy();
  });

  it("jumps to a suggestion when its header icon is clicked", async () => {
    const third = dummySuperbotSuggestions[2]!.title;

    render(
      <SuperbotSuggestionsCardView navigate={handoffMocks.push} />,
    );
    const group = screen.getByRole("group", { name: "Jump to a suggestion" });
    const buttons = within(group).getAllByRole("button");
    fireEvent.click(buttons[2]!);

    settleStreamingUi();
    expect(screen.getByRole("heading", { level: 3, name: third })).toBeTruthy();
  });

  it("does not auto-advance when prefers-reduced-motion is reduce", async () => {
    prefs.reduceMotion = true;
    const first = dummySuperbotSuggestions[0]!.title;
    const second = dummySuperbotSuggestions[1]!.title;

    render(
      <SuperbotSuggestionsCardView navigate={handoffMocks.push} />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(screen.getByRole("heading", { level: 3, name: first })).toBeTruthy();
    expect(
      screen.queryByRole("heading", { level: 3, name: second }),
    ).toBeNull();
  });

  it("still changes slides via icons when motion is reduced", () => {
    prefs.reduceMotion = true;
    const second = dummySuperbotSuggestions[1]!.title;

    render(
      <SuperbotSuggestionsCardView navigate={handoffMocks.push} />,
    );
    const group = screen.getByRole("group", { name: "Jump to a suggestion" });
    fireEvent.click(within(group).getAllByRole("button")[1]!);

    expect(screen.getByRole("heading", { level: 3, name: second })).toBeTruthy();
  });

  it("shows organisation and venue below the suggestion title", () => {
    render(
      <SuperbotSuggestionsCardView navigate={handoffMocks.push} />,
    );
    settleStreamingUi();
    const region = screen.getByRole("region", { name: /superbot suggestions/i });
    expect(region.textContent).toContain("Acme");
    expect(region.textContent).toContain("Richmond");
  });

  it("does not offer navigation when there is no resolved venue scope", () => {
    nav.resolvedScope = null;

    render(
      <SuperbotSuggestionsCardView navigate={handoffMocks.push} />,
    );
    settleStreamingUi();
    expect(screen.queryByRole("link")).toBeNull();
    expect(
      screen.getByText(/Select an organisation and venue from the sidebar/i),
    ).toBeTruthy();
  });

  it("runs Superbot handoff before client navigation on primary card click", () => {
    render(
      <SuperbotSuggestionsCardView navigate={handoffMocks.push} />,
    );
    settleStreamingUi();
    const link = screen.getByRole("link", {
      name: /go to employee timesheets/i,
    });
    fireEvent.click(link);
    expect(handoffMocks.beginSuperbotSuggestionNavigation).toHaveBeenCalledTimes(
      1,
    );
    expect(handoffMocks.push).toHaveBeenCalledWith(
      "/acme/richmond/workforce/timesheets",
    );
  });

  it("does not intercept modified link clicks for Superbot handoff", () => {
    render(
      <SuperbotSuggestionsCardView navigate={handoffMocks.push} />,
    );
    settleStreamingUi();
    const link = screen.getByRole("link", {
      name: /go to employee timesheets/i,
    });
    fireEvent.click(link, { metaKey: true });
    expect(handoffMocks.beginSuperbotSuggestionNavigation).not.toHaveBeenCalled();
    expect(handoffMocks.push).not.toHaveBeenCalled();
  });
});
