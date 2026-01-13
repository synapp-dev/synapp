"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Loader2 } from "lucide-react";
import { useRoles } from "@/entities/users/model/store";
import { apiFetch } from "@/lib/api/fetcher.client";
import type { School as SchoolType } from "./schools-table-columns";

interface AddManualUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school: SchoolType | null;
  onSuccess?: () => void;
}

// Email validation helper
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export function AddManualUserDialog({
  open,
  onOpenChange,
  school,
  onSuccess,
}: AddManualUserDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { roles } = useRoles();

  const [addUserSuccess, setAddUserSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const hasValidEmail = email ? isValidEmail(email) : false;

  // Reset state when dialog closes
  const handleClose = (open: boolean) => {
    if (!open) {
      setAddUserSuccess(false);
      setEmail("");
      setFirstName("");
      setLastName("");

      // Remove dialog query parameter from URL
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.delete("dialog");
      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;
      router.replace(newUrl, { scroll: false });
    }
    onOpenChange(open);
  };

  // Handle manual user creation - creates user with SCHOOL_STAFF role
  const handleManualCreate = async () => {
    if (!school || !hasValidEmail || addUserSuccess) return;

    setSubmitting(true);
    try {
      // Get SCHOOL_STAFF role
      const staffRole = roles.find((r) => r.key === "SCHOOL_STAFF");
      if (!staffRole) {
        console.error("SCHOOL_STAFF role not found");
        return;
      }

      // Create user with SCHOOL_STAFF role using /users/new endpoint
      const createResult = await apiFetch<{
        userId: string;
        email: string;
        schoolId: string;
      }>("/users/new", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          roleScope: "school",
          schoolId: school.id,
          roleName: "SCHOOL_STAFF",
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
        }),
      });

      if (createResult.error) {
        console.error("Failed to create user:", createResult.error);
      } else {
        setAddUserSuccess(true);
        onSuccess?.();
        setTimeout(() => {
          handleClose(false);
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to create user:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!school) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="!max-w-md">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>
            Add a new user to this school. Users will be added as SCHOOL_STAFF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 px-6 overflow-y-auto flex-1 min-h-0">
          {/* First Name and Last Name in same row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="user-first-name"
                className="text-xs text-muted-foreground ml-2"
              >
                First Name
              </Label>
              <Input
                id="user-first-name"
                type="text"
                placeholder="Enter first name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="user-last-name"
                className="text-xs text-muted-foreground ml-2"
              >
                Last Name
              </Label>
              <Input
                id="user-last-name"
                type="text"
                placeholder="Enter last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          {/* Email on its own row */}
          <div className="space-y-1.5">
            <Label
              htmlFor="user-email"
              className="text-xs text-muted-foreground ml-2"
            >
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="user-email"
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={
                email && !hasValidEmail
                  ? "border-red-500 focus-visible:ring-red-500"
                  : ""
              }
            />
            {email && !hasValidEmail && (
              <p className="text-sm text-red-500 ml-2">
                Please enter a valid email address (e.g., name@domain.com)
              </p>
            )}
          </div>
        </div>
        <DialogFooter className="px-6 pb-6 pt-4 flex-shrink-0 border-t">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleManualCreate}
            disabled={submitting || !hasValidEmail || addUserSuccess}
            className={
              addUserSuccess
                ? "bg-green-600 hover:bg-green-700 text-white"
                : ""
            }
          >
            {addUserSuccess ? (
              "Add Successful"
            ) : submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create User"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
