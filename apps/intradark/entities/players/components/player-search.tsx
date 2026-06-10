"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";

/**
 * Searches a player by any supported identifier (@username, steamid64, Steam
 * URL/vanity, or Faceit nickname) and navigates to the canonical profile.
 */
export function PlayerSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = value.trim();
    if (!input) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/players/resolve?input=${encodeURIComponent(input)}`,
      );
      if (res.status === 404) {
        toast.error("No player found for that identifier");
        return;
      }
      if (!res.ok) throw new Error("Search failed");
      const data = (await res.json()) as { canonical: string };
      router.push(data.canonical);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full gap-2">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="@username, SteamID64, Steam URL, or Faceit name"
          className="pl-9"
          aria-label="Search players"
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Searching…" : "Search"}
      </Button>
    </form>
  );
}
