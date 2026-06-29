"use client";

import * as React from "react";
import { ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@workspace/ui/components/sheet";
import { Switch } from "@workspace/ui/components/switch";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";

import type {
  AdminUserRow,
  RoleCatalogRow,
} from "@/entities/admin/lib/users-admin-server";
import {
  ADMIN_BUNDLES,
  bundleIsActive,
  slugsToRemoveForBundleRevoke,
  type AdminBundle,
} from "@/entities/admin/lib/admin-bundles";
import {
  PROTECTED_SUPERUSER_EMAIL,
  ROLE_DEVELOPER,
  ROLE_NEWS_EDITOR,
  ROLE_SANDBOX_ACCESS,
  ROLE_UTILITY_EDITOR,
} from "@/entities/admin/lib/rbac-constants";

const ADMIN_CAP_SLUGS = new Set<string>([
  ROLE_DEVELOPER,
  ROLE_NEWS_EDITOR,
  ROLE_UTILITY_EDITOR,
  ROLE_SANDBOX_ACCESS,
]);

type Group = { title: string; roles: RoleCatalogRow[] };

function groupRoles(catalog: RoleCatalogRow[]): Group[] {
  const admin: RoleCatalogRow[] = [];
  const nav: RoleCatalogRow[] = [];
  const other: RoleCatalogRow[] = [];
  for (const r of catalog) {
    if (ADMIN_CAP_SLUGS.has(r.slug)) admin.push(r);
    else if (r.slug.startsWith("nav.")) nav.push(r);
    else other.push(r);
  }
  return [
    { title: "Admin capabilities", roles: admin },
    { title: "Navigation", roles: nav },
    { title: "Other", roles: other },
  ].filter((g) => g.roles.length > 0);
}

function initialsOf(row: AdminUserRow): string {
  const base = row.displayName || row.username || row.email || "?";
  return base.slice(0, 2).toUpperCase();
}

export function UserRolesSheet({
  user,
  open,
  onOpenChange,
  roleCatalog,
  actorProfileId,
  onSlugsChange,
}: {
  user: AdminUserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleCatalog: RoleCatalogRow[];
  actorProfileId: string | null;
  onSlugsChange: (profileId: string, slugs: string[]) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const groups = React.useMemo(() => groupRoles(roleCatalog), [roleCatalog]);

  const isSelf = user != null && user.profileId === actorProfileId;
  const isProtected = user?.email === PROTECTED_SUPERUSER_EMAIL;

  const mutate = React.useCallback(
    async (
      action: "grant" | "revoke",
      slugs: string[],
      successMsg: string,
    ) => {
      if (!user || slugs.length === 0) return;
      const prev = user.slugs;
      const next =
        action === "grant"
          ? Array.from(new Set([...prev, ...slugs]))
          : prev.filter((s) => !slugs.includes(s));

      setBusy(true);
      onSlugsChange(user.profileId, next); // optimistic
      try {
        const res = await fetch(`/api/admin/users/${user.profileId}/roles`, {
          method: action === "grant" ? "POST" : "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slugs }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          slugs?: string[];
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? "Request failed");
        onSlugsChange(user.profileId, json.slugs ?? next); // authoritative
        toast.success(successMsg);
      } catch (err) {
        onSlugsChange(user.profileId, prev); // rollback
        toast.error(err instanceof Error ? err.message : "Request failed");
      } finally {
        setBusy(false);
      }
    },
    [user, onSlugsChange],
  );

  function onBundleToggle(bundle: AdminBundle, nextOn: boolean) {
    if (!user) return;
    if (nextOn) {
      void mutate("grant", [...bundle.slugs], `${bundle.label} granted`);
    } else {
      const remove = slugsToRemoveForBundleRevoke(user.slugs, bundle);
      void mutate("revoke", remove, `${bundle.label} removed`);
    }
  }

  function onSlugToggle(slug: string, nextOn: boolean) {
    void mutate(
      nextOn ? "grant" : "revoke",
      [slug],
      nextOn ? `Granted ${slug}` : `Removed ${slug}`,
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        {user ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatarUrl ?? undefined} />
                  <AvatarFallback>{initialsOf(user)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <SheetTitle className="truncate">
                    {user.displayName || user.username || "Unnamed user"}
                  </SheetTitle>
                  <SheetDescription className="truncate">
                    {user.email ?? "No email"}
                    {isProtected ? " · platform owner" : ""}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pb-8">
              {/* Bundles */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Admin roles</h3>
                <div className="divide-y rounded-md border">
                  {ADMIN_BUNDLES.map((bundle) => {
                    const active = bundleIsActive(user.slugs, bundle);
                    const partial =
                      !active &&
                      bundle.slugs.some((s) => user.slugs.includes(s));
                    const lockedSuperuser =
                      bundle.superuser && (isSelf || isProtected);
                    return (
                      <div
                        key={bundle.key}
                        className="flex items-center justify-between gap-4 p-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{bundle.label}</span>
                            {partial ? (
                              <Badge variant="outline" className="text-xs">
                                partial
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-muted-foreground text-sm">
                            {bundle.description}
                          </p>
                          {lockedSuperuser ? (
                            <p className="text-muted-foreground mt-1 text-xs">
                              {isProtected
                                ? "The platform owner always keeps Full Admin."
                                : "You can't change your own Full Admin."}
                            </p>
                          ) : null}
                        </div>
                        <Switch
                          checked={active}
                          disabled={busy || lockedSuperuser}
                          onCheckedChange={(v) => onBundleToggle(bundle, v)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Advanced raw slugs */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground gap-2 px-0"
                  >
                    <ChevronsUpDown className="h-4 w-4" />
                    Advanced — all capability slugs
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-4">
                  {groups.map((group) => (
                    <div key={group.title} className="space-y-2">
                      <h4 className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                        {group.title}
                      </h4>
                      <div className="divide-y rounded-md border">
                        {group.roles.map((role) => {
                          const has = user.slugs.includes(role.slug);
                          const lockedDev =
                            role.slug === ROLE_DEVELOPER &&
                            (isSelf || isProtected);
                          return (
                            <div
                              key={role.slug}
                              className="flex items-center justify-between gap-4 p-2.5"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    {role.label}
                                  </span>
                                  <code className="text-muted-foreground text-xs">
                                    {role.slug}
                                  </code>
                                </div>
                                {role.description ? (
                                  <p className="text-muted-foreground text-xs">
                                    {role.description}
                                  </p>
                                ) : null}
                              </div>
                              <Switch
                                checked={has}
                                disabled={busy || lockedDev}
                                onCheckedChange={(v) =>
                                  onSlugToggle(role.slug, v)
                                }
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
