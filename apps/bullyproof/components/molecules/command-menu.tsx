import { useState, useEffect } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import { Button } from "@workspace/ui/components/button";
import { Command as CommandIcon } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/utils/supabase/client";
import type { Tables } from "@/types/supabase";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [schools, setSchools] = useState<Array<Tables<"schools">>>([]);
  const [loadingSchools, setLoadingSchools] = useState<boolean>(false);
  const router = useRouter();
  const supabase = createBrowserClient();
  const isMac =
    typeof navigator !== "undefined"
      ? navigator.platform.toUpperCase().indexOf("MAC") >= 0
      : false;
  const shortcut = isMac ? "⌘K" : "Ctrl+K";

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadSchools() {
      setLoadingSchools(true);
      const { data, error } = await supabase.from("schools").select("*");
      if (!isMounted) return;
      if (!error) {
        setSchools((data ?? []).filter((s): s is Tables<"schools"> => Boolean(s?.id)));
      } else {
        setSchools([]);
      }
      setLoadingSchools(false);
    }
    loadSchools();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-9 gap-2 w-[240px] justify-start text-muted-foreground"
      >
        <CommandIcon className="h-4 w-4" />
        <span>Command Menu</span>
        <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          {shortcut}
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>Calendar</CommandItem>
            <CommandItem>Search</CommandItem>
            <CommandItem>Settings</CommandItem>
          </CommandGroup>
          <CommandGroup heading="Schools">
            {(!loadingSchools ? schools : []).map((school) => (
              <CommandItem
                key={school.id}
                value={school.name ?? school.slug ?? String(school.id)}
                onSelect={() => {
                  const slug = school.slug ?? school.id;
                  router.push(`/schools/${slug}/home`);
                  setOpen(false);
                }}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="truncate">{school.name}</span>
                  <Badge variant="secondary" className="shrink-0">School</Badge>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
