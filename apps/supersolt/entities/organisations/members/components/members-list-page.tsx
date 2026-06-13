"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, MoreHorizontal, Plus, Upload, Users } from "lucide-react";
import { toast } from "sonner";
import { useScopedSettingsAccess } from "@/entities/access/model/use-scoped-settings-access";
import { useSettingsSectionRedirect } from "@/entities/settings/lib/use-settings-section-redirect";
import {
  membersApi,
  membersErrorMessage,
  type MemberListItem,
} from "@/entities/organisations/members/api/endpoints";
import { membersKeys } from "@/entities/organisations/members/model/keys";
import { useMembersListQuery } from "@/entities/organisations/members/hooks/use-members-list";
import { InviteMemberDialog } from "@/entities/organisations/members/components/invite-member-dialog";
import { BulkInviteDialog } from "@/entities/organisations/members/components/bulk-invite-dialog";
import { buildScopedPath } from "@/lib/build-scoped-path";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
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

const ROLE_OPTIONS = [
  { slug: "admin", label: "Area Manager" },
  { slug: "manager", label: "Venue Manager" },
  { slug: "crew", label: "Staff" },
];

function statusBadge(status: MemberListItem["status"]) {
  if (status === "pending") {
    return <Badge variant="secondary">Pending invite</Badge>;
  }
  if (status === "archived") {
    return <Badge variant="outline">Archived</Badge>;
  }
  return <Badge variant="default">Active</Badge>;
}

export function MembersListPage() {
  const access = useScopedSettingsAccess();
  const allowed = access.canSeePermissions;
  const { showForbidden, isRedirecting } = useSettingsSectionRedirect(access, allowed);

  const orgSlug = access.organisationSlug;
  const venueSlug = access.venueSlug;

  const queryClient = useQueryClient();
  const { data, isLoading, error } = useMembersListQuery(orgSlug);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const venueNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of data?.venues ?? []) {
      map.set(v.id, v.name);
    }
    return map;
  }, [data?.venues]);

  const filtered = useMemo(() => {
    const rows = data?.members ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.roleDisplayName.toLowerCase().includes(q)
      );
    });
  }, [data?.members, search, statusFilter]);

  const resendMutation = useMutation({
    mutationFn: (inviteId: string) => membersApi.resendInvite(orgSlug, inviteId),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(membersErrorMessage(result.error));
        return;
      }
      toast.success("Invite resent");
      void queryClient.invalidateQueries({ queryKey: membersKeys.list(orgSlug) });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) => membersApi.revokeInvite(orgSlug, inviteId),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(membersErrorMessage(result.error));
        return;
      }
      toast.success("Invite revoked");
      void queryClient.invalidateQueries({ queryKey: membersKeys.list(orgSlug) });
    },
  });

  const xeroImportMutation = useMutation({
    mutationFn: () => membersApi.importXero(orgSlug),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(membersErrorMessage(result.error));
        return;
      }
      if (!result.data?.employees.length) {
        toast.message("No employees returned from Xero");
        return;
      }
      setBulkOpen(true);
      toast.success(`Loaded ${result.data.employees.length} employees from Xero`);
    },
  });

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
          You do not have permission to manage permissions for this organisation.
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg">Permissions</CardTitle>
          <CardDescription className="mt-1">
            Manage who can access the platform, their permission level, and venue
            assignments. Position and pay details live in Workforce → People.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => xeroImportMutation.mutate()}
            disabled={xeroImportMutation.isPending}
          >
            {xeroImportMutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Upload className="mr-2 size-4" />
            )}
            Import from Xero
          </Button>
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
            Bulk invite
          </Button>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <Plus className="mr-2 size-4" />
            Invite user
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending invite</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 p-8 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading users…
            </div>
          ) : error ? (
            <p className="text-destructive p-8 text-sm">{error.message}</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
              <Users className="text-muted-foreground size-10" />
              <p className="text-muted-foreground text-sm">
                No users yet. Invite your team to get started.
              </p>
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                Invite user
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Permission</TableHead>
                  <TableHead>Venues</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[48px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => {
                  const venueLabels = row.venueIds
                    .map((id) => venueNameById.get(id))
                    .filter(Boolean)
                    .join(", ");
                  const editHref =
                    row.kind === "member"
                      ? buildScopedPath(
                          orgSlug,
                          venueSlug,
                          `settings/permissions/${row.id}`,
                        )
                      : null;

                  return (
                    <TableRow key={`${row.kind}-${row.id}`}>
                      <TableCell className="font-medium">
                        {editHref ? (
                          <Link href={editHref} className="hover:underline">
                            {row.name}
                          </Link>
                        ) : (
                          row.name
                        )}
                      </TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.roleDisplayName}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate text-sm">
                        {venueLabels || "—"}
                      </TableCell>
                      <TableCell>{statusBadge(row.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {editHref ? (
                              <DropdownMenuItem asChild>
                                <Link href={editHref}>Edit user</Link>
                              </DropdownMenuItem>
                            ) : null}
                            {row.kind === "invite" && row.status === "pending" ? (
                              <>
                                <DropdownMenuItem
                                  onClick={() => resendMutation.mutate(row.id)}
                                >
                                  Resend invite
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => revokeMutation.mutate(row.id)}
                                >
                                  Revoke invite
                                </DropdownMenuItem>
                              </>
                            ) : null}
                            {row.kind === "member" ? (
                              <DropdownMenuItem asChild>
                                <Link
                                  href={buildScopedPath(
                                    orgSlug,
                                    venueSlug,
                                    "workforce/people",
                                  )}
                                >
                                  View in People
                                </Link>
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        organisationSlug={orgSlug}
        venues={data?.venues ?? []}
        roleOptions={ROLE_OPTIONS}
      />
      <BulkInviteDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        organisationSlug={orgSlug}
        venues={data?.venues ?? []}
        roleOptions={ROLE_OPTIONS}
      />
    </div>
  );
}
