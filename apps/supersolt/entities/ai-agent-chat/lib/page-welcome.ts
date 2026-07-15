import { APP_NAVIGATION_CATALOG } from "@/entities/ai-agent-chat/lib/app-navigation-catalog";
import type { AppNavigationCatalogEntry } from "@/entities/ai-agent-chat/lib/app-navigation-catalog";
import { deriveNavLogLabel } from "@/entities/ai-agent-chat/lib/nav-log-entry";

export type PageWelcomeSuggestion = {
  label: string;
  prompt: string;
};

export type PageWelcome = {
  id: string;
  pathname: string;
  /** e.g. "Welcome to the Dashboard" */
  headline: string;
  body: string;
  suggestions: PageWelcomeSuggestion[];
};

import { isReservedTopLevelSegment } from "@/lib/reserved-top-level-segments";

function newId(pathname: string): string {
  const rand =
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `page-welcome:${pathname}:${rand}`;
}

function matchCatalogEntry(pathname: string): AppNavigationCatalogEntry | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;
  const first = segments[0];
  if (!first || isReservedTopLevelSegment(first)) return null;
  const suffix = `/${segments.slice(2).join("/")}`;
  if (suffix === "/") return null;
  for (const entry of Object.values(APP_NAVIGATION_CATALOG)) {
    if (entry.pathSuffix === suffix) return entry;
  }
  return null;
}

function defaultSuggestions(placeName: string): PageWelcomeSuggestion[] {
  return [
    {
      label: "What should I do first here?",
      prompt: `I'm on ${placeName} in Supersolt. What should I look at first, and what are the common mistakes to avoid?`,
    },
    {
      label: "Summarise this page for me",
      prompt: `In one short paragraph, explain what ${placeName} is for in Supersolt and how it connects to day-to-day venue work.`,
    },
  ];
}

function suggestionsForCatalogEntry(
  entry: AppNavigationCatalogEntry,
): PageWelcomeSuggestion[] {
  const place = entry.title;
  const base = defaultSuggestions(place);
  const third: PageWelcomeSuggestion = {
    label: "How does this tie into other areas?",
    prompt: `I'm on ${place} (${entry.description ?? "this area"}). How does it connect to the rest of Supersolt for this venue?`,
  };
  return [base[0]!, base[1]!, third];
}

function welcomeForReservedTopLevel(
  pathname: string,
  segment: string,
): PageWelcome | null {
  const { label } = deriveNavLogLabel(pathname);
  if (segment === "about") {
    return {
      id: newId(pathname),
      pathname,
      headline: "About Supersolt",
      body:
        "Learn about Supersolt, the platform, and how we help venue operators run day-to-day operations.",
      suggestions: defaultSuggestions("About"),
    };
  }
  if (segment === "dashboard") {
    return {
      id: newId(pathname),
      pathname,
      headline: "Welcome to the Dashboard",
      body:
        "Here you'll see a high-level overview of your Supersolt workspace: organisations and venues you can access, and quick paths into day-to-day areas like insights, catalog, inventory, and workforce. Use it as home base before you dive into a specific venue.",
      suggestions: [
        {
          label: "Where should I start today?",
          prompt:
            "I'm on the Supersolt dashboard. Given I run venue operations, what should I check first today and in what order?",
        },
        {
          label: "Explain Insights vs Inventory",
          prompt:
            "On the Supersolt dashboard, how do Insights and Inventory differ in purpose, and when would I use each in a typical week?",
        },
        {
          label: "How do org and venue switches work?",
          prompt:
            "How do organisation and venue scope work in Supersolt, and what breaks if I pick the wrong venue?",
        },
      ],
    };
  }
  if (segment === "agent") {
    return {
      id: newId(pathname),
      pathname,
      headline: "Welcome to Superbot",
      body:
        "This is the dedicated agent view: a full-width chat with Superbot. Ask in plain language about sales, stock, roster, or navigation—Superbot can suggest in-app destinations you're allowed to open.",
      suggestions: [
        {
          label: "What can you help me with?",
          prompt:
            "I'm in the Supersolt agent chat. What kinds of questions should I ask you, and what should I avoid?",
        },
        {
          label: "Open a venue screen for me",
          prompt:
            "Walk me through how to ask you to open a specific Supersolt screen for my venue, and what info you need from me.",
        },
      ],
    };
  }
  return {
    id: newId(pathname),
    pathname,
    headline: `Welcome to ${label}`,
    body: `You're on ${label} in Supersolt. Use the sidebar and header to move around, or ask Superbot for a guided next step.`,
    suggestions: defaultSuggestions(label),
  };
}

/**
 * Builds a single “welcome to this page” card for the agent shell.
 * Returns null only when we intentionally skip (e.g. empty path).
 */
export function buildPageWelcome(pathname: string): PageWelcome | null {
  if (!pathname) return null;

  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  if (!first) {
    return {
      id: newId(pathname),
      pathname,
      headline: "Welcome to Supersolt",
      body:
        "Pick an organisation and venue from the scope controls, then explore insights, catalog, inventory, and workforce from the sidebar.",
      suggestions: defaultSuggestions("Supersolt"),
    };
  }

  if (isReservedTopLevelSegment(first) && segments.length === 1) {
    return welcomeForReservedTopLevel(pathname, first);
  }

  const catalogHit = matchCatalogEntry(pathname);
  if (catalogHit) {
    const { scopeLabel } = deriveNavLogLabel(pathname);
    const scopeNote = scopeLabel ? ` (${scopeLabel})` : "";
    const desc =
      catalogHit.description ??
      `This area covers ${catalogHit.title} for your venue.`;
    return {
      id: newId(pathname),
      pathname,
      headline: `Welcome to ${catalogHit.title}`,
      body: `${desc.replace(/\.$/, "")}${scopeNote}. Ask Superbot if you want a quick tour or the next best action.`,
      suggestions: suggestionsForCatalogEntry(catalogHit),
    };
  }

  if (!isReservedTopLevelSegment(first) && segments[2] === "agent") {
    return welcomeForReservedTopLevel(pathname, "agent");
  }

  if (!isReservedTopLevelSegment(first) && segments.length >= 2) {
    const { label, scopeLabel } = deriveNavLogLabel(pathname);
    const scopeNote = scopeLabel ? ` You're scoped to ${scopeLabel}.` : "";
    return {
      id: newId(pathname),
      pathname,
      headline: `Welcome to ${label}`,
      body: `You're viewing ${label} in Supersolt.${scopeNote} Ask Superbot for help with this page or where to go next.`,
      suggestions: defaultSuggestions(label),
    };
  }

  return welcomeForReservedTopLevel(pathname, first);
}
