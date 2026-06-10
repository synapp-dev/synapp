"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

/** Forces a re-fetch of all sources for a player and invalidates caches. */
export function RefreshButton({ steamid64 }: { steamid64: string }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  async function onRefresh() {
    setLoading(true);
    try {
      const res = await fetch(`/api/players/${steamid64}/refresh`, {
        method: "POST",
      });

      if (res.status === 429) {
        const data = (await res.json()) as { retryAfterSeconds?: number };
        toast.error(
          `Please wait ${data.retryAfterSeconds ?? 60}s before refreshing again`,
        );
        return;
      }
      if (!res.ok) throw new Error("Refresh failed");

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["players", "steam", steamid64],
        }),
        queryClient.invalidateQueries({
          queryKey: ["players", "faceit", steamid64],
        }),
        queryClient.invalidateQueries({
          queryKey: ["players", "leetify", steamid64],
        }),
      ]);
      toast.success("Refreshing player data…");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onRefresh}
      disabled={loading}
      className="shrink-0"
    >
      <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden />
      Refresh
    </Button>
  );
}
