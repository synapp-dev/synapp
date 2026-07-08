"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eraser } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { DropdownMenuItem } from "@workspace/ui/components/dropdown-menu";
import { useScopedNavigation } from "@/entities/access/scoped-navigation-context";
import { getScopedSettingsAccess } from "@/entities/access/scoped-settings-access";
import { useAccessibleVenueGroupsQuery } from "@/entities/venues/model/useAccessibleVenueGroupsQuery";
import { inventorySetupApi } from "@/entities/inventory-setup/api/endpoints";
import { inventorySetupKeys } from "@/entities/inventory-setup/model/keys";
import { posCatalogImportKeys } from "@/entities/pos-catalog-import/model/keys";
import { recipesKeys } from "@/entities/recipes/model/keys";
import { buildScopedPath } from "@/lib/build-scoped-path";

/**
 * Resets just the products (recipes) stage: unmaps every POS line, deletes the
 * venue's recipes, and un-ticks the stage's confirmations — without touching
 * the imported POS catalogue, ingredients or stock. Useful for re-running the
 * recipe wizard from scratch.
 */
export function ResetProductsMenuItem() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { resolvedScope } = useScopedNavigation();
  const [open, setOpen] = useState(false);

  const organisationSlug = resolvedScope?.organisationSlug ?? "";
  const venueSlug = resolvedScope?.venueSlug ?? "";

  const { data: organisations = [] } = useAccessibleVenueGroupsQuery({
    enabled: Boolean(organisationSlug && venueSlug),
  });

  const access = getScopedSettingsAccess(
    organisations,
    organisationSlug,
    venueSlug,
  );

  const reset = useMutation({
    mutationFn: async () => {
      if (!organisationSlug || !venueSlug) {
        throw new Error("Select a venue first");
      }
      const { data, error } = await inventorySetupApi.post.resetProducts({
        organisationSlug,
        venueSlug,
      });
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Reset failed");
      return data;
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: posCatalogImportKeys.list(organisationSlug, venueSlug),
        }),
        queryClient.invalidateQueries({ queryKey: recipesKeys.all() }),
        queryClient.invalidateQueries({
          queryKey: inventorySetupKeys.progress(organisationSlug, venueSlug),
        }),
      ]);
      toast.success(
        `Products reset — ${data.recipesRemoved} recipe${data.recipesRemoved === 1 ? "" : "s"} removed, ${data.mappingsRemoved} POS line${data.mappingsRemoved === 1 ? "" : "s"} unmapped`,
      );
      router.push(
        buildScopedPath(
          organisationSlug,
          venueSlug,
          "settings/inventory-setup/products",
        ),
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Reset failed");
    },
    onSettled: () => {
      setOpen(false);
    },
  });

  if (!resolvedScope || !access.canSeeSettingsNav) {
    return null;
  }

  return (
    <>
      <DropdownMenuItem
        onSelect={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
        className="text-destructive focus:text-destructive"
      >
        <Eraser />
        Reset products
      </DropdownMenuItem>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset products?</AlertDialogTitle>
            <AlertDialogDescription>
              This unmaps every POS line for {venueSlug}, deletes the venue&apos;s
              recipes, and clears the stage&apos;s confirmations so the recipe
              wizard can run from scratch. The imported POS catalogue (items,
              modifiers, in-use flags), your ingredients, and stock levels stay
              as they are.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reset.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={reset.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                reset.mutate();
              }}
            >
              {reset.isPending ? "Resetting…" : "Reset products"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
