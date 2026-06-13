"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
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
import { suppliersKeys } from "@/entities/suppliers/model/keys";
import { buildScopedPath } from "@/lib/build-scoped-path";

export function RestartInventorySetupMenuItem() {
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

  const restart = useMutation({
    mutationFn: async () => {
      if (!organisationSlug || !venueSlug) {
        throw new Error("Select a venue first");
      }
      const { data, error } = await inventorySetupApi.post.restart({
        organisationSlug,
        venueSlug,
      });
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Restart failed");
      return data;
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: suppliersKeys.scope(organisationSlug, venueSlug),
        }),
        queryClient.invalidateQueries({
          queryKey: inventorySetupKeys.progress(organisationSlug, venueSlug),
        }),
      ]);
      toast.success(
        `Inventory setup reset — removed ${data.suppliersRemoved} suppliers, ${data.invoicesRemoved} invoices, and ${data.menuItemsRemoved} POS items`,
      );
      router.push(
        buildScopedPath(organisationSlug, venueSlug, "settings/inventory-setup"),
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Restart failed");
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
        <RotateCcw />
        Restart inventory setup
      </DropdownMenuItem>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart inventory setup?</AlertDialogTitle>
            <AlertDialogDescription>
              This wipes inventory setup for {venueSlug} back to a fresh start:
              all suppliers, invoices, raw items, purchase orders, the imported
              POS catalogue (menu items, groups, modifiers, recipes), and the
              guided wizard&apos;s progress. Ingredients are kept but their
              supplier links are cleared. Xero and Square stay connected so you
              can re-import.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restart.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={restart.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                restart.mutate();
              }}
            >
              {restart.isPending ? "Resetting…" : "Restart setup"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
