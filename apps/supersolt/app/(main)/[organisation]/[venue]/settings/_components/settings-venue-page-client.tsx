"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useScopedSettingsAccess } from "@/entities/access/model/use-scoped-settings-access";
import { useAccessibleVenueGroupsQuery } from "@/entities/venues/model/useAccessibleVenueGroupsQuery";
import { useSettingsSectionRedirect } from "@/app/(main)/[organisation]/[venue]/settings/_components/use-settings-section-redirect";
import { buildScopedPath } from "@/lib/build-scoped-path";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

type StaffMemberRow = {
  userOrganisationId: string;
  userProfileId: string;
  name: string;
  email: string;
  orgRoleSlug: string;
  orgRoleDisplayName: string;
  hasVenueAccess: boolean;
  venueRoleSlug: string | null;
};

const VENUE_ROLE_ASSIGN_OPTIONS = [
  { value: "inherit", label: "Same as organisation role" },
  { value: "admin", label: "Admin (venue)" },
  { value: "manager", label: "Manager (venue)" },
  { value: "supervisor", label: "Supervisor (venue)" },
  { value: "crew", label: "Crew (venue)" },
] as const;

export function SettingsVenuePageClient() {
  const access = useScopedSettingsAccess();
  const allowed = access.canSeeVenue;
  const { showForbidden, isRedirecting } = useSettingsSectionRedirect(access, allowed);

  const { data: orgGroups = [], isLoading: venuesLoading } = useAccessibleVenueGroupsQuery({
    enabled: allowed && Boolean(access.organisationSlug),
  });

  const currentOrg = useMemo(
    () => orgGroups.find((o) => o.slug === access.organisationSlug),
    [orgGroups, access.organisationSlug]
  );

  const venueOptions = currentOrg?.venues ?? [];
  const canAssignVenueStaff = Boolean(currentOrg?.grantsOrgAdmin);

  const [selectedVenueSlug, setSelectedVenueSlug] = useState("");
  useEffect(() => {
    if (access.venueSlug) {
      setSelectedVenueSlug((prev) => prev || access.venueSlug);
    }
  }, [access.venueSlug]);

  const [members, setMembers] = useState<StaffMemberRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [selectedUoIds, setSelectedUoIds] = useState<Set<string>>(() => new Set());
  const [venueRoleSlug, setVenueRoleSlug] = useState("inherit");
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const loadStaffRows = useCallback(async () => {
    if (!access.organisationSlug || !selectedVenueSlug) {
      return;
    }
    setMembersLoading(true);
    setMembersError(null);
    try {
      const path = `/api/organisations/${encodeURIComponent(access.organisationSlug)}/venues/${encodeURIComponent(selectedVenueSlug)}/staff-assignment`;
      const res = await fetch(path);
      const json = (await res.json()) as {
        data: { members: StaffMemberRow[] } | null;
        error: { message: string } | null;
      };
      if (!res.ok || json.error || !json.data) {
        setMembersError(json.error?.message ?? "Could not load members");
        setMembers([]);
        return;
      }
      setMembers(json.data.members);
    } catch {
      setMembersError("Could not load members");
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, [access.organisationSlug, selectedVenueSlug]);

  useEffect(() => {
    if (!canAssignVenueStaff || !selectedVenueSlug) {
      return;
    }
    setSelectedUoIds(new Set());
    void loadStaffRows();
  }, [canAssignVenueStaff, selectedVenueSlug, loadStaffRows]);

  const assignableRows = useMemo(
    () => members.filter((m) => !m.hasVenueAccess),
    [members]
  );

  const allAssignableSelected =
    assignableRows.length > 0 && assignableRows.every((m) => selectedUoIds.has(m.userOrganisationId));

  const toggleSelectAllAssignable = useCallback(() => {
    if (allAssignableSelected) {
      setSelectedUoIds(new Set());
      return;
    }
    setSelectedUoIds(new Set(assignableRows.map((m) => m.userOrganisationId)));
  }, [allAssignableSelected, assignableRows]);

  const toggleRow = useCallback((userOrganisationId: string) => {
    setSelectedUoIds((prev) => {
      const next = new Set(prev);
      if (next.has(userOrganisationId)) {
        next.delete(userOrganisationId);
      } else {
        next.add(userOrganisationId);
      }
      return next;
    });
  }, []);

  const assignSelected = useCallback(async () => {
    if (!access.organisationSlug || !selectedVenueSlug) return;
    const ids = [...selectedUoIds];
    if (ids.length === 0) {
      toast.error("Select at least one member");
      return;
    }
    setAssignSubmitting(true);
    try {
      const path = `/api/organisations/${encodeURIComponent(access.organisationSlug)}/venues/${encodeURIComponent(selectedVenueSlug)}/staff-assignment`;
      const body: { userOrganisationIds: string[]; venueRoleSlug?: string | null } = {
        userOrganisationIds: ids,
      };
      if (venueRoleSlug && venueRoleSlug !== "inherit") {
        body.venueRoleSlug = venueRoleSlug;
      }
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        data: { linked: number; skipped: number } | null;
        error: { message: string } | null;
      };
      if (!res.ok || json.error || !json.data) {
        toast.error(json.error?.message ?? "Could not assign access");
        return;
      }
      const { linked, skipped } = json.data;
      if (linked > 0 && skipped > 0) {
        toast.success(`Granted access to ${linked}. ${skipped} already had access.`);
      } else if (linked > 0) {
        toast.success(`Granted venue access to ${linked} member${linked === 1 ? "" : "s"}.`);
      } else {
        toast.info("Everyone selected already had access to this venue.");
      }
      setSelectedUoIds(new Set());
      await loadStaffRows();
    } catch {
      toast.error("Could not assign access");
    } finally {
      setAssignSubmitting(false);
    }
  }, [
    access.organisationSlug,
    selectedVenueSlug,
    selectedUoIds,
    venueRoleSlug,
    loadStaffRows,
  ]);

  if (access.isLoading) {
    return (
      <div className="text-muted-foreground text-sm" aria-busy="true">
        Loading…
      </div>
    );
  }

  if (showForbidden) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          You do not have permission to change settings for this venue.
        </CardContent>
      </Card>
    );
  }

  if (isRedirecting) {
    return (
      <div className="text-muted-foreground text-sm" aria-busy="true">
        Redirecting…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Venue</CardTitle>
          <CardDescription>
            This venue&apos;s name, timezone, and operational preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Venue settings will be configurable here in a future release.
          </p>
        </CardContent>
      </Card>

      {canAssignVenueStaff ? (
        <Card>
          <CardHeader>
            <CardTitle>Venue access</CardTitle>
            <CardDescription>
              Pick a venue in this organisation, select people who already belong to the
              organisation, then grant them access to that venue. Roster and stations stay in
              Workforce.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[200px] flex-1 space-y-2">
                <Label htmlFor="venue-access-venue">Venue</Label>
                <Select
                  value={selectedVenueSlug || undefined}
                  onValueChange={(v) => setSelectedVenueSlug(v)}
                  disabled={venuesLoading || venueOptions.length === 0}
                >
                  <SelectTrigger id="venue-access-venue" className="h-10 w-full max-w-md">
                    <SelectValue placeholder="Select venue" />
                  </SelectTrigger>
                  <SelectContent>
                    {venueOptions.map((v) => (
                      <SelectItem key={v.id} value={v.slug}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[220px] flex-1 space-y-2">
                <Label htmlFor="venue-access-role">Venue role override</Label>
                <Select
                  value={venueRoleSlug}
                  onValueChange={setVenueRoleSlug}
                  disabled={assignSubmitting}
                >
                  <SelectTrigger id="venue-access-role" className="h-10 w-full max-w-md">
                    <SelectValue placeholder="Role at this venue" />
                  </SelectTrigger>
                  <SelectContent>
                    {VENUE_ROLE_ASSIGN_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                disabled={assignSubmitting || selectedUoIds.size === 0}
                onClick={() => void assignSelected()}
              >
                {assignSubmitting ? "Saving…" : "Grant venue access"}
              </Button>
              <Button asChild variant="secondary" size="sm" className="w-fit">
                <Link
                  href={buildScopedPath(
                    access.organisationSlug,
                    access.venueSlug,
                    "workforce/people"
                  )}
                >
                  Open People
                </Link>
              </Button>
              {membersLoading ? (
                <span className="text-sm text-muted-foreground">Loading…</span>
              ) : null}
              {membersError ? (
                <span className="text-sm text-destructive">{membersError}</span>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12 text-center">
                      <Checkbox
                        aria-label="Select all without venue access"
                        checked={allAssignableSelected}
                        onCheckedChange={() => toggleSelectAllAssignable()}
                        disabled={assignableRows.length === 0 || membersLoading}
                      />
                    </TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider">
                      Member
                    </TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider">
                      Email
                    </TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider">
                      Org role
                    </TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider">
                      This venue
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.length === 0 && !membersLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No organisation members to show.
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((m) => {
                      const canSelect = !m.hasVenueAccess;
                      const checked = selectedUoIds.has(m.userOrganisationId);
                      return (
                        <TableRow key={m.userOrganisationId}>
                          <TableCell className="text-center">
                            <Checkbox
                              aria-label={`Select ${m.name}`}
                              checked={canSelect ? checked : false}
                              disabled={!canSelect || membersLoading}
                              onCheckedChange={() => {
                                if (canSelect) toggleRow(m.userOrganisationId);
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{m.name}</TableCell>
                          <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">
                            {m.email}
                          </TableCell>
                          <TableCell className="text-sm">{m.orgRoleDisplayName}</TableCell>
                          <TableCell>
                            {m.hasVenueAccess ? (
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                                <Badge variant="secondary" className="w-fit">
                                  Has access
                                </Badge>
                                {m.venueRoleSlug ? (
                                  <span className="text-xs text-muted-foreground">
                                    Venue role: {m.venueRoleSlug}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    Uses organisation role
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Not assigned</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : allowed ? (
        <Card>
          <CardHeader>
            <CardTitle>Venue access</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Only organisation admins (owners and admins) can assign which members can access each
            venue. Ask an org admin if you need someone added here.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
