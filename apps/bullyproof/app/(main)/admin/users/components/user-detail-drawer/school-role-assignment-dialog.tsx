"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
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
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
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
import { cn } from "@workspace/ui/lib/utils";
import { AlertCircle, Check, ChevronsUpDown, Loader2, ShieldCheck, Users as UsersIcon } from "lucide-react";
import type { School } from "@/entities/school/model/useListSchoolsQuery";
import type { roles } from "@/server/db/schema";
import { extractSchoolMetadata } from "./utils";

type Role = typeof roles.$inferSelect;

export interface SchoolRoleAssignmentDialogProps {
  mode: "add" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  schools: School[];
  initialSchoolId?: string | null;
  initialSchoolName?: string;
  selectedSchoolId: string;
  onSchoolIdChange: (id: string) => void;
  roles: Role[];
  selectedRoleIds: Set<string>;
  onRoleIdsChange: (ids: Set<string>) => void;
  onSubmit: () => void | Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  error?: string | null;
  excludeSchoolIds?: Set<string>;
  loadingSchools?: boolean;
}

const ROLE_ORDER = ["SCHOOL_STAFF", "TEACHER", "SCHOOL_ADMIN"] as const;

function getRoleBorderColor(roleKey: string) {
  if (roleKey === "TEACHER") return "border-[var(--role-teacher)]";
  if (roleKey === "SCHOOL_ADMIN") return "border-[var(--role-school-admin)]";
  if (roleKey === "SCHOOL_STAFF") return "border-[var(--role-school-staff)]";
  return "border-muted";
}

function getRoleBgColor(roleKey: string) {
  if (roleKey === "TEACHER") return "bg-[var(--role-teacher)]/10 dark:bg-[var(--role-teacher)]/20";
  if (roleKey === "SCHOOL_ADMIN") return "bg-[var(--role-school-admin)]/10 dark:bg-[var(--role-school-admin)]/20";
  if (roleKey === "SCHOOL_STAFF") return "bg-[var(--role-school-staff)]/10 dark:bg-[var(--role-school-staff)]/20";
  return "";
}

function getRoleDisplayName(roleKey: string, fallback: string) {
  if (roleKey === "SCHOOL_STAFF") return "Staff";
  if (roleKey === "SCHOOL_ADMIN") return "School Admin";
  if (roleKey === "TEACHER") return "AP Teacher";
  return fallback;
}

function getCheckboxColorClasses(roleKey: string) {
  if (roleKey === "TEACHER")
    return "data-[state=checked]:border-[var(--role-teacher)] data-[state=checked]:bg-[var(--role-teacher)] data-[state=checked]:text-[var(--role-teacher-text)]";
  if (roleKey === "SCHOOL_ADMIN")
    return "data-[state=checked]:border-[var(--role-school-admin)] data-[state=checked]:bg-[var(--role-school-admin)] data-[state=checked]:text-[var(--role-school-admin-text)]";
  if (roleKey === "SCHOOL_STAFF")
    return "data-[state=checked]:border-[var(--role-school-staff)] data-[state=checked]:bg-[var(--role-school-staff)] data-[state=checked]:text-[var(--role-school-staff-text)]";
  return "";
}

export function SchoolRoleAssignmentDialog({
  mode,
  open,
  onOpenChange,
  title,
  description,
  schools,
  initialSchoolId,
  initialSchoolName,
  selectedSchoolId,
  onSchoolIdChange,
  roles,
  selectedRoleIds,
  onRoleIdsChange,
  onSubmit,
  onCancel,
  isSaving,
  error,
  excludeSchoolIds,
  loadingSchools = false,
}: SchoolRoleAssignmentDialogProps) {
  const [schoolComboboxOpen, setSchoolComboboxOpen] = useState(false);
  const [staffRemovalConfirmOpen, setStaffRemovalConfirmOpen] = useState(false);

  const isEditMode = mode === "edit";
  const schoolId = isEditMode ? (initialSchoolId ?? selectedSchoolId) : selectedSchoolId;
  const effectiveSchools = isEditMode
    ? schools
    : schools.filter((s) => !excludeSchoolIds?.has(s.id));
  const selectedSchool = schools.find((s) => s.id === schoolId);

  const staffRole = roles.find((r) => r.key === "SCHOOL_STAFF");
  const staffSelected = staffRole ? selectedRoleIds.has(staffRole.id) : false;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSchoolComboboxOpen(false);
      setStaffRemovalConfirmOpen(false);
    }
    onOpenChange(next);
  };

  const handleSaveClick = async () => {
    if (isEditMode && staffRole && !staffSelected) {
      setStaffRemovalConfirmOpen(true);
      return;
    }
    await onSubmit();
  };

  const handleConfirmStaffRemoval = async () => {
    setStaffRemovalConfirmOpen(false);
    await onSubmit();
  };

  const schoolRoles = roles
    .filter((r) => ROLE_ORDER.includes((r.key || "") as (typeof ROLE_ORDER)[number]))
    .sort(
      (a, b) =>
        (ROLE_ORDER.indexOf((a.key || "") as (typeof ROLE_ORDER)[number]) ?? 999) -
        (ROLE_ORDER.indexOf((b.key || "") as (typeof ROLE_ORDER)[number]) ?? 999)
    );

  const canSubmitAdd =
    !!selectedSchoolId && selectedRoleIds.size > 0 && !isSaving;
  const submitLabelAdd = isSaving ? "Assigning..." : "Assign Roles";
  const submitLabelEdit = isSaving ? "Saving..." : "Save Changes";

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* School: dropdown (add) or locked display (edit) */}
            <div className="space-y-2">
              <Label htmlFor="school-select">School *</Label>
              {isEditMode ? (
                <div
                  className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-muted/50 px-3 py-2 text-sm",
                    "cursor-not-allowed opacity-90"
                  )}
                >
                  <div className="flex flex-col -space-y-0.5">
                    <span>{initialSchoolName || selectedSchool?.name || "School"}</span>
                    {selectedSchool && (() => {
                      const { stateText, sectorText, levelsText } =
                        extractSchoolMetadata(selectedSchool);
                      const parts = [stateText, sectorText, levelsText].filter(Boolean);
                      return parts.length > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {parts.join(" • ")}
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>
              ) : (
                <Popover open={schoolComboboxOpen} onOpenChange={setSchoolComboboxOpen} modal>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={schoolComboboxOpen}
                      className="w-full justify-between"
                      disabled={loadingSchools}
                    >
                      {selectedSchoolId
                        ? schools.find((s) => s.id === selectedSchoolId)?.name
                        : "Select a school..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="Search school..." />
                      <CommandList>
                        <CommandEmpty>No school found.</CommandEmpty>
                        <CommandGroup>
                          {effectiveSchools.map((school) => {
                            const { stateText, sectorText, levelsText } =
                              extractSchoolMetadata(school);
                            const parts = [stateText, sectorText, levelsText].filter(Boolean);
                            return (
                              <CommandItem
                                key={school.id}
                                value={`${school.id} ${school.name}`}
                                onSelect={() => {
                                  onSchoolIdChange(
                                    school.id === selectedSchoolId ? "" : school.id
                                  );
                                  setSchoolComboboxOpen(false);
                                  onRoleIdsChange(new Set());
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedSchoolId === school.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col -space-y-0.5">
                                  <span>{school.name}</span>
                                  {parts.length > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      {parts.join(" • ")}
                                    </span>
                                  )}
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Role selection - only show when school is selected (or edit mode) */}
            {(schoolId || isEditMode) && (
              <div className="space-y-1">
                <Label className="ml-2 text-xs text-muted-foreground">
                  Roles
                </Label>
                <div className="space-y-3">
                  {schoolRoles.map((role) => {
                    const roleKey = role.key || "";
                    const isStaff = roleKey === "SCHOOL_STAFF";
                    const isSelected = selectedRoleIds.has(role.id);

                    let RoleIcon = UsersIcon;
                    if (roleKey === "SCHOOL_ADMIN") RoleIcon = ShieldCheck;

                    if (isEditMode) {
                      return (
                        <Label
                          key={role.id}
                          htmlFor={`role-${role.id}`}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-lg border bg-white p-3 shadow-sm transition-colors dark:bg-background",
                            "hover:bg-accent/50",
                            isSelected
                              ? `${getRoleBorderColor(roleKey)} ${getRoleBgColor(roleKey)}`
                              : "border-muted"
                          )}
                        >
                          <Checkbox
                            id={`role-${role.id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              const next = new Set(selectedRoleIds);
                              if (checked) next.add(role.id);
                              else next.delete(role.id);
                              onRoleIdsChange(next);
                            }}
                            className={cn("rounded", getCheckboxColorClasses(roleKey))}
                          />
                          <div className="flex flex-1 items-center gap-2">
                            <RoleIcon className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              {getRoleDisplayName(roleKey, role.name || roleKey)}
                            </span>
                          </div>
                        </Label>
                      );
                    }

                    if (isStaff) {
                      return (
                        <div
                          key={role.id}
                          className={cn(
                            "flex cursor-not-allowed items-center gap-3 rounded-lg border bg-white p-3 opacity-60 shadow-sm dark:bg-background",
                            `${getRoleBorderColor(roleKey)}/50 ${getRoleBgColor(roleKey)}`
                          )}
                        >
                          <Checkbox
                            id={`role-${role.id}`}
                            checked
                            disabled
                            className={cn("rounded", getCheckboxColorClasses(roleKey))}
                          />
                          <div className="flex flex-1 items-center gap-2">
                            <RoleIcon className="h-4 w-4" />
                            <span className="text-sm font-medium text-primary">
                              {getRoleDisplayName(roleKey, role.name || roleKey)} (assigned by default)
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <Label
                        key={role.id}
                        htmlFor={`role-${role.id}`}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg border bg-white p-3 shadow-sm transition-colors dark:bg-background",
                          "hover:bg-accent/50",
                          isSelected
                            ? `${getRoleBorderColor(roleKey)} ${getRoleBgColor(roleKey)}`
                            : "border-muted"
                        )}
                      >
                        <Checkbox
                          id={`role-${role.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            const next = new Set(selectedRoleIds);
                            if (checked) next.add(role.id);
                            else next.delete(role.id);
                            onRoleIdsChange(next);
                          }}
                          className={cn("rounded", getCheckboxColorClasses(roleKey))}
                        />
                        <div className="flex flex-1 items-center gap-2">
                          <RoleIcon className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {getRoleDisplayName(roleKey, role.name || roleKey)}
                          </span>
                        </div>
                      </Label>
                    );
                  })}
                </div>
              </div>
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
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveClick}
              disabled={isEditMode ? isSaving : !canSubmitAdd}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? "Saving..." : "Assigning..."}
                </>
              ) : isEditMode ? (
                "Save Changes"
              ) : (
                "Assign Roles"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit mode: staff removal confirmation */}
      <AlertDialog open={staffRemovalConfirmOpen} onOpenChange={setStaffRemovalConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User from School</AlertDialogTitle>
            <AlertDialogDescription>
              This user will be completely removed from the school. They will no
              longer have any access to this school. The user will remain in the
              database. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmStaffRemoval}
              disabled={isSaving}
              className="bg-destructive text-secondary hover:bg-destructive/90 focus:ring-destructive"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Yes, Remove from School"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
