"use client";

import React, { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Command,
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
import { SchoolAvatarOrBadge } from "@/components/atoms/school-avatar-or-badge";
import { cn } from "@workspace/ui/lib/utils";

export type ComboboxOption = {
  value: string;
  label: string;
  /** Optional logo shown in trigger and list (e.g. school avatar). */
  avatarUrl?: string | null;
};

type ComboboxProps = {
  options: ComboboxOption[];
  value: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  triggerClassName?: string;
  disabled?: boolean;
  /** When provided, use for trigger button text (e.g. when selected option is not in current options). */
  displayLabel?: string;
  /** When both provided, search input is controlled and Command uses shouldFilter={false}. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  /** When both provided, popover open state is controlled. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * When true, non-empty options render like the sidebar school switcher
   * (StorageImage logo + teal school badge fallback). Default: text only.
   */
  schoolVisuals?: boolean;
};

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Choose...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  triggerClassName,
  disabled = false,
  displayLabel: displayLabelProp,
  searchValue,
  onSearchChange,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  schoolVisuals = false,
}: ComboboxProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlledOpen = openProp !== undefined && onOpenChangeProp !== undefined;
  const open = isControlledOpen ? openProp : internalOpen;
  const setOpen = isControlledOpen ? onOpenChangeProp! : setInternalOpen;

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel =
    displayLabelProp ?? selectedOption?.label ?? placeholder;
  const triggerSchoolRow =
    value && displayLabelProp === undefined ? selectedOption : undefined;

  const isAsyncSearch = searchValue !== undefined && onSearchChange !== undefined;

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between gap-2", triggerClassName)}
          disabled={disabled}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            {schoolVisuals && triggerSchoolRow ? (
              <SchoolAvatarOrBadge
                school={{
                  name: triggerSchoolRow.label,
                  avatarUrl: triggerSchoolRow.avatarUrl ?? null,
                }}
                size="md"
              />
            ) : null}
            <span className="truncate">{displayLabel}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command
          shouldFilter={!isAsyncSearch}
          {...(isAsyncSearch && {
            value: searchValue ?? "",
            onValueChange: (v) => onSearchChange?.(v ?? ""),
          })}
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = value === option.value;
                const isAllSchoolsRow = option.value === "";
                return (
                  <CommandItem
                    key={option.value}
                    value={`${option.value} ${option.label}`}
                    onSelect={() => handleSelect(option.value)}
                    className={cn(schoolVisuals && "gap-2")}
                  >
                    {schoolVisuals ? (
                      isAllSchoolsRow ? (
                        <span className="flex h-6 w-6 shrink-0" aria-hidden />
                      ) : (
                        <SchoolAvatarOrBadge
                          school={{
                            name: option.label,
                            avatarUrl: option.avatarUrl ?? null,
                          }}
                          size="sm"
                        />
                      )
                    ) : null}
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        schoolVisuals ? "" : "mr-2",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="min-w-0 truncate">{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
