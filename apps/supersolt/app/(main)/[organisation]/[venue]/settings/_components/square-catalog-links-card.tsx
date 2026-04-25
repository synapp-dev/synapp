"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
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

type CatalogLinkRow = {
  id: string;
  menu_item_id: string;
  square_catalog_object_id: string;
  menu_item_name: string | null;
};

type MenuItemOption = { id: string; name: string };

type SquareCatalogLinksCardProps = {
  organisation: string;
  venue: string;
  canManage: boolean;
};

export function SquareCatalogLinksCard({
  organisation,
  venue,
  canManage,
}: SquareCatalogLinksCardProps) {
  const [links, setLinks] = useState<CatalogLinkRow[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogId, setCatalogId] = useState("");
  const [menuItemId, setMenuItemId] = useState("");
  const [saving, setSaving] = useState(false);

  const basePath = useMemo(
    () =>
      `/api/organisations/${encodeURIComponent(organisation)}/venues/${encodeURIComponent(venue)}`,
    [organisation, venue]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [linksRes, menuRes] = await Promise.all([
        fetch(`${basePath}/square/menu-catalog-links`, { credentials: "include" }),
        fetch(`${basePath}/menu-items?page=1&pageSize=500`, { credentials: "include" }),
      ]);

      const linksJson = (await linksRes.json()) as {
        data: CatalogLinkRow[] | null;
        error: { message: string } | null;
      };
      const menuJson = (await menuRes.json()) as {
        data: { menuItems: MenuItemOption[] } | null;
        error: { message: string } | null;
      };

      if (!linksRes.ok || linksJson.error) {
        throw new Error(linksJson.error?.message ?? "Could not load Square catalog links");
      }
      if (menuRes.ok && menuJson.data?.menuItems) {
        setMenuItems(menuJson.data.menuItems);
      }

      setLinks(linksJson.data ?? []);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleAdd() {
    if (!canManage) return;
    const mid = menuItemId.trim();
    const sid = catalogId.trim();
    if (!mid || !sid) {
      toast.error("Choose a menu line and enter a Square catalog object id");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${basePath}/square/menu-catalog-links`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuItemId: mid, squareCatalogObjectId: sid }),
      });
      const json = (await res.json()) as {
        error: { message: string } | null;
      };
      if (!res.ok || json.error) {
        throw new Error(json.error?.message ?? `Save failed (${res.status})`);
      }
      toast.success("Link saved");
      setCatalogId("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!canManage) return;
    setSaving(true);
    try {
      const res = await fetch(
        `${basePath}/square/menu-catalog-links?id=${encodeURIComponent(id)}`,
        { method: "DELETE", credentials: "include" }
      );
      const json = (await res.json()) as { error: { message: string } | null };
      if (!res.ok || json.error) {
        throw new Error(json.error?.message ?? `Delete failed (${res.status})`);
      }
      toast.success("Link removed");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="text-lg">Square → menu mapping</CardTitle>
        <CardDescription>
          Map Square catalog object ids (from order line items) to lines on your Supersolt menu so
          Sales mix can attribute revenue and quantities. Copy the id from Square Dashboard → Items
          → item or variation, or from API logs. Re-authorize Square if you recently added the{" "}
          <code className="text-xs">ORDERS_READ</code> scope.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canManage ? (
          <p className="text-muted-foreground text-sm">
            Only organisation admins can add or remove links. You can still view existing mappings.
          </p>
        ) : null}

        {canManage ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Menu
              </p>
              <Select value={menuItemId || undefined} onValueChange={setMenuItemId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select from menu" />
                </SelectTrigger>
                <SelectContent>
                  {menuItems.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Square catalog object id
              </p>
              <Input
                value={catalogId}
                onChange={(e) => setCatalogId(e.target.value)}
                placeholder="e.g. ABCDEF123..."
                className="font-mono text-sm"
              />
            </div>
            <Button type="button" onClick={() => void handleAdd()} disabled={saving}>
              Add link
            </Button>
          </div>
        ) : null}

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : links.length === 0 ? (
          <p className="text-muted-foreground text-sm">No catalog links yet for this venue.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Menu</TableHead>
                <TableHead>Square catalog id</TableHead>
                {canManage ? <TableHead className="w-[100px]" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.menu_item_name ?? row.menu_item_id}</TableCell>
                  <TableCell className="font-mono text-xs">{row.square_catalog_object_id}</TableCell>
                  {canManage ? (
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={saving}
                        onClick={() => void handleDelete(row.id)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
