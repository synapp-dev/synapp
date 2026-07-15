import type { RoleRow } from "@/types/db";
import { Card } from "@workspace/ui/components/card";
import { Calendar } from "@workspace/ui/components/calendar";
import { useState, useEffect, useMemo } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Separator } from "@workspace/ui/components/separator";
import { LiveActivityFeed } from "./components/live-activity-feed";
import { StaggeredAnimation } from "@workspace/ui/components/atoms/staggered-animation";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import { HeroCard } from "@/entities/dashboard/ui/shared/hero-card";
import type { RoleBadgeItem } from "@/components/atoms/role-badges";
import { useRoles } from "@/entities/users/model/store";

function normalizePlatformRoles(platformRoles: unknown): string[] {
  if (Array.isArray(platformRoles)) {
    return platformRoles.filter((r): r is string => typeof r === "string");
  }
  if (typeof platformRoles === "string") {
    const trimmed = platformRoles.replace(/^\{|\}$/g, "").trim();
    if (!trimmed) return [];
    return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function formatRoleKey(key: string): string {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function parseSchoolRolesJson(
  schoolRoles: unknown,
  resolveName: (roleKey: string, apiRoleName?: string | null) => string
): RoleBadgeItem[] {
  if (!Array.isArray(schoolRoles)) return [];
  const out: RoleBadgeItem[] = [];
  for (const row of schoolRoles) {
    if (!row || typeof row !== "object" || !("roleKey" in row)) continue;
    const roleKey = String((row as { roleKey?: string | null }).roleKey || "");
    if (!roleKey) continue;
    const apiRoleName = (row as { roleName?: string | null }).roleName;
    out.push({
      roleKey,
      roleName: resolveName(roleKey, apiRoleName),
      isPlatform: false,
    });
  }
  return out;
}

export function HeroSection() {
  const [date, setDate] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const currentUser = useEffectiveUser();
  const { roles } = useRoles();

  const roleNameByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of roles as RoleRow[]) {
      if (r.key) map.set(r.key, r.name);
    }
    return map;
  }, [roles]);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const { roleBadgeItems, userTitle } = useMemo(() => {
    const empty = { roleBadgeItems: [] as RoleBadgeItem[], userTitle: "Admin" };
    if (!currentUser) return empty;

    const resolveName = (roleKey: string, apiRoleName?: string | null) => {
      if (apiRoleName && apiRoleName.trim()) return apiRoleName.trim();
      return roleNameByKey.get(roleKey) ?? formatRoleKey(roleKey);
    };

    const platformKeys = normalizePlatformRoles(currentUser.platformRoles);
    const platformItems: RoleBadgeItem[] = platformKeys.map((roleKey) => ({
      roleKey,
      roleName: resolveName(roleKey, null),
      isPlatform: true,
    }));

    const schoolItems = parseSchoolRolesJson(
      currentUser.schoolRoles,
      resolveName
    );
    const items = [...platformItems, ...schoolItems];

    let title = "Admin";
    if (platformKeys.length > 0) {
      title = resolveName(platformKeys[0], null);
    } else {
      const schoolRoles = currentUser.schoolRoles;
      if (schoolRoles && Array.isArray(schoolRoles) && schoolRoles.length > 0) {
        const firstRole = schoolRoles[0] as {
          roleName?: string | null;
          roleKey?: string | null;
        };
        if (firstRole.roleKey) {
          title = resolveName(firstRole.roleKey, firstRole.roleName);
        }
      }
    }

    return { roleBadgeItems: items, userTitle: title };
  }, [currentUser, roleNameByKey]);

  return (
    <section className="grid grid-cols-1 md:grid-cols-5 gap-4 items-stretch">
      <div className="col-span-2 flex flex-col gap-4">
        <StaggeredAnimation index={0} fadeDirection="down">
          <HeroCard
            currentTime={currentTime}
            userTitle={userTitle}
            roleBadgeItems={
              roleBadgeItems.length > 0 ? roleBadgeItems : undefined
            }
            defaultName="Admin"
          />
        </StaggeredAnimation>

        <StaggeredAnimation
          index={1}
          fadeDirection="up"
          className="flex-1 min-h-0"
        >
          <Card className="h-full flex flex-col">
            <LiveActivityFeed />
          </Card>
        </StaggeredAnimation>
      </div>

      <StaggeredAnimation index={2} fadeDirection="up" className="col-span-3">
        <Card className="h-full col-span-3 border px-4 py-2 flex flex-row gap-4">
          <div className="w-fit h-full flex items-start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-lg h-full"
              showOutsideDays={false}
              required
              classNames={{
                nav: "hidden",
                // month_caption: "hidden",
                dropdowns: "hidden",
              }}
            />
          </div>
          <div className="h-full py-12">
            <Separator orientation="vertical" className="" />
          </div>
          <div className="w-full flex flex-col h-full pl-2">
            {/* Events List */}
            <div className="flex flex-col gap-6 flex-1 overflow-y-auto pr-0">
              <div className="flex items-center gap-2 pt-4">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />

                <h3 className="font-medium text-sm text-muted-foreground">
                  {date.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                  {date.toDateString() === currentTime.toDateString() && (
                    <span className="ml-2 text-xs">
                      •{" "}
                      {currentTime.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  )}
                </h3>
              </div>

              <div className="w-full border-dashed rounded-lg bg-muted flex items-center px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  No events currently scheduled
                </p>
              </div>
            </div>
          </div>
        </Card>
      </StaggeredAnimation>
    </section>
  );
}
