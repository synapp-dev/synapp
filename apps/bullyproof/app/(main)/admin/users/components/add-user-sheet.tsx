"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@workspace/ui/components/sheet";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Button } from "@workspace/ui/components/button";
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
import { rolesApi } from "@/entities/roles/api/endpoints";
import { schoolApi } from "@/entities/school/api/endpoints";
import { apiFetch } from "@/lib/api/fetcher.client";
import type { roles } from "@/server/db/schema";
import type { School } from "@/entities/school/model/useListSchoolsQuery";
import {
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  ShieldCheck,
  Users as UsersIcon,
  FileBadge2,
  Landmark,
  BicepsFlexed,
  School as SchoolIcon,
  ChevronsUpDown,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";

type Role = typeof roles.$inferSelect;

type UserType = "bullyproof" | "government" | "school" | null;

interface AddUserSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated?: () => void;
}

export function AddUserSheet({
  open,
  onOpenChange,
  onUserCreated,
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
  const [roleComboboxOpen, setRoleComboboxOpen] = useState(false);

  const totalSteps = 4;

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
    }
  }, [open]);

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
          firstName.trim() !== "" &&
          lastName.trim() !== ""
        );
      case 2:
        return userType !== null;
      case 3:
        if (userType === "school") {
          return schoolId !== "" && selectedRoleKey !== "";
        }
        return selectedRoleKey !== "";
      case 4:
        return true; // Confirmation step, can always proceed (create user)
      default:
        return false;
    }
  };

  const goNext = () => {
    if (canProceedToNext()) {
      setError(null);
      setStep((prev) => Math.min(totalSteps, prev + 1));
    }
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
          (r) => r.key === "PLATFORM_ADMIN" || r.key === "PLATFORM_STAFF"
        );
      case "government":
        return roles.filter((r) => r.key === "GOVERNMENT_VIEWER");
      case "school":
        return roles.filter(
          (r) =>
            r.key === "SCHOOL_ADMIN" ||
            r.key === "TEACHER" ||
            r.key === "SCHOOL_STAFF" ||
            r.key === "SCHOOL_LICENCE"
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
      } else if (selectedRole.key === "SCHOOL_LICENCE") {
        endpoint = "/users/new/school-license";
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
          firstName,
          lastName,
          roleScope,
          schoolId: userType === "school" ? schoolId : undefined,
          roleName: selectedRole.name,
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

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
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
                disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              What kind of user are you adding?
            </p>
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
                    <span className="text-xs text-muted-foreground">
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
                    <span className="text-xs text-muted-foreground">
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
                    <span className="text-xs text-muted-foreground">
                      School admin, teacher, staff, or school licence
                    </span>
                  </div>
                </div>
              </Button>
            </div>
          </div>
        );

      case 3:
        const availableRoles = getAvailableRolesForUserType();

        return (
          <div className="space-y-4">
            {userType === "school" && (
              <div className="space-y-2">
                <Label htmlFor="school">School *</Label>
                {loadingSchools ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading schools...
                  </div>
                ) : (
                  <Popover
                    open={schoolComboboxOpen}
                    onOpenChange={setSchoolComboboxOpen}
                    modal
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={schoolComboboxOpen}
                        className="w-full justify-between"
                        disabled={loading}
                      >
                        {schoolId
                          ? schools.find((school) => school.id === schoolId)
                              ?.name
                          : "Select a school..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[var(--radix-popover-trigger-width)] max-h-[var(--radix-popover-content-available-height)] p-0 overflow-y-auto"
                      align="start"
                    >
                      <Command>
                        <CommandInput
                          placeholder="Search school..."
                          className="h-9"
                        />
                        <CommandList>
                          <CommandEmpty>No school found.</CommandEmpty>
                          <CommandGroup>
                            {schools.map((school) => (
                              <CommandItem
                                key={school.id}
                                value={`${school.id} ${school.name}`}
                                onSelect={() => {
                                  setSchoolId(
                                    school.id === schoolId ? "" : school.id
                                  );
                                  setSelectedRoleKey("");
                                  setSchoolComboboxOpen(false);
                                }}
                              >
                                {school.name}
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    schoolId === school.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                            {schools.length === 0 && (
                              <CommandItem disabled>
                                No schools available
                              </CommandItem>
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              {loadingRoles ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading roles...
                </div>
              ) : (
                <Popover
                  open={roleComboboxOpen}
                  onOpenChange={setRoleComboboxOpen}
                  modal
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={roleComboboxOpen}
                      className="w-full justify-between"
                      disabled={loading || (userType === "school" && !schoolId)}
                    >
                      {selectedRoleKey
                        ? availableRoles.find(
                            (role) => role.key === selectedRoleKey
                          )?.name
                        : "Select a role..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] max-h-[var(--radix-popover-content-available-height)] p-0 overflow-y-auto"
                    align="start"
                  >
                    <Command>
                      <CommandInput
                        placeholder="Search role..."
                        className="h-9"
                      />
                      <CommandList>
                        <CommandEmpty>No role found.</CommandEmpty>
                        <CommandGroup>
                          {availableRoles.map((role) => (
                            <CommandItem
                              key={role.id}
                              value={`${role.key || ""} ${role.name}`}
                              onSelect={() => {
                                setSelectedRoleKey(
                                  role.key === selectedRoleKey
                                    ? ""
                                    : role.key || ""
                                );
                                setRoleComboboxOpen(false);
                              }}
                            >
                              {role.name}
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  selectedRoleKey === role.key
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                          {availableRoles.length === 0 && (
                            <CommandItem disabled>
                              {userType === "school" && !schoolId
                                ? "Please select a school first"
                                : "No roles available"}
                            </CommandItem>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        );

      case 4:
        return renderConfirmation();

      default:
        return null;
    }
  };

  const renderConfirmation = () => {
    const selectedRole = getSelectedRole();
    const selectedSchool = getSelectedSchool();
    const roleKey = selectedRole?.key || "";

    // Get badge styling based on role key (matching user-detail-drawer styles)
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
    } else if (roleKey === "SCHOOL_LICENCE") {
      badgeStyle = {
        backgroundColor: "#6b7280",
        color: "white",
      };
    }

    const isAdmin = roleKey.includes("ADMIN") || roleKey.includes("admin");

    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-full max-w-sm border-2 border-border rounded-lg p-6 bg-card shadow-lg">
          {/* ID Badge Style Card */}
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
                  ) : roleKey === "SCHOOL_LICENCE" ? (
                    <FileBadge2 className="h-4 w-4" />
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="top"
        className="w-full max-w-md mx-auto rounded-b-2xl border-b-2 border-l-2 border-r-2 border-border/50 shadow-2xl p-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>Add New User</SheetTitle>
          {/* Progress indicator */}
          <div className="flex items-center gap-2 mt-4">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`size-2 rounded-full transition-colors ${
                    s <= step ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                />
                {s < totalSteps && <div className="h-px w-6 bg-border" />}
              </div>
            ))}
          </div>
        </SheetHeader>

        <div className="px-6 py-6 min-h-[300px]">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {renderStepContent()}
        </div>

        <SheetFooter className="px-6 py-4 border-t gap-2">
          <div className="flex items-center justify-between w-full">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={step === 1 || loading}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {step < totalSteps ? (
              <Button
                type="button"
                onClick={goNext}
                disabled={!canProceedToNext() || loading}
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleCreateUser}
                disabled={!canProceedToNext() || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Create User
                  </>
                )}
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
