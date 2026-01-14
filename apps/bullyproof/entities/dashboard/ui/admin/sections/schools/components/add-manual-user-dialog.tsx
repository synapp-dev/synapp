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
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Users as UsersIcon,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { useRoles } from "@/entities/users/model/store";
import { rolesApi } from "@/entities/roles/api/endpoints";
import { apiFetch } from "@/lib/api/fetcher.client";
import { cn } from "@workspace/ui/lib/utils";
import type { School as SchoolType } from "./schools-table-columns";
import { Separator } from "@workspace/ui/components/separator";

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

  const [step, setStep] = useState<"form" | "preview">("form");
  const [addUserSuccess, setAddUserSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [apTeacher, setApTeacher] = useState(false);
  const [schoolAdmin, setSchoolAdmin] = useState(false);

  const hasValidEmail = email ? isValidEmail(email) : false;
  const canProceed =
    hasValidEmail && (firstName.trim() || lastName.trim() || email.trim());

  // Reset state when dialog closes
  const handleClose = (open: boolean) => {
    if (!open) {
      setStep("form");
      setAddUserSuccess(false);
      setSubmitting(false);
      setError(null);
      setEmail("");
      setFirstName("");
      setLastName("");
      setApTeacher(false);
      setSchoolAdmin(false);

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

  // Get role badge classes
  const getBadgeClasses = (roleKey: string) => {
    if (roleKey === "TEACHER") {
      return "bg-[var(--role-teacher)] text-[var(--role-teacher-text)] border-[var(--role-teacher)]/50";
    } else if (roleKey === "SCHOOL_ADMIN") {
      return "bg-[var(--role-school-admin)] text-[var(--role-school-admin-text)] border-[var(--role-school-admin)]/50";
    } else if (roleKey === "SCHOOL_STAFF") {
      return "bg-[var(--role-school-staff)] text-[var(--role-school-staff-text)] border-[var(--role-school-staff)]/50";
    }
    return "";
  };

  // Get selected roles for preview
  const selectedRoles = [
    { key: "SCHOOL_STAFF", name: "Staff" },
    ...(apTeacher ? [{ key: "TEACHER", name: "AP Teacher" }] : []),
    ...(schoolAdmin ? [{ key: "SCHOOL_ADMIN", name: "School Admin" }] : []),
  ];

  // Handle manual user creation - creates user with SCHOOL_STAFF role and optionally TEACHER and SCHOOL_ADMIN
  const handleManualCreate = async () => {
    if (!school || !hasValidEmail || addUserSuccess) return;

    setSubmitting(true);
    setError(null);
    try {
      // Get roles
      const staffRole = roles.find((r) => r.key === "SCHOOL_STAFF");
      const teacherRole = roles.find((r) => r.key === "TEACHER");
      const adminRole = roles.find((r) => r.key === "SCHOOL_ADMIN");

      if (!staffRole) {
        setError("SCHOOL_STAFF role not found. Please contact support.");
        setSubmitting(false);
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

      if (!createResult.data || createResult.error) {
        // Check for common error messages and status codes indicating duplicate user
        const errorMessage =
          createResult.error?.message ||
          "Failed to create user. Please try again.";
        const errorStatus = createResult.error?.status;
        const errorString = errorMessage.toLowerCase();

        // Check if this is a duplicate user error
        const isDuplicateUser =
          errorStatus === 409 || // Conflict status code
          errorStatus === 422 || // Unprocessable Entity (often used for validation/duplicate)
          errorString.includes("already exists") ||
          errorString.includes("already registered") ||
          errorString.includes("user already registered") ||
          errorString.includes("duplicate") ||
          errorString.includes("unique constraint") ||
          errorString.includes("email already") ||
          errorString.includes("already been registered") ||
          errorString.includes("user with this email");

        if (isDuplicateUser) {
          setError(
            `A user with the email ${email.trim()} already exists. Please use a different email address.`
          );
        } else {
          setError(errorMessage);
        }
        setSubmitting(false);
        return;
      }

      // Assign additional roles if checked
      const roleAssignments = [];
      const roleErrors: string[] = [];

      if (apTeacher && teacherRole) {
        roleAssignments.push(
          rolesApi.post
            .assignRole({
              userId: createResult.data.userId,
              roleId: teacherRole.id,
              schoolId: school.id,
            })
            .then((result) => {
              if (result.error) {
                const errorMsg = result.error?.message || "";
                const errorStr = errorMsg.toLowerCase();
                if (
                  errorStr.includes("already") ||
                  errorStr.includes("duplicate") ||
                  errorStr.includes("exists")
                ) {
                  // User already has this role, not a critical error
                  console.log("User already has AP Teacher role");
                } else {
                  roleErrors.push("Failed to assign AP Teacher role");
                }
              }
              return result;
            })
        );
      }

      if (schoolAdmin && adminRole) {
        roleAssignments.push(
          rolesApi.post
            .assignRole({
              userId: createResult.data.userId,
              roleId: adminRole.id,
              schoolId: school.id,
            })
            .then((result) => {
              if (result.error) {
                const errorMsg = result.error?.message || "";
                const errorStr = errorMsg.toLowerCase();
                if (
                  errorStr.includes("already") ||
                  errorStr.includes("duplicate") ||
                  errorStr.includes("exists")
                ) {
                  // User already has this role, not a critical error
                  console.log("User already has School Admin role");
                } else {
                  roleErrors.push("Failed to assign School Admin role");
                }
              }
              return result;
            })
        );
      }

      // Wait for all role assignments to complete
      if (roleAssignments.length > 0) {
        await Promise.all(roleAssignments);

        // If there were role assignment errors, show warning but still consider it a success
        if (roleErrors.length > 0) {
          setError(
            `User created successfully, but some roles could not be assigned: ${roleErrors.join(", ")}. You can assign them manually later.`
          );
          setSubmitting(false);
          return;
        }
      }

      setAddUserSuccess(true);
      onSuccess?.();
      setTimeout(() => {
        handleClose(false);
      }, 2000);
    } catch (error: any) {
      console.error("Failed to create user:", error);
      const errorMessage =
        error?.message || "An unexpected error occurred. Please try again.";
      const errorString = errorMessage.toLowerCase();

      // Check if this is a duplicate user error
      const isDuplicateUser =
        error?.status === 409 || // Conflict status code
        error?.status === 422 || // Unprocessable Entity
        errorString.includes("already exists") ||
        errorString.includes("already registered") ||
        errorString.includes("user already registered") ||
        errorString.includes("duplicate") ||
        errorString.includes("unique constraint") ||
        errorString.includes("email already") ||
        errorString.includes("already been registered") ||
        errorString.includes("user with this email");

      if (isDuplicateUser) {
        setError(
          `A user with the email ${email.trim()} already exists. Please use a different email address.`
        );
      } else {
        setError(errorMessage);
      }
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
            {step === "form"
              ? school?.name || ""
              : "Review the user details before creating."}
          </DialogDescription>
        </DialogHeader>

        {step === "form" ? (
          <div className="space-y-4 py-2 overflow-y-auto flex-1 min-h-0">
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

            <Separator />

            {/* Roles Section */}
            <div className="space-y-3 pt-2">
              <Label className="text-xs text-muted-foreground ml-2">
                Roles
              </Label>

              {/* Staff Role - Always checked and disabled */}
              <div className="flex items-center gap-3 rounded-lg border border-[var(--role-school-staff)]/50 bg-[var(--role-school-staff)]/10 p-3 cursor-not-allowed opacity-60 shadow-sm">
                <Checkbox
                  id="user-role-staff"
                  checked={true}
                  disabled={true}
                  className="data-[state=checked]:border-[var(--role-school-staff)] data-[state=checked]:bg-[var(--role-school-staff)] data-[state=checked]:text-[var(--role-school-staff-text)] rounded"
                />
                <span className="text-sm font-medium text-primary">
                  Staff (assigned by default)
                </span>
              </div>

              {/* AP Teacher Role */}
              <Label
                htmlFor="user-role-ap-teacher"
                className={cn(
                  "hover:bg-accent/50 flex items-center gap-3 rounded-lg border bg-white dark:bg-background p-3 cursor-pointer shadow-sm transition-colors",
                  apTeacher
                    ? "border-[var(--role-teacher)] bg-[var(--role-teacher)]/10 dark:bg-[var(--role-teacher)]/20"
                    : "border-muted"
                )}
              >
                <Checkbox
                  id="user-role-ap-teacher"
                  checked={apTeacher}
                  onCheckedChange={(checked) => setApTeacher(checked === true)}
                  className="data-[state=checked]:border-[var(--role-teacher)] data-[state=checked]:bg-[var(--role-teacher)] data-[state=checked]:text-[var(--role-teacher-text)] rounded"
                />
                <span className="text-sm font-medium">AP Teacher</span>
              </Label>

              {/* School Admin Role */}
              <Label
                htmlFor="user-role-school-admin"
                className={cn(
                  "hover:bg-accent/50 flex items-center gap-3 rounded-lg border bg-white dark:bg-background p-3 cursor-pointer shadow-sm transition-colors",
                  schoolAdmin
                    ? "border-[var(--role-school-admin)] bg-[var(--role-school-admin)]/10 dark:bg-[var(--role-school-admin)]/20"
                    : "border-muted"
                )}
              >
                <Checkbox
                  id="user-role-school-admin"
                  checked={schoolAdmin}
                  onCheckedChange={(checked) =>
                    setSchoolAdmin(checked === true)
                  }
                  className="data-[state=checked]:border-[var(--role-school-admin)] data-[state=checked]:bg-[var(--role-school-admin)] data-[state=checked]:text-[var(--role-school-admin-text)] rounded"
                />
                <span className="text-sm font-medium">School Admin</span>
              </Label>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2 px-6 overflow-y-auto flex-1 min-h-0">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* ID Badge Preview */}
            <Card className="border-2">
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-4">
                  {/* Avatar/Initials */}
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">
                      {firstName && lastName
                        ? `${firstName[0]}${lastName[0]}`.toUpperCase()
                        : firstName
                          ? firstName[0].toUpperCase()
                          : email
                            ? email[0].toUpperCase()
                            : "?"}
                    </span>
                  </div>

                  {/* Name */}
                  <div className="text-center">
                    <h3 className="text-xl font-semibold">
                      {firstName || lastName
                        ? `${firstName} ${lastName}`.trim()
                        : "New User"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {email}
                    </p>
                  </div>

                  {/* School */}
                  <div className="w-full border-t pt-4">
                    <p className="text-xs text-muted-foreground mb-2">School</p>
                    <p className="text-sm font-medium">{school?.name}</p>
                  </div>

                  {/* Roles */}
                  <div className="w-full border-t pt-4">
                    <p className="text-xs text-muted-foreground mb-3">Roles</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {selectedRoles.map((role) => {
                        const badgeClasses = getBadgeClasses(role.key);
                        const RoleIcon =
                          role.key === "SCHOOL_ADMIN"
                            ? ShieldCheck
                            : role.key === "TEACHER"
                              ? UsersIcon
                              : UsersIcon;

                        return (
                          <Badge
                            key={role.key}
                            variant="default"
                            className={cn(
                              "flex items-center gap-1 border px-2 py-1",
                              badgeClasses
                            )}
                          >
                            <RoleIcon className="h-3 w-3" />
                            {role.name}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className=" flex-shrink-0">
          {step === "form" ? (
            <>
              <Button variant="ghost" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setError(null);
                  setStep("preview");
                }}
                disabled={!canProceed}
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setError(null);
                  setStep("form");
                }}
                disabled={submitting}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleManualCreate}
                disabled={submitting || addUserSuccess}
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
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
