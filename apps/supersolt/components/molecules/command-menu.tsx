"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import { Button } from "@workspace/ui/components/button";
import { LayoutDashboard, LifeBuoy, Settings, SquareTerminal } from "lucide-react";

const DEFAULT_ORGANISATION_SLUG = "default-organisation";
const DEFAULT_VENUE_SLUG = "southbank-kitchen";

export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isMac =
    typeof navigator !== "undefined"
      ? navigator.platform.toUpperCase().includes("MAC")
      : false;
  const shortcut = isMac ? "⌘K" : "Ctrl+K";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-9 w-9 justify-center gap-2 text-muted-foreground lg:w-[240px] lg:justify-start"
      >
        <SquareTerminal className="h-4 w-4" />
        <span className="hidden lg:inline">Command Menu</span>
        <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground lg:inline-flex">
          {shortcut}
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            <CommandItem
              onSelect={() => {
                router.push("/dashboard");
                setOpen(false);
              }}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </CommandItem>
            <CommandItem
              onSelect={() => {
                router.push("/settings");
                setOpen(false);
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </CommandItem>
            <CommandItem
              onSelect={() => {
                router.push(
                  `/${DEFAULT_ORGANISATION_SLUG}/${DEFAULT_VENUE_SLUG}/settings/integrations`
                );
                setOpen(false);
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              Venue Settings
            </CommandItem>
            <CommandItem
              onSelect={() => {
                router.push("/support");
                setOpen(false);
              }}
            >
              <LifeBuoy className="mr-2 h-4 w-4" />
              Support
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
