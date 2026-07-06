"use client";

import type { RoleRow } from "@/types/db";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { rolesApi } from "@/entities/roles/api/endpoints";
import { INTRADARK_DEV_PLATFORM_ROLE_KEY } from "@/lib/intradark-dev-protection";
import { PLATFORM_ROLE_KEYS } from "./utils";

type Role = RoleRow;

export type PlatformRoleSwapDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userDisplayName: string;
  /** Current standard platform role key (PLATFORM_ADMIN, etc.). */
  currentRoleKey: string;
  roles: Role[];
  /** Offer INTRADARK_DEV as swap target (only assignable by dev on server). */
  includeIntradarkDevOption: boolean;
  onSuccess: () => void;
};

export function PlatformRoleSwapDialog({
  open,
  onOpenChange,
  userId,
  userDisplayName,
  currentRoleKey,
  roles,
  includeIntradarkDevOption,
  onSuccess,
}: PlatformRoleSwapDialogProps) {
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const keyOrder = [
    ...PLATFORM_ROLE_KEYS,
    ...(includeIntradarkDevOption ? [INTRADARK_DEV_PLATFORM_ROLE_KEY] : []),
  ];

  const swapOptions = keyOrder
    .filter((k) => k !== currentRoleKey)
    .map((key) => roles.find((r) => r.key === key))
    .filter((r): r is Role => Boolean(r));

  useEffect(() => {
    if (open) {
      setSelectedRoleId("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!selectedRoleId) return;
    const currentRole = roles.find((r) => r.key === currentRoleKey);
    if (!currentRole) {
      setError("Current role not found");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const removeResult = await rolesApi.delete.removeRole({
        userId,
        roleId: currentRole.id,
        schoolId: undefined,
      });
      if (removeResult.error) {
        setError(removeResult.error.message || "Failed to remove current role");
        setIsSaving(false);
        return;
      }

      const assignResult = await rolesApi.post.assignRole({
        userId,
        roleId: selectedRoleId,
      });
      if (assignResult.error) {
        setError(
          assignResult.error.message ||
            "Role removed but assigning the new role failed. Refresh and try again."
        );
        setIsSaving(false);
        onSuccess();
        return;
      }

      onOpenChange(false);
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change platform access level</DialogTitle>
          <DialogDescription>
            Select a new platform access level for {userDisplayName}. School
            access levels cannot be combined with a platform access level.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {swapOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No other access levels available.</p>
          ) : (
            <RadioGroup
              value={selectedRoleId}
              onValueChange={setSelectedRoleId}
              className="gap-2"
            >
              {swapOptions.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center gap-3 rounded-lg border border-input bg-background p-3"
                >
                  <RadioGroupItem value={role.id} id={`swap-${role.id}`} />
                  <Label
                    htmlFor={`swap-${role.id}`}
                    className="flex-1 cursor-pointer font-normal leading-snug"
                  >
                    {role.name || role.key}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedRoleId || isSaving || swapOptions.length === 0}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
