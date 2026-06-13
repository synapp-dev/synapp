"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { useSupplierRawItemMutations } from "@/entities/supplier-raw-items/model/useSupplierRawItemMutations";
import type { SupplierRawItemSummary } from "@/entities/supplier-raw-items/model/types";

type RawItemFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisation: string;
  venue: string;
  supplierId: string;
  item: SupplierRawItemSummary | null;
  onSaved: () => void;
};

export function RawItemFormSheet({
  open,
  onOpenChange,
  organisation,
  venue,
  supplierId,
  item,
  onSaved,
}: RawItemFormSheetProps) {
  const [description, setDescription] = useState("");
  const [rawUnit, setRawUnit] = useState("");
  const { createRawItem, updateRawItem } = useSupplierRawItemMutations({
    organisationSlug: organisation,
    venueSlug: venue,
    supplierId,
  });

  useEffect(() => {
    if (open) {
      setDescription(item?.rawDescription ?? "");
      setRawUnit(item?.rawUnit ?? "");
    }
  }, [open, item]);

  async function handleSave() {
    const trimmed = description.trim();
    if (!trimmed) {
      toast.error("Description is required");
      return;
    }

    try {
      if (item) {
        await updateRawItem.mutateAsync({
          rawItemId: item.id,
          payload: {
            rawDescription: trimmed,
            rawUnit: rawUnit.trim() || null,
          },
        });
      } else {
        await createRawItem.mutateAsync({
          rawDescription: trimmed,
          rawUnit: rawUnit.trim() || null,
        });
      }
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save raw item");
    }
  }

  const pending = createRawItem.isPending || updateRawItem.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{item ? "Edit raw item" : "Add raw item"}</SheetTitle>
          <SheetDescription>
            Store the supplier&apos;s invoice wording exactly — normalisation comes in a later step.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="raw-description">Description *</Label>
            <Input
              id="raw-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Box of Tomatoes — 10 kg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="raw-unit">Unit (as on invoice)</Label>
            <Input
              id="raw-unit"
              value={rawUnit}
              onChange={(e) => setRawUnit(e.target.value)}
              placeholder="box, kg, each"
            />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
