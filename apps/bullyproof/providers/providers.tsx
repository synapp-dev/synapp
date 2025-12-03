"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { Toaster } from "@workspace/ui/components/sonner";
import { LiveLessonPrompt } from "@/components/organisms/live-lesson-prompt";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NextThemesProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
          enableColorScheme
        >
          <LiveLessonPrompt />
          <Toaster position="bottom-right" />
          {children}
        </NextThemesProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
