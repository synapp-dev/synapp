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
import { inventoryNormalisationKeys } from "@/entities/inventory-normalisation/model/keys";
import { buildScopedPath } from "@/lib/build-scoped-path";

/**
 * Resets just the normalisation (inventory) stage: re-queues every supplier raw
 * item and removes the supplier products the wizard created — without touching
 * suppliers, invoices or POS. Useful for re-running the wizard from scratch.
 */
export function ResetNormalisationMenuItem() {
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
      const { data, error } = await inventorySetupApi.post.resetNormalisation({
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
          queryKey: inventoryNormalisationKeys.all,
        }),
        queryClient.invalidateQueries({
          queryKey: inventorySetupKeys.progress(organisationSlug, venueSlug),
        }),
      ]);
      toast.success(
        `Normalisation reset — ${data.itemsReset} item${data.itemsReset === 1 ? "" : "s"} back to pending`,
      );
      router.push(
        buildScopedPath(
          organisationSlug,
          venueSlug,
          "settings/inventory-setup/inventory",
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
        Reset normalisation
      </DropdownMenuItem>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset normalisation?</AlertDialogTitle>
            <AlertDialogDescription>
              This sends every supplier item for {venueSlug} back to &ldquo;not
              normalised&rdquo; so you can run the wizard from scratch. The
              supplier products the wizard created are removed and the cached AI
              suggestions are cleared. Suppliers, invoices, and the imported POS
              catalogue stay as they are; ingredients are kept but their supplier
              links are cleared.
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
              {reset.isPending ? "Resetting…" : "Reset normalisation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
