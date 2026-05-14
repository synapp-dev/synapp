"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import * as React from "react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import type { AccessibleOrganisation } from "@/entities/organisations/api/endpoints";
import { useScopedNavigation } from "@/entities/access/scoped-navigation-context";
import type { TenantScopeSelection } from "@/entities/ai-agent-chat/components/agent-tenant-scope-bar";
import {
  createNavLogEntry,
  type NavLogEntry,
} from "@/entities/ai-agent-chat/lib/nav-log-entry";
import {
  buildPageWelcome,
  type PageWelcome,
} from "@/entities/ai-agent-chat/lib/page-welcome";
import { isAgentOnlyRoute } from "@/entities/ai-agent-chat/lib/agent-right-shell-pathname";
import { useMeStore } from "@/entities/me/model/store";
import { useAccessibleVenueGroupsQuery } from "@/entities/venues/model/useAccessibleVenueGroupsQuery";

type AgentChatContextValue = {
  messages: ReturnType<typeof useChat>["messages"];
  sendMessage: ReturnType<typeof useChat>["sendMessage"];
  status: ReturnType<typeof useChat>["status"];
  stop: ReturnType<typeof useChat>["stop"];
  error: ReturnType<typeof useChat>["error"];
  clearError: ReturnType<typeof useChat>["clearError"];
  organisations: AccessibleOrganisation[];
  venuesLoading: boolean;
  tenantScope: TenantScopeSelection | null;
  setTenantScope: React.Dispatch<
    React.SetStateAction<TenantScopeSelection | null>
  >;
  userNameLabel: string;
  userFirstName: string;
  scopeReady: boolean;
  navLogEntries: NavLogEntry[];
  messageSeenAt: ReadonlyMap<string, number>;
  pageWelcome: PageWelcome | null;
};

const AgentChatContext = React.createContext<AgentChatContextValue | null>(
  null,
);

export function useAgentChat(): AgentChatContextValue {
  const ctx = React.useContext(AgentChatContext);
  if (!ctx) {
    throw new Error("useAgentChat must be used within AgentChatProvider");
  }
  return ctx;
}

function scopeMatchesAccessible(
  organisations: AccessibleOrganisation[],
  scope: TenantScopeSelection,
): boolean {
  const org = organisations.find((o) => o.slug === scope.organisationSlug);
  return Boolean(org?.venues.some((v) => v.slug === scope.venueSlug));
}

function pickFirstAccessibleVenue(
  organisations: AccessibleOrganisation[],
): TenantScopeSelection | null {
  for (const org of organisations) {
    const v = org.venues[0];
    if (v) return { organisationSlug: org.slug, venueSlug: v.slug };
  }
  return null;
}

export function AgentChatProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const venueGroupsQuery = useAccessibleVenueGroupsQuery();
  const organisations = venueGroupsQuery.data ?? [];
  const venuesLoading = venueGroupsQuery.isLoading;
  const [tenantScope, setTenantScope] = useState<TenantScopeSelection | null>(
    null,
  );

  const { resolvedScope } = useScopedNavigation();

  const chatExtrasRef = useRef({
    accessContext: undefined as
      | { organisations: typeof organisations }
      | undefined,
    focusOrganisationSlug: undefined as string | undefined,
    focusVenueSlug: undefined as string | undefined,
  });

  useEffect(() => {
    if (!organisations.length) return;
    setTenantScope((prev) => {
      if (prev && scopeMatchesAccessible(organisations, prev)) {
        return prev;
      }
      if (
        resolvedScope &&
        scopeMatchesAccessible(organisations, resolvedScope)
      ) {
        return resolvedScope;
      }
      return pickFirstAccessibleVenue(organisations);
    });
  }, [organisations]);

  useEffect(() => {
    if (!organisations.length || !resolvedScope) return;
    if (!scopeMatchesAccessible(organisations, resolvedScope)) return;
    setTenantScope(resolvedScope);
  }, [
    organisations.length,
    resolvedScope?.organisationSlug,
    resolvedScope?.venueSlug,
  ]);

  useEffect(() => {
    chatExtrasRef.current = {
      accessContext:
        organisations.length > 0 ? { organisations } : undefined,
      focusOrganisationSlug: tenantScope?.organisationSlug,
      focusVenueSlug: tenantScope?.venueSlug,
    };
  }, [organisations, tenantScope]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent/chat",
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: {
            ...(typeof body === "object" && body !== null && !Array.isArray(body)
              ? body
              : {}),
            messages,
            requestId:
              typeof globalThis.crypto !== "undefined" &&
              typeof globalThis.crypto.randomUUID === "function"
                ? globalThis.crypto.randomUUID()
                : undefined,
            accessContext: chatExtrasRef.current.accessContext,
            focusOrganisationSlug: chatExtrasRef.current.focusOrganisationSlug,
            focusVenueSlug: chatExtrasRef.current.focusVenueSlug,
            pathname: pathnameRef.current,
          },
        }),
      }),
    [],
  );

  const { messages, sendMessage, status, stop, error, clearError } = useChat({
    transport,
  });

  const [navLogEntries, setNavLogEntries] = useState<NavLogEntry[]>([]);
  const lastLoggedPathnameRef = useRef<string | null>(null);

  const userMessageCount = useMemo(
    () => messages.filter((m) => m.role === "user").length,
    [messages],
  );

  const scopeReady = Boolean(tenantScope) && !venuesLoading;

  useEffect(() => {
    if (!pathname) return;
    if (userMessageCount === 0) return;

    if (lastLoggedPathnameRef.current === null) {
      lastLoggedPathnameRef.current = pathname;
      return;
    }
    if (lastLoggedPathnameRef.current === pathname) return;
    lastLoggedPathnameRef.current = pathname;
    setNavLogEntries((prev) => [...prev, createNavLogEntry(pathname, Date.now())]);
  }, [pathname, userMessageCount]);

  const [pageWelcome, setPageWelcome] = useState<PageWelcome | null>(() => {
    if (!pathname) return null;
    if (isAgentOnlyRoute(pathname)) return null;
    return buildPageWelcome(pathname);
  });
  const prevPathnameForWelcomeRef = useRef<string | null>(null);
  const userMsgCountAtPathEntryRef = useRef(0);
  const agentPageWelcomeEligibleRef = useRef(false);
  const leftAgentAwaitingScopeRef = useRef(false);

  const resolvePageWelcome = React.useCallback((path: string): PageWelcome | null => {
    if (isAgentOnlyRoute(path)) {
      return agentPageWelcomeEligibleRef.current ? buildPageWelcome(path) : null;
    }
    return buildPageWelcome(path);
  }, []);

  useEffect(() => {
    if (!scopeReady || !leftAgentAwaitingScopeRef.current) return;
    if (userMessageCount === 0) return;
    if (pathname && isAgentOnlyRoute(pathname)) return;
    leftAgentAwaitingScopeRef.current = false;
    agentPageWelcomeEligibleRef.current = true;
  }, [scopeReady, pathname, userMessageCount]);

  useEffect(() => {
    if (!pathname) return;

    const prev = prevPathnameForWelcomeRef.current;

    if (prev === null) {
      prevPathnameForWelcomeRef.current = pathname;
      userMsgCountAtPathEntryRef.current = userMessageCount;
      setPageWelcome(resolvePageWelcome(pathname));
      return;
    }

    if (prev === pathname) {
      return;
    }

    if (
      userMessageCount > 0 &&
      isAgentOnlyRoute(prev) &&
      !isAgentOnlyRoute(pathname)
    ) {
      if (scopeReady) {
        agentPageWelcomeEligibleRef.current = true;
        leftAgentAwaitingScopeRef.current = false;
      } else {
        leftAgentAwaitingScopeRef.current = true;
      }
    }

    if (userMessageCount === 0) {
      prevPathnameForWelcomeRef.current = pathname;
      userMsgCountAtPathEntryRef.current = userMessageCount;
      setPageWelcome(resolvePageWelcome(pathname));
      return;
    }

    const interactedOnPreviousPath =
      userMessageCount > userMsgCountAtPathEntryRef.current;

    prevPathnameForWelcomeRef.current = pathname;
    userMsgCountAtPathEntryRef.current = userMessageCount;

    if (!interactedOnPreviousPath) {
      setPageWelcome(resolvePageWelcome(pathname));
    } else {
      setPageWelcome(null);
    }
  }, [pathname, userMessageCount, scopeReady, resolvePageWelcome]);

  /**
   * Stamp each message with the moment it first appeared. We populate this
   * during render (via useMemo + a ref) instead of in an effect so the
   * timeline ordering is correct on the very first render that includes
   * the new message — otherwise a freshly-arrived message would briefly
   * sort wrong relative to nav log entries.
   */
  const messageSeenAtRef = useRef<Map<string, number>>(new Map());
  const messageSeenAt = useMemo<Map<string, number>>(() => {
    let next: Map<string, number> | null = null;
    const now = Date.now();
    for (const m of messages) {
      if (!messageSeenAtRef.current.has(m.id)) {
        if (!next) next = new Map(messageSeenAtRef.current);
        next.set(m.id, now);
      }
    }
    if (next) {
      messageSeenAtRef.current = next;
      return next;
    }
    return messageSeenAtRef.current;
  }, [messages]);

  const currentUser = useMeStore(
    (state: ReturnType<typeof useMeStore.getState>) => state.currentUser,
  );

  const userNameLabel = useMemo(() => {
    const u = currentUser;
    if (!u) return "You";
    const full = u.fullName?.trim();
    if (full) return full;
    const fromParts = [u.firstName, u.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (fromParts) return fromParts;
    if (u.email) {
      const local = u.email.split("@")[0]?.trim();
      if (local) return local;
    }
    return "You";
  }, [currentUser]);

  const userFirstName = useMemo(() => {
    const u = currentUser;
    const first = u?.firstName?.trim();
    if (first) return first;
    if (userNameLabel === "You") return "You";
    const head = userNameLabel.split(/\s+/)[0]?.trim();
    return head && head.length > 0 ? head : "You";
  }, [currentUser, userNameLabel]);

  const value = useMemo<AgentChatContextValue>(
    () => ({
      messages,
      sendMessage,
      status,
      stop,
      error,
      clearError,
      organisations,
      venuesLoading,
      tenantScope,
      setTenantScope,
      userNameLabel,
      userFirstName,
      scopeReady,
      navLogEntries,
      messageSeenAt,
      pageWelcome,
    }),
    [
      messages,
      sendMessage,
      status,
      stop,
      error,
      clearError,
      organisations,
      venuesLoading,
      tenantScope,
      userNameLabel,
      userFirstName,
      scopeReady,
      navLogEntries,
      messageSeenAt,
      pageWelcome,
    ],
  );

  return (
    <AgentChatContext.Provider value={value}>
      {children}
    </AgentChatContext.Provider>
  );
}
