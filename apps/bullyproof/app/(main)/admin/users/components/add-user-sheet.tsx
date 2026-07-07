"use client";

import type { RoleRow } from "@/types/db";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { rolesApi } from "@/entities/roles/api/endpoints";
import { schoolApi } from "@/entities/school/api/endpoints";
import { apiFetch } from "@/lib/api/fetcher.client";
import { useUserEmailLookup } from "@/entities/users/hooks/use-user-email-lookup";
import type { School } from "@/entities/school/model/useListSchoolsQuery";
import {
  Loader2,
  AlertCircle,
  ChevronsRight,
  Check,
  ShieldCheck,
  Users as UsersIcon,
  Landmark,
  BicepsFlexed,
  School as SchoolIcon,
  ChevronsUpDown,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Card } from "@workspace/ui/components/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@workspace/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

type Role = RoleRow;

type UserType = "bullyproof" | "government" | "school" | null;

interface AddUserSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated?: () => void;
  onOpenExistingUser?: (userId: string) => void;
}

export function AddUserSheet({
  open,
  onOpenChange,
  onUserCreated,
  onOpenExistingUser,
}: AddUserSheetProps) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userType, setUserType] = useState<UserType>(null);
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>("");
  const [schoolId, setSchoolId] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schoolComboboxOpen, setSchoolComboboxOpen] = useState(false);
  const { lookupByEmail, lookupLoading, resetLookup, userExists } =
    useUserEmailLookup();

  const totalSteps = 4;

  const stepLabels = [
    "Details",
    "User Type",
    userType === "school" ? "School & Access Level" : "Access Level",
    "Confirm",
  ];

  // Load roles and schools on mount
  useEffect(() => {
    if (open) {
      loadRoles();
      loadSchools();
    }
  }, [open]);

  // Reset form when sheet closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setEmail("");
      setFirstName("");
      setLastName("");
      setUserType(null);
      setSelectedRoleKey("");
      setSchoolId("");
      setError(null);
      setSchoolComboboxOpen(false);
      resetLookup();
    }
  }, [open, resetLookup]);

  const loadRoles = async () => {
    try {
      setLoadingRoles(true);
      const result = await rolesApi.get.list();
      if (result.data) {
        setRoles(result.data);
      } else if (result.error) {
        setError(result.error.message || "Failed to load roles");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load roles");
    } finally {
      setLoadingRoles(false);
    }
  };

  const loadSchools = async () => {
    try {
      setLoadingSchools(true);
      const result = await schoolApi.get.listSchools({ limit: 100 });
      if (result.data) {
        setSchools(result.data);
      } else if (result.error) {
        setError(result.error.message || "Failed to load schools");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load schools");
    } finally {
      setLoadingSchools(false);
    }
  };

  const canProceedToNext = () => {
    switch (step) {
      case 1:
        return (
          email.trim() !== "" &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
          (userExists || (firstName.trim() !== "" && lastName.trim() !== ""))
        );
      case 2:
        return userType !== null;
      case 3:
        if (userType === "school") {
          return schoolId !== "" && selectedRoleKey !== "";
        }
        return selectedRoleKey !== "";
      case 4:
        return true;
      default:
        return false;
    }
  };

  const goNext = async () => {
    if (!canProceedToNext()) return;

    setError(null);

    if (step === 1) {
      try {
        const schoolIdForLookup =
          userType === "school" && schoolId ? schoolId : undefined;
        const result = await lookupByEmail(email.trim(), schoolIdForLookup);
        if (result.exists) {
          setFirstName(result.firstName?.trim() ?? "");
          setLastName(result.lastName?.trim() ?? "");
        }
      } catch {
        // Backend still handles existing users on submit
      }
    }

    setStep((prev) => Math.min(totalSteps, prev + 1));
  };

  const goBack = () => {
    setError(null);
    setStep((prev) => Math.max(1, prev - 1));
  };

  const getAvailableRolesForUserType = () => {
    if (!userType) return [];

    switch (userType) {
      case "bullyproof":
        return roles.filter(
          (r) => r.key === "PLATFORM_ADMIN" || r.key === "PLATFORM_STAFF",
        );
      case "government":
        return roles.filter((r) => r.key === "GOVERNMENT_VIEWER");
      case "school":
        return roles.filter(
          (r) =>
            r.key === "SCHOOL_ADMIN" ||
            r.key === "TEACHER" ||
            r.key === "SCHOOL_STAFF",
        );
      default:
        return [];
    }
  };

  const getSelectedRole = () => {
    return roles.find((r) => r.key === selectedRoleKey);
  };

  const getSelectedSchool = () => {
    return schools.find((s) => s.id === schoolId);
  };

  // Helper function to extract school metadata
  const extractSchoolMetadata = (school: School | null) => {
    if (!school) {
      return { stateText: "", sectorText: "", levelsText: "" };
    }

    const st = (school as any)?.state;
    const stateText = st
      ? typeof st === "string"
        ? st.toUpperCase()
        : (st as any)?.code?.toUpperCase() || ""
      : "";

    const sector = (school as any)?.sector;
    const sectorText =
      typeof sector === "string"
        ? sector
        : sector && typeof sector === "object"
          ? (sector as any)?.name || ""
          : "";

    const lvls = (school as any)?.levels;
    let levelsText = "";
    if (Array.isArray(lvls) && lvls.length > 0) {
      const levelNames = lvls.map((lvl) =>
        typeof lvl === "string"
          ? lvl
          : (lvl as any)?.name || (lvl as any)?.key || "",
      );
      const lower = levelNames.map((s) => s.toLowerCase());
      const hasPrimary = lower.some((s) => s.includes("primary"));
      const hasSecondary = lower.some((s) => s.includes("secondary"));
      if (hasPrimary && hasSecondary) levelsText = "P-12";
      else if (hasPrimary) levelsText = "Primary";
      else if (hasSecondary) levelsText = "Secondary";
      else levelsText = levelNames.join(", ");
    }

    return { stateText, sectorText, levelsText };
  };

  const handleCreateUser = async () => {
    if (!canProceedToNext()) {
      setError("Please complete all required fields");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const selectedRole = getSelectedRole();
      if (!selectedRole) {
        throw new Error("Please select a role");
      }

      // Determine endpoint based on role
      let endpoint = "/users/new";
      if (selectedRole.key === "PLATFORM_ADMIN") {
        endpoint = "/users/new/platform-admin";
      } else if (selectedRole.key === "SCHOOL_ADMIN") {
        endpoint = "/users/new/school-admin";
      } else if (selectedRole.key === "TEACHER") {
        endpoint = "/users/new/teacher";
      }

      const roleScope = userType === "school" ? "school" : "platform";

      type CreateUserResponse = {
        userId: string;
        email: string;
        roleName: string;
        roleScope: string;
        schoolId?: string;
      };

      const result = await apiFetch<CreateUserResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify({
          email,
          firstName: userExists ? undefined : firstName,
          lastName: userExists ? undefined : lastName,
          roleScope,
          schoolId: userType === "school" ? schoolId : undefined,
          roleName: selectedRole.key,
        }),
      });

      if (result.data === null) {
        const errorObj = result as { error: { message: string } | string };
        const errorMessage =
          typeof errorObj.error === "object"
            ? errorObj.error.message
            : typeof errorObj.error === "string"
              ? errorObj.error
              : "Failed to create user";
        throw new Error(errorMessage);
      }

      // Close sheet and refresh
      onOpenChange(false);
      onUserCreated?.();
    } catch (err: any) {
      setError(err.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const handleSchoolRoleToggle = (roleKey: string) => {
    // Staff is always checked and disabled, can't toggle it
    if (roleKey === "SCHOOL_STAFF") return;

    // School Admin / AP Teacher: toggle on/off, falling back to Staff
    if (selectedRoleKey === roleKey) {
      setSelectedRoleKey("SCHOOL_STAFF");
    } else {
      setSelectedRoleKey(roleKey);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Enter the user's basic information.
              </DialogDescription>
            </DialogHeader>
            {userExists && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Existing user</AlertTitle>
                <AlertDescription>
                  Profile details are prefilled. Continue to assign a role or
                  school.
                </AlertDescription>
              </Alert>
            )}
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canProceedToNext()) {
                      e.preventDefault();
                      goNext();
                    }
                  }}
                  autoFocus
                  disabled={loading || lookupLoading}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canProceedToNext()) {
                        e.preventDefault();
                        goNext();
                      }
                    }}
                    disabled={loading || lookupLoading || userExists}
                    className={userExists ? "bg-muted" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canProceedToNext()) {
                        e.preventDefault();
                        goNext();
                      }
                    }}
                    disabled={loading || lookupLoading || userExists}
                    className={userExists ? "bg-muted" : ""}
                  />
                </div>
              </div>
            </>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Select User Type</DialogTitle>
              <DialogDescription>
                What kind of user are you adding?
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-3">
              <Button
                type="button"
                variant={userType === "bullyproof" ? "default" : "outline"}
                className="h-auto py-4 px-6 justify-start"
                onClick={() => {
                  setUserType("bullyproof");
                  setSelectedRoleKey("");
                  setSchoolId("");
                }}
                disabled={loading}
              >
                <div className="flex items-start gap-3 w-full">
                  <BicepsFlexed className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-semibold">Bullyproof</span>
                    <span
                      className={cn(
                        "text-xs",
                        userType === "bullyproof"
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground",
                      )}
                    >
                      Platform admin or staff
                    </span>
                  </div>
                </div>
              </Button>
              <Button
                type="button"
                variant={userType === "government" ? "default" : "outline"}
                className="h-auto py-4 px-6 justify-start"
                onClick={() => {
                  setUserType("government");
                  setSelectedRoleKey("");
                  setSchoolId("");
                }}
                disabled={loading}
              >
                <div className="flex items-start gap-3 w-full">
                  <Landmark className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-semibold">Government</span>
                    <span
                      className={cn(
                        "text-xs",
                        userType === "government"
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground",
                      )}
                    >
                      Government admin
                    </span>
                  </div>
                </div>
              </Button>
              <Button
                type="button"
                variant={userType === "school" ? "default" : "outline"}
                className="h-auto py-4 px-6 justify-start"
                onClick={() => {
                  setUserType("school");
                  setSelectedRoleKey("");
                  setSchoolId("");
                }}
                disabled={loading}
              >
                <div className="flex items-start gap-3 w-full">
                  <SchoolIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-semibold">School Member</span>
                    <span
                      className={cn(
                        "text-xs",
                        userType === "school"
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground",
                      )}
                    >
                      School admin, teacher, or staff
                    </span>
                  </div>
                </div>
              </Button>
            </div>
          </div>
        );

      case 3: {
        const availableRoles = getAvailableRolesForUserType();

        if (userType === "school") {
          const selectedSchoolObj = schools.find((s) => s.id === schoolId);
          const selectedMeta = selectedSchoolObj
            ? extractSchoolMetadata(selectedSchoolObj)
            : null;
          const selectedParts = selectedMeta
            ? [
                selectedMeta.stateText,
                selectedMeta.sectorText,
                selectedMeta.levelsText,
              ].filter(Boolean)
            : [];

          // Define the order: Staff first (always on), then optional upgrades
          const schoolRoleOrder = ["SCHOOL_STAFF", "SCHOOL_ADMIN", "TEACHER"];
          const orderedSchoolRoles = schoolRoleOrder
            .map((key) => availableRoles.find((r) => r.key === key))
            .filter(Boolean) as Role[];

          return (
            <div className="space-y-5 flex flex-col min-h-0">
              <DialogHeader className="shrink-0">
                <DialogTitle>School & Role</DialogTitle>
                <DialogDescription>
                  Select a school and assign a role for this user.
                </DialogDescription>
              </DialogHeader>

              {/* School Combobox */}
              <div className="space-y-2 shrink-0">
                <Label>School *</Label>
                <Popover
                  open={schoolComboboxOpen}
                  onOpenChange={setSchoolComboboxOpen}
                  modal={true}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={schoolComboboxOpen}
                      className="w-full justify-between h-auto min-h-10 font-normal"
                      disabled={loadingSchools}
                    >
                      {loadingSchools ? (
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading schools...
                        </span>
                      ) : selectedSchoolObj ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                            style={{ backgroundColor: "#008993" }}
                          >
                            <SchoolIcon className="w-3 h-3 text-white" />
                          </div>
                          <div className="flex flex-col -space-y-0.5 items-start min-w-0">
                            <span className="text-sm font-medium truncate">
                              {selectedSchoolObj.name}
                            </span>
                            {selectedParts.length > 0 && (
                              <span className="text-[0.6rem] text-muted-foreground truncate">
                                {selectedParts.join(" \u00B7 ")}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          Select a school...
                        </span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="Search schools..." />
                      <CommandList>
                        <CommandEmpty>No schools found.</CommandEmpty>
                        <CommandGroup>
                          {schools.map((school) => {
                            const { stateText, sectorText, levelsText } =
                              extractSchoolMetadata(school);
                            const parts = [
                              stateText,
                              sectorText,
                              levelsText,
                            ].filter(Boolean);
                            const isSelected = schoolId === school.id;

                            return (
                              <CommandItem
                                key={school.id}
                                value={school.name}
                                onSelect={() => {
                                  setSchoolId(isSelected ? "" : school.id);
                                  // Default to staff when selecting a new school
                                  setSelectedRoleKey(
                                    isSelected ? "" : "SCHOOL_STAFF",
                                  );
                                  setSchoolComboboxOpen(false);
                                }}
                                className="cursor-pointer py-2"
                              >
                                <div
                                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: "#008993" }}
                                >
                                  <SchoolIcon className="w-3 h-3 text-white" />
                                </div>
                                <div className="flex flex-col -space-y-0.5 flex-1 min-w-0">
                                  <span className="font-medium text-sm truncate">
                                    {school.name}
                                  </span>
                                  {parts.length > 0 && (
                                    <span className="text-[0.6rem] text-muted-foreground">
                                      {parts.join(" \u00B7 ")}
                                    </span>
                                  )}
                                </div>
                                {isSelected && (
                                  <Check className="h-4 w-4 text-primary shrink-0" />
                                )}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Role checkboxes (shown after school is selected) */}
              {schoolId && (
                <div className="space-y-2">
                  <Label>Role *</Label>
                  {loadingRoles ? (
                    <div className="space-y-3 py-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 px-3 py-2"
                        >
                          <div className="w-4 h-4 bg-muted rounded" />
                          <div className="h-4 w-32 bg-muted rounded" />
                        </div>
                      ))}
                    </div>
                  ) : orderedSchoolRoles.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-sm text-muted-foreground">
                        No roles available.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 rounded-md border p-3">
                      {orderedSchoolRoles.map((role) => {
                        const roleKey = role.key || "";
                        const isStaff = roleKey === "SCHOOL_STAFF";

                        // Staff is always checked and disabled
                        const checked = isStaff
                          ? true
                          : selectedRoleKey === roleKey;
                        const disabled = isStaff;

                        let RoleIcon = ShieldCheck;
                        if (roleKey === "TEACHER") {
                          RoleIcon = UsersIcon;
                        } else if (roleKey === "SCHOOL_STAFF") {
                          RoleIcon = UsersIcon;
                        }

                        // Description text for each role
                        let description = "";
                        if (roleKey === "SCHOOL_STAFF") {
                          description = "Basic school access";
                        } else if (roleKey === "SCHOOL_ADMIN") {
                          description = "Full school management";
                        } else if (roleKey === "TEACHER") {
                          description = "Teach and manage lessons";
                        }

                        const rowContent = (
                          <div
                            role="button"
                            tabIndex={0}
                            className={cn(
                              "flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors select-none",
                              checked && !disabled && "bg-primary/5",
                              disabled
                                ? "opacity-60 cursor-default"
                                : "cursor-pointer hover:bg-muted/50",
                            )}
                            onClick={() => {
                              if (!disabled) {
                                handleSchoolRoleToggle(roleKey);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (
                                !disabled &&
                                (e.key === "Enter" || e.key === " ")
                              ) {
                                e.preventDefault();
                                handleSchoolRoleToggle(roleKey);
                              }
                            }}
                          >
                            <Checkbox
                              checked={checked}
                              disabled={disabled}
                              onCheckedChange={() =>
                                handleSchoolRoleToggle(roleKey)
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="shrink-0"
                            />
                            <div
                              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: disabled
                                  ? "#9ca3af"
                                  : "#008993",
                              }}
                            >
                              <RoleIcon className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="flex flex-col -space-y-0.5 flex-1 min-w-0">
                              <span className="font-medium text-sm">
                                {role.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {description}
                              </span>
                            </div>
                            {isStaff && (
                              <span className="text-[0.6rem] text-muted-foreground italic shrink-0">
                                Auto-included
                              </span>
                            )}
                          </div>
                        );

                        if (isStaff) {
                          return (
                            <Tooltip key={role.id}>
                              <TooltipTrigger asChild>
                                {rowContent}
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="max-w-[260px]"
                              >
                                Every user assigned to a school will always have
                                the staff role at a minimum
                              </TooltipContent>
                            </Tooltip>
                          );
                        }

                        return <div key={role.id}>{rowContent}</div>;
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }

        // Non-school role selection (bullyproof / government)
        return (
          <div className="space-y-4">
            <DialogHeader className="text-center shrink-0">
              <DialogTitle className="flex items-center justify-center gap-2 text-2xl">
                <ShieldCheck className="h-8 w-8" />
                Select an Access Level
              </DialogTitle>
              <DialogDescription className="text-center">
                Choose the access level for this user.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-2 py-2 pr-4">
                {loadingRoles ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-muted shrink-0" />
                          <div className="flex flex-col gap-1 flex-1">
                            <div className="h-4 w-3/4 bg-muted rounded" />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </>
                ) : availableRoles.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-muted-foreground">
                      No roles available.
                    </div>
                  </div>
                ) : (
                  availableRoles.map((role) => {
                    const isSelected = selectedRoleKey === role.key;
                    const roleKey = role.key || "";

                    return (
                      <Card
                        key={role.id}
                        className={cn(
                          "px-4 py-2.5 cursor-pointer transition-all hover:shadow-md",
                          isSelected
                            ? "border-primary shadow-md bg-primary/5"
                            : "hover:border-primary/50",
                        )}
                        onClick={() => {
                          setSelectedRoleKey(isSelected ? "" : roleKey);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: "#008993" }}
                          >
                            <ShieldCheck className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex flex-col -space-y-0.5 flex-1">
                            <h3 className="font-semibold text-base truncate">
                              {role.name}
                            </h3>
                          </div>
                          {isSelected && (
                            <Check className="h-5 w-5 text-primary shrink-0" />
                          )}
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        );
      }

      case 4:
        return (
          <>
            <DialogHeader>
              <DialogTitle>Confirm User Details</DialogTitle>
              <DialogDescription>
                Review the user information before creating the account.
              </DialogDescription>
            </DialogHeader>
            {renderConfirmation()}
          </>
        );

      default:
        return null;
    }
  };

  const renderConfirmation = () => {
    const selectedRole = getSelectedRole();
    const selectedSchool = getSelectedSchool();
    const roleKey = selectedRole?.key || "";

    // Get badge styling based on role key
    let badgeStyle: {
      backgroundColor?: string;
      color?: string;
    } = {};

    if (roleKey === "PLATFORM_ADMIN") {
      badgeStyle = {
        backgroundColor: "#ff7f00",
        color: "white",
      };
    } else if (roleKey === "TEACHER") {
      badgeStyle = {
        backgroundColor: "#048393",
        color: "white",
      };
    } else if (roleKey === "SCHOOL_ADMIN") {
      badgeStyle = {
        backgroundColor: "blue",
        color: "white",
      };
    }

    const isAdmin = roleKey.includes("ADMIN") || roleKey.includes("admin");

    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-full max-w-sm border-2 border-border rounded-lg p-6 bg-card shadow-lg">
          <div className="space-y-4">
            {/* Name */}
            <div className="text-center">
              <h2 className="text-2xl font-bold">
                {firstName} {lastName}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{email}</p>
            </div>

            {/* Role Badge */}
            {selectedRole && (
              <div className="flex justify-center">
                <Badge
                  variant="default"
                  className="flex items-center gap-2 px-4 py-2 text-base"
                  style={badgeStyle}
                >
                  {isAdmin ? (
                    <ShieldCheck className="h-4 w-4" />
                  ) : (
                    <UsersIcon className="h-4 w-4" />
                  )}
                  {selectedRole.name}
                </Badge>
              </div>
            )}

            {/* School (if applicable) */}
            {selectedSchool && (
              <div className="text-center pt-2 border-t">
                <p className="text-sm font-medium text-muted-foreground">
                  {selectedSchool.name}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg h-[70vh] flex flex-col"
        showCloseButton={false}
      >
        {/* Step Progress Indicator */}
        <nav aria-label="Progress" className="shrink-0 pb-2">
          <ol className="flex items-center justify-between">
            {stepLabels.map((label, index) => {
              const stepNumber = index + 1;
              const isCompleted = step > stepNumber;
              const isCurrent = step === stepNumber;
              return (
                <li
                  key={index}
                  className={cn(
                    "flex flex-col items-center relative flex-1",
                    index < stepLabels.length - 1 &&
                      "after:content-[''] after:absolute after:top-4 after:left-[calc(50%+16px)] after:w-[calc(100%-32px)] after:h-[2px]",
                    index < stepLabels.length - 1 && isCompleted
                      ? "after:bg-[var(--brand-bullyproof-primary)]"
                      : "after:bg-border",
                  )}
                >
                  <div
                    className={cn(
                      "relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200",
                      isCompleted &&
                        "bg-[var(--brand-bullyproof-primary)] text-white",
                      isCurrent &&
                        "bg-[var(--brand-bullyproof-primary)] text-white ring-4 ring-[var(--brand-bullyproof-primary)]/20",
                      !isCompleted &&
                        !isCurrent &&
                        "bg-muted text-muted-foreground border-2 border-border",
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : stepNumber}
                  </div>
                  <span
                    className={cn(
                      "mt-1.5 text-[0.65rem] font-medium text-center leading-tight",
                      isCurrent
                        ? "text-foreground"
                        : isCompleted
                          ? "text-[var(--brand-bullyproof-primary)]"
                          : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="border-b -mx-6 mb-2" />

        {/* Step Content */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {renderStepContent()}
        </div>

        {/* Footer */}
        <DialogFooter className="shrink-0 border-t -mx-6 px-6 pt-4">
          <div className="flex w-full items-center justify-end gap-2">
            {step > 1 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  goBack();
                }}
                disabled={loading}
              >
                Back
              </Button>
            )}
            {step < totalSteps ? (
              <Button
                type="button"
                onClick={goNext}
                disabled={!canProceedToNext() || loading || lookupLoading}
                className="bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90"
              >
                {lookupLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    Next
                    <ChevronsRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleCreateUser}
                disabled={!canProceedToNext() || loading}
                className="bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Create User
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
