"use client";

import * as React from "react";
import { Loader2, Search } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";

import type {
  AdminUserRow,
  AdminUsersPage,
  RoleCatalogRow,
} from "@/entities/admin/lib/users-admin-server";
import { ADMIN_BUNDLES, bundleIsActive } from "@/entities/admin/lib/admin-bundles";

import { UserRolesSheet } from "./user-roles-sheet";

function initialsOf(row: AdminUserRow): string {
  const base = row.displayName || row.username || row.email || "?";
  return base.slice(0, 2).toUpperCase();
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function UsersAdminClient({
  initialData,
  roleCatalog,
  actorProfileId,
}: {
  initialData: AdminUsersPage;
  roleCatalog: RoleCatalogRow[];
  actorProfileId: string | null;
}) {
  const [data, setData] = React.useState<AdminUsersPage>(initialData);
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const reqId = React.useRef(0);

  const fetchUsers = React.useCallback(async (query: string, page: number) => {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      params.set("page", String(page));
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) return;
      const json = (await res.json()) as AdminUsersPage;
      // Ignore stale responses that resolve out of order.
      if (id === reqId.current) setData(json);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  // Debounced search (skips the very first render — server gave us page 1).
  const firstRender = React.useRef(true);
  React.useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => void fetchUsers(q, 1), 300);
    return () => clearTimeout(t);
  }, [q, fetchUsers]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  const handleSlugsChange = React.useCallback(
    (profileId: string, slugs: string[]) => {
      setData((prev) => ({
        ...prev,
        rows: prev.rows.map((r) =>
          r.profileId === profileId ? { ...r, slugs } : r,
        ),
      }));
    },
    [],
  );

  const selected = data.rows.find((r) => r.profileId === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, username, or email…"
          className="pl-8"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Admin access</TableHead>
              <TableHead className="text-right">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-muted-foreground h-24 text-center"
                >
                  {loading ? "Loading…" : "No users found."}
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((row) => {
                const activeBundles = ADMIN_BUNDLES.filter((b) =>
                  bundleIsActive(row.slugs, b),
                );
                return (
                  <TableRow
                    key={row.profileId}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(row.profileId)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={row.avatarUrl ?? undefined} />
                          <AvatarFallback>{initialsOf(row)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {row.displayName || row.username || "Unnamed"}
                          </div>
                          {row.username ? (
                            <div className="text-muted-foreground truncate text-xs">
                              @{row.username}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      {activeBundles.length === 0 ? (
                        <span className="text-muted-foreground text-sm">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {activeBundles.map((b) => (
                            <Badge
                              key={b.key}
                              variant={
                                b.key === "full" ? "default" : "secondary"
                              }
                            >
                              {b.label}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right">
                      {formatDate(row.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {data.total} user{data.total === 1 ? "" : "s"}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={data.page <= 1 || loading}
            onClick={() => void fetchUsers(q, data.page - 1)}
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {data.page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={data.page >= totalPages || loading}
            onClick={() => void fetchUsers(q, data.page + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <UserRolesSheet
        user={selected}
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        roleCatalog={roleCatalog}
        actorProfileId={actorProfileId}
        onSlugsChange={handleSlugsChange}
      />
    </div>
  );
}
