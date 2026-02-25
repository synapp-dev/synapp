"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import { Button } from "@workspace/ui/components/button";
import { Drama, Loader2, VenetianMask } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { RoleBadges } from "@/components/atoms/role-badges";
import { meApi, type UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
import { useMeStore } from "@/entities/me/model/store";

const SEARCH_DEBOUNCE_MS = 1000;
const PLATFORM_ROLE_DISPLAY_NAMES: Record<string, string> = {
  INTRADARK_DEV: "Intradark Dev",
  PLATFORM_ADMIN: "Platform Admin",
  PLATFORM_MODERATOR: "Platform Moderator",
  PLATFORM_STAFF: "Platform Staff",
  GOVERNMENT_ADMIN: "Government Admin",
  GOVERNMENT_VIEWER: "Government Viewer",
};

export function ImpersonateMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isStartingMode, setIsStartingMode] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserWithRolesAndSchools[]>([]);
  const viewAsUser = useMeStore((s) => s.viewAsUser);
  const viewAsStartedAt = useMeStore((s) => s.viewAsStartedAt);
  const startViewAsMode = useMeStore((s) => s.startViewAsMode);
  const stopViewAsMode = useMeStore((s) => s.stopViewAsMode);

  const selectedUserName = useMemo(() => {
    if (!viewAsUser) return "";
    const name = `${viewAsUser.firstName ?? ""} ${viewAsUser.lastName ?? ""}`.trim();
    return name || viewAsUser.email || "Selected user";
  }, [viewAsUser]);

  const selectedUserInitials = useMemo(() => {
    if (!selectedUserName) return "U";
    const tokens = selectedUserName.split(" ").filter(Boolean);
    if (tokens.length === 1) return tokens[0][0]?.toUpperCase() ?? "U";
    return `${tokens[0][0] ?? ""}${tokens[1][0] ?? ""}`.toUpperCase();
  }, [selectedUserName]);

  const selectedRoleLabel = useMemo(() => {
    if (!viewAsUser) return "User";
    const metadataRoles = (viewAsUser.metadata as any)?.roles;
    if (Array.isArray(metadataRoles) && metadataRoles.length > 0) {
      return String(metadataRoles[0]?.name ?? metadataRoles[0] ?? "User");
    }
    return "User";
  }, [viewAsUser]);

  const selectedSchoolsLabel = useMemo(() => {
    if (!viewAsUser) return "Not available";
    const schools = (viewAsUser.metadata as any)?.schools;
    if (Array.isArray(schools) && schools.length > 0) {
      return schools
        .slice(0, 2)
        .map((s: any) => s?.name ?? s?.schoolName ?? String(s))
        .join(", ");
    }
    return "Not available";
  }, [viewAsUser]);

  const sessionDurationLabel = useMemo(() => {
    if (!viewAsStartedAt) return "Just started";
    const elapsedMs = Date.now() - viewAsStartedAt;
    const elapsedMin = Math.max(1, Math.floor(elapsedMs / 60_000));
    return `${elapsedMin} minute${elapsedMin === 1 ? "" : "s"}`;
  }, [viewAsStartedAt, open]);

  const startedAtLabel = useMemo(() => {
    if (!viewAsStartedAt) return "Just now";
    return new Date(viewAsStartedAt).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }, [viewAsStartedAt]);

  const fetchUsers = async (query: string) => {
    setIsLoadingUsers(true);
    setLoadError(null);
    const { data, error } = await meApi.get.listAllUsers({
      limit: 50,
      search: query || undefined,
    });
    if (error) {
      setUsers([]);
      setLoadError(error.message || "Failed to load users.");
    } else {
      setUsers(data?.users ?? []);
    }
    setIsLoadingUsers(false);
  };

  useEffect(() => {
    if (!open || !!viewAsUser) return;
    const trimmedSearch = search.trim();
    if (!trimmedSearch) {
      setUsers([]);
      setLoadError(null);
      setIsLoadingUsers(false);
      return;
    }
    const timer = setTimeout(() => {
      void fetchUsers(trimmedSearch);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [open, search, viewAsUser]);

  const getUserDisplayName = (user: UserWithRolesAndSchools) => {
    const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
    return name || user.email;
  };

  const getPlatformRoleName = (roleKey: string) => {
    if (!roleKey) return "Unknown Role";
    if (PLATFORM_ROLE_DISPLAY_NAMES[roleKey]) {
      return PLATFORM_ROLE_DISPLAY_NAMES[roleKey];
    }
    return roleKey
      .toLowerCase()
      .split("_")
      .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
      .join(" ");
  };

  const getRoleRenderData = (user: UserWithRolesAndSchools) => {
    const platformRoles = user.platformRoles.map((roleKey) => ({
      roleKey,
      roleName: getPlatformRoleName(roleKey),
      isPlatform: true,
    }));

    const rolesBySchool = new Map<
      string,
      {
        schoolName?: string;
        roles: Array<{ roleKey: string; roleName: string; isPlatform: false }>;
      }
    >();

    user.schoolRoles.forEach((schoolRole) => {
      if (!schoolRole.roleKey) return;
      const schoolId = schoolRole.schoolId || "unknown";
      if (!rolesBySchool.has(schoolId)) {
        rolesBySchool.set(schoolId, {
          schoolName: schoolRole.schoolName || undefined,
          roles: [],
        });
      }
      rolesBySchool.get(schoolId)!.roles.push({
        roleKey: schoolRole.roleKey,
        roleName: schoolRole.roleName || schoolRole.roleKey,
        isPlatform: false,
      });
    });

    const schoolRoleGroups = Array.from(rolesBySchool.entries()).map(
      ([schoolId, value]) => ({
        schoolId,
        schoolName: value.schoolName,
        roles: value.roles,
      })
    );

    return { platformRoles, schoolRoleGroups };
  };

  const getUserSearchText = (user: UserWithRolesAndSchools) => {
    const roleTerms = [
      ...user.platformRoles,
      ...user.schoolRoles.flatMap((sr) => [sr.roleKey || "", sr.roleName || "", sr.schoolName || ""]),
    ]
      .filter(Boolean)
      .join(" ");
    return `${getUserDisplayName(user)} ${user.email} ${roleTerms}`;
  };

  const handleUserSelect = async (user: UserWithRolesAndSchools) => {
    setIsStartingMode(true);
    setLoadError(null);
    const { data, error } = await meApi.get.userById(user.id, true);
    if (error || !data) {
      setLoadError(error?.message || "Failed to load user permissions.");
      setIsStartingMode(false);
      return;
    }

    startViewAsMode(data);
    setIsStartingMode(false);
    setOpen(false);
    router.replace("/dashboard");
  };

  const handleStopImpersonating = () => {
    stopViewAsMode();
    setSearch("");
    setLoadError(null);
    setOpen(false);
  };

  const handleImpersonatingButtonClick = () => {
    setOpen(true);
  };

  return (
    <>
      {viewAsUser ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={handleImpersonatingButtonClick}
              className={cn(
                "h-9 gap-2 justify-start text-orange-800 transition-all duration-300 animate-pulse-subtle border-orange-200",
                "hover:bg-orange-100"
              )}
            >
              <VenetianMask className="h-5 w-5 animate-float-gentle" />
              <span className="truncate max-w-[120px]">
                {selectedUserName}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Impersonating user</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setOpen(true)}
              className="h-9 gap-2 justify-center items-center"
            >
              <Drama className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Impersonate User</p>
          </TooltipContent>
        </Tooltip>
      )}
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        className="w-[95vw] sm:max-w-4xl"
      >
        {viewAsUser ? (
          // Impersonation Status View
          <>
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <VenetianMask className="h-4 w-4 text-orange-600" />
                <h2 className="text-lg font-semibold">
                  Currently Impersonating
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                You are viewing the platform as this user
              </p>
            </div>
            <div className="px-4 py-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 font-semibold text-sm">
                    {selectedUserInitials}
                  </span>
                </div>
                <div>
                  <h3 className="font-medium">{selectedUserName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {viewAsUser.email}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium">Role</span>
                  <Badge variant="secondary">{selectedRoleLabel}</Badge>
                </div>

                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium">Assigned Schools</span>
                  <span className="text-sm text-muted-foreground">
                    {selectedSchoolsLabel}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium">Session Duration</span>
                  <span className="text-sm text-muted-foreground">
                    {sessionDurationLabel}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium">Started At</span>
                  <span className="text-sm text-muted-foreground">
                    {startedAtLabel}
                  </span>
                </div>
              </div>

              <Button
                variant="destructive"
                onClick={handleStopImpersonating}
                className="w-full mt-4"
              >
                Stop Impersonating
              </Button>
            </div>
          </>
        ) : (
          // User Selection View
          <>
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Drama className="h-4 w-4" />
                <h2 className="text-lg font-semibold">Impersonate User</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Use this tool to see what the selected user sees when browsing
                the platform. View mode is read-only.
              </p>
            </div>
            <CommandInput
              placeholder="Search users to impersonate..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {isLoadingUsers || isStartingMode ? (
                <div className="px-4 py-8 text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading users...
                </div>
              ) : loadError ? (
                <div className="px-4 py-6 text-sm text-destructive">{loadError}</div>
              ) : (
                <CommandEmpty>
                  {search.trim()
                    ? "No users found."
                    : "Type at least one character to search users."}
                </CommandEmpty>
              )}
              <CommandGroup heading="Users">
                {users.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={getUserSearchText(user)}
                    onSelect={() => void handleUserSelect(user)}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="font-medium">{getUserDisplayName(user)}</span>
                        <span className="text-sm text-muted-foreground">
                          {user.email}
                        </span>
                      </div>
                      <div className="flex max-w-[60%] flex-wrap justify-end gap-1">
                        {(() => {
                          const { platformRoles, schoolRoleGroups } = getRoleRenderData(user);
                          return (
                            <>
                              {platformRoles.length > 0 && (
                                <RoleBadges
                                  roles={platformRoles}
                                  variant="joined"
                                  size="sm"
                                />
                              )}
                              {schoolRoleGroups.map((group) => (
                                <div
                                  key={`school-role-group-${user.id}-${group.schoolId}`}
                                  className="flex items-center gap-0"
                                >
                                  <RoleBadges
                                    roles={group.roles}
                                    variant="joined"
                                    size="sm"
                                    lastConnectsToRight={!!group.schoolName}
                                  />
                                  {group.schoolName && (
                                    <Badge
                                      variant="outline"
                                      className="border-l-0 rounded-r-md rounded-l-none bg-transparent pl-5 -ml-2 z-0 pr-2 py-1 text-muted-foreground"
                                    >
                                      {group.schoolName}
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </>
        )}
      </CommandDialog>
    </>
  );
}
