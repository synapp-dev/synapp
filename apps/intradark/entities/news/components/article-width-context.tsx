"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type ArticleWidth = "narrow" | "wide";

const STORAGE_KEY = "idk_article_width";

type ArticleWidthContextValue = {
  width: ArticleWidth;
  setWidth: (w: ArticleWidth) => void;
  toggle: () => void;
};

const ArticleWidthContext = createContext<ArticleWidthContextValue | null>(null);

/**
 * Reader-controlled body width (narrow ↔ wide), persisted in localStorage so the
 * choice sticks across every article. Default narrow (the Substack reading
 * column). Only the body column flexes; the masthead stays wide.
 */
export function ArticleWidthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [width, setWidthState] = useState<ArticleWidth>("narrow");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "narrow" || stored === "wide") setWidthState(stored);
    } catch {
      // ignore (private mode / disabled storage)
    }
  }, []);

  const setWidth = useCallback((w: ArticleWidth) => {
    setWidthState(w);
    try {
      window.localStorage.setItem(STORAGE_KEY, w);
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => {
    setWidthState((prev) => {
      const next = prev === "narrow" ? "wide" : "narrow";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return (
    <ArticleWidthContext.Provider value={{ width, setWidth, toggle }}>
      {children}
    </ArticleWidthContext.Provider>
  );
}

export function useArticleWidth(): ArticleWidthContextValue {
  const ctx = useContext(ArticleWidthContext);
  if (!ctx) {
    throw new Error("useArticleWidth must be used within ArticleWidthProvider");
  }
  return ctx;
}
