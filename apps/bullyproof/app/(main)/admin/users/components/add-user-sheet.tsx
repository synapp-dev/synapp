"use client";

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
  ChevronsLeft,
  ChevronsRight,
  Check,
  ShieldCheck,
  Users as UsersIcon,
  FileBadge2,
  Landmark,
  BicepsFlexed,
  School as SchoolIcon,
  ChevronsUpDown,
  UserPlus,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Card } from "@workspace/ui/components/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Separator } from "@workspace/ui/components/separator";
import { Progress } from "@workspace/ui/components/progress";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
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
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Enter the user's basic information.
              </DialogDescription>
            </DialogHeader>
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
                    <span className="text-xs text-secondary/75">
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
                : (lvl as any)?.name || (lvl as any)?.key || ""
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

        if (userType === "school") {
          return (
            <div className="space-y-4">
              <DialogHeader className="text-center shrink-0">
                <DialogTitle className="flex items-center justify-center gap-2 text-2xl">
                  <SchoolIcon className="h-8 w-8" />
                  Select a School
                </DialogTitle>
                <DialogDescription className="text-center">
                  Choose which school this user belongs to.
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-2 py-2 pr-4">
                  {loadingSchools ? (
                    <>
                      {[1, 2, 3].map((i) => (
                        <Card key={i} className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-muted shrink-0" />
                            <div className="flex flex-col gap-1 flex-1">
                              <div className="h-4 w-3/4 bg-muted rounded" />
                              <div className="h-3 w-1/2 bg-muted rounded" />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </>
                  ) : schools.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-sm text-muted-foreground">
                        No schools found.
                      </div>
                    </div>
                  ) : (
                    schools.map((school) => {
                      const { stateText, sectorText, levelsText } =
                        extractSchoolMetadata(school);
                      const parts = [stateText, sectorText, levelsText].filter(
                        Boolean
                      );
                      const isSelected = schoolId === school.id;

                      return (
                        <Card
                          key={school.id}
                          className={cn(
                            "px-4 py-2.5 cursor-pointer transition-all hover:shadow-md",
                            isSelected
                              ? "border-primary shadow-md bg-primary/5"
                              : "hover:border-primary/50"
                          )}
                          onClick={() => {
                            setSchoolId(isSelected ? "" : school.id);
                            setSelectedRoleKey("");
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: "#008993" }}
                            >
                              <SchoolIcon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex flex-col -space-y-0.5 flex-1">
                              <h3 className="font-semibold text-base truncate">
                                {school.name}
                              </h3>
                              {parts.length > 0 && (
                                <div className="flex items-center gap-1 text-muted-foreground text-[0.65rem]">
                                  {parts.map((part, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center gap-1"
                                    >
                                      <div className="truncate capitalize">
                                        {part}
                                      </div>
                                      {index < parts.length - 1 && (
                                        <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
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

        return (
          <div className="space-y-4">
            <DialogHeader className="text-center shrink-0">
              <DialogTitle className="flex items-center justify-center gap-2 text-2xl">
                <ShieldCheck className="h-8 w-8" />
                Select a Role
              </DialogTitle>
              <DialogDescription className="text-center">
                Choose the role for this user.
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

                    // Get icon based on role
                    let RoleIcon = ShieldCheck;
                    if (roleKey === "TEACHER") {
                      RoleIcon = UsersIcon;
                    } else if (roleKey === "SCHOOL_LICENCE") {
                      RoleIcon = FileBadge2;
                    }

                    return (
                      <Card
                        key={role.id}
                        className={cn(
                          "px-4 py-2.5 cursor-pointer transition-all hover:shadow-md",
                          isSelected
                            ? "border-primary shadow-md bg-primary/5"
                            : "hover:border-primary/50"
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
                            <RoleIcon className="w-4 h-4 text-white" />
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

  // For step 3, render content directly without ScrollArea wrapper
  const isStep3WithCards = step === 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xs max-h-[65vh] flex flex-col"
        showCloseButton={false}
      >
        {isStep3WithCards ? (
          <>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {renderStepContent()}

            <DialogFooter className="shrink-0">
              <div className="flex w-full items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={goBack}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={goNext}
                  disabled={!canProceedToNext() || loading}
                  className="bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90"
                >
                  {loading ? "Loading..." : "Next"}
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : (
          <>
            <ScrollArea className="flex-1 min-h-0">
              <div className="pr-4">
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {renderStepContent()}
              </div>
            </ScrollArea>

            <DialogFooter className="shrink-0">
              <div className="flex w-full items-center justify-center gap-2">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={goBack}
                    disabled={loading}
                  >
                    Back
                  </Button>
                )}
                {step < totalSteps ? (
                  <Button
                    type="button"
                    onClick={goNext}
                    disabled={!canProceedToNext() || loading}
                    className="bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90"
                  >
                    Next
                    <ChevronsRight className="h-4 w-4" />
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
