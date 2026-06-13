"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { posCatalogImportApi } from "@/entities/pos-catalog-import/api/endpoints";
import { Button } from "@workspace/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function PosItemModifiersCell({
  organisationSlug,
  venueSlug,
  menuItemId,
  count,
}: {
  organisationSlug: string;
  venueSlug: string;
  menuItemId: string;
  count: number;
}) {
  const [open, setOpen] = useState(false);

  const query = useQuery({
    queryKey: ["pos-item-modifiers", organisationSlug, venueSlug, menuItemId],
    queryFn: async () => {
      const { data, error } = await posCatalogImportApi.get.modifiers({
        organisationSlug,
        venueSlug,
        menuItemId,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: open,
  });

  if (count === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-7">
          {count} {count === 1 ? "list" : "lists"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        {query.isLoading ? (
          <p className="text-muted-foreground text-sm" aria-busy="true">
            Loading modifiers…
          </p>
        ) : query.data && query.data.lists.length > 0 ? (
          query.data.lists.map((list) => (
            <div key={list.modifierListId} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{list.name}</span>
                <span className="text-muted-foreground text-xs">
                  {list.selectionType === "single" ? "Pick one" : "Multi-select"}
                </span>
              </div>
              <ul className="space-y-0.5">
                {list.modifiers.map((modifier) => (
                  <li
                    key={modifier.modifierId}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span>{modifier.name}</span>
                    <span className="text-muted-foreground">
                      {modifier.priceCents > 0 ? `+${formatPrice(modifier.priceCents)}` : "—"}
                    </span>
                  </li>
                ))}
                {list.modifiers.length === 0 ? (
                  <li className="text-muted-foreground text-sm">No options</li>
                ) : null}
              </ul>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground text-sm">No modifiers attached.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
