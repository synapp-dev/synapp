"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { AppToaster } from "@/components/app-toaster";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NextThemesProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          enableColorScheme
        >
          <ServiceWorkerRegister />
          {children}
          <AppToaster />
        </NextThemesProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
