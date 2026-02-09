"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { Toaster } from "@workspace/ui/components/sonner";
import { Analytics } from '@vercel/analytics/next';

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
          <Analytics />
          {children}
          <Toaster position="top-center" />
        </NextThemesProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
