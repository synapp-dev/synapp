"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Briefcase, Check, ChevronsUpDown, User } from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar";
import { cn } from "@workspace/ui/lib/utils";
import {
  buildCaseNavigationPath,
  DUMMY_CASES,
  getCaseSlugFromPathname,
  getDummyCaseBySlug,
  type DummyCase,
} from "@/lib/dummy-cases";

type CaseSwitcherCommandBodyProps = {
  search: string;
  setSearch: (value: string) => void;
  filtered: DummyCase[];
  selectedCase: DummyCase;
  onSelectCase: (c: DummyCase) => void;
  searchPlaceholder: string;
  commandListClassName?: string;
};

function CaseSwitcherCommandBody({
  search,
  setSearch,
  filtered,
  selectedCase,
  onSelectCase,
  searchPlaceholder,
  commandListClassName,
}: CaseSwitcherCommandBodyProps) {
  return (
    <>
      <CommandInput
        placeholder={searchPlaceholder}
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className={commandListClassName}>
        <CommandEmpty>No young people found.</CommandEmpty>
        <CommandGroup heading="Demo cases">
          {filtered.map((c) => {
            const isSelected = selectedCase.slug === c.slug;
            return (
              <CommandItem
                key={c.id}
                value={`${c.displayName} ${c.subtitle} ${c.slug}`}
                onSelect={() => {
                  onSelectCase(c);
                }}
              >
                <div className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="grid min-w-0 flex-1 leading-tight">
                  <span className="truncate text-sm">{c.displayName}</span>
                  <span className="truncate text-[0.65rem] text-muted-foreground">
                    {c.subtitle}
                  </span>
                </div>
                <Check
                  className={cn(
                    "ml-auto h-4 w-4 shrink-0",
                    isSelected ? "opacity-100" : "opacity-0",
                  )}
                />
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </>
  );
}

type CaseSwitcherProps = {
  currentCaseSlug?: string | null;
  onCaseChange?: (c: DummyCase) => void;
};

export function CaseSwitcher({
  currentCaseSlug: currentCaseSlugProp,
  onCaseChange,
}: CaseSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, isMobile } = useSidebar();
  const isCollapsed = !isMobile && state === "collapsed";
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const slugFromPath = getCaseSlugFromPathname(pathname);
  const currentCaseSlug = currentCaseSlugProp ?? slugFromPath;
  const selectedCase = useMemo(() => {
    if (currentCaseSlug) {
      return getDummyCaseBySlug(currentCaseSlug) ?? DUMMY_CASES[0]!;
    }
    return DUMMY_CASES[0]!;
  }, [currentCaseSlug]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return DUMMY_CASES;
    }
    return DUMMY_CASES.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q),
    );
  }, [search]);

  const handlePickerOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setSearch("");
    }
  };

  const selectCase = (c: DummyCase) => {
    const next = buildCaseNavigationPath(pathname, c.slug);
    router.push(next);
    onCaseChange?.(c);
    setOpen(false);
    setSearch("");
  };

  const searchPlaceholder = isMobile
    ? "Search young people…"
    : "Search cases...";

  const triggerButton = (
    <SidebarMenuButton
      size="lg"
      tooltip="Switch case"
      className="group/case-switcher"
      type="button"
      aria-expanded={open}
      onClick={isMobile ? () => setOpen(true) : undefined}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
        <User className="h-4 w-4" />
      </div>
      {!isCollapsed ? (
        <>
          <div className="grid min-w-0 flex-1 text-left leading-tight">
            <span className="truncate text-sm font-medium">
              {selectedCase.displayName}
            </span>
            <span className="truncate text-[0.65rem] text-muted-foreground">
              {selectedCase.subtitle}
            </span>
          </div>
          <ChevronsUpDown
            className={cn(
              "ml-auto h-4 w-4 shrink-0 text-primary transition-transform duration-200",
              open ? "rotate-180" : "",
            )}
          />
        </>
      ) : null}
    </SidebarMenuButton>
  );

  const commandBody = (
    <CaseSwitcherCommandBody
      search={search}
      setSearch={setSearch}
      filtered={filtered}
      selectedCase={selectedCase}
      onSelectCase={selectCase}
      searchPlaceholder={searchPlaceholder}
      commandListClassName={
        isMobile ? "max-h-[min(60vh,400px)]" : undefined
      }
    />
  );

  return (
    <SidebarMenu className="mb-0">
      <SidebarMenuItem>
        {isMobile ? (
          <>
            {triggerButton}
            <CommandDialog
              open={open}
              onOpenChange={handlePickerOpenChange}
              title="Switch case"
              description="Search for a young person to open their case."
            >
              {commandBody}
            </CommandDialog>
          </>
        ) : (
          <Popover open={open} onOpenChange={handlePickerOpenChange}>
            <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
            <PopoverContent className="w-80 p-0" side="right" align="start">
              <Command shouldFilter={false}>{commandBody}</Command>
            </PopoverContent>
          </Popover>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
