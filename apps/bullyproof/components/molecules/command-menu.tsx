"use client";

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
import { Command as CommandIcon, SquareTerminal, ShieldCheck, BadgeCheck } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { useRouter } from "next/navigation";
import { schoolApi } from "@/entities/school/api/endpoints";
import { useSchoolStore } from "@/stores/school-store";
import { useIsPlatformAdmin } from "@/entities/me/model/store";
import type { vSchoolsReadable } from "@/drizzle/schema";

type School = typeof vSchoolsReadable.$inferSelect;

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [loadingSchools, setLoadingSchools] = useState<boolean>(false);
  const router = useRouter();
  const currentSchool = useSchoolStore((state) => state.currentSchool);
  const isPlatformAdmin = useIsPlatformAdmin();
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
      const result = await schoolApi.get.schools();
      if (!isMounted) return;
      if (result.data !== null) {
        setSchools(result.data.filter((s): s is School => Boolean(s?.id)));
      } else {
        setSchools([]);
      }
      setLoadingSchools(false);
    }
    loadSchools();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-9 gap-2 w-9 lg:w-[240px] lg:justify-start justify-center text-muted-foreground"
      >
        <SquareTerminal className="h-4 w-4" />
        <span className="hidden lg:inline">Command Menu</span>
        <kbd className="pointer-events-none ml-auto hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          {shortcut}
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => {
                if (currentSchool?.slug && isPlatformAdmin) {
                  router.push(
                    `/schools/${currentSchool.slug}/lessons?startingYourLesson=true`
                  );
                  setOpen(false);
                }
              }}
              disabled={!currentSchool?.slug || !isPlatformAdmin}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span>Start new lesson</span>
                <Badge variant="secondary" className="shrink-0 ml-auto flex items-center gap-1">
                  <BadgeCheck className="h-3 w-3" />
                  AP Teacher
                </Badge>
              </div>
            </CommandItem>
            {isPlatformAdmin && (
              <CommandItem
                onSelect={() => {
                  router.push("/admin/schools?modal=add-new-school");
                  setOpen(false);
                }}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span>Invite a school</span>
                  <Badge variant="secondary" className="shrink-0 ml-auto flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Admin
                  </Badge>
                </div>
              </CommandItem>
            )}
          </CommandGroup>
          <CommandGroup heading="Schools">
            {(!loadingSchools ? schools : []).map((school) => {
              // Only navigate if we have a valid slug - never use UUID
              const slug = school.slug;
              if (!slug) return null;

              return (
                <CommandItem
                  key={school.id}
                  value={school.name ?? slug}
                  onSelect={() => {
                    router.push(`/schools/${slug}/home`);
                    setOpen(false);
                  }}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="truncate">{school.name}</span>
                    <Badge variant="secondary" className="shrink-0">
                      School
                    </Badge>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
