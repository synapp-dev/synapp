"use client";

import * as React from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { Plus, Filter } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@workspace/ui/components/card";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@workspace/ui/components/select";
import { InviteNewSchoolDialog } from "@/components/molecules/invite-new-school-dialog";

export default function CRMPage() {
  const [openInvite, setOpenInvite] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [sector, setSector] = React.useState<string | undefined>(undefined);

  const [schools, setSchools] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const authFetch = useAuthFetch();

  React.useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await authFetch("/api/schools");

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `Request failed: ${res.status}`);
        }
        const body = await res.json();
        if (isMounted)
          setSchools(Array.isArray(body?.schools) ? body.schools : []);
      } catch (e: any) {
        if (isMounted) setError(e?.message || "Failed to load schools");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [authFetch]);

  const filteredRows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return schools.filter((r: any) => {
      const name: string = (r?.name || "").toString();
      const rSector: string | undefined = r?.sector || r?.type || r?.category;
      const matchesQuery = !q || name.toLowerCase().includes(q);
      const matchesSector = !sector || rSector === sector;
      return matchesQuery && matchesSector;
    });
  }, [schools, query, sector]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">CRM</h1>
        <Button onClick={() => setOpenInvite(true)}>
          <Plus className="mr-2 size-4" />
          Invite new school
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Schools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 w-full sm:max-w-sm">
              <Input
                placeholder="Search schools..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All sectors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 pr-4 font-medium">Name</th>
                  <th className="text-left py-2 pr-4 font-medium">Sector</th>
                  <th className="text-left py-2 pr-4 font-medium">Students</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-6 text-center text-muted-foreground"
                    >
                      Loading schools...
                    </td>
                  </tr>
                )}
                {!loading && error && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-red-600">
                      {error}
                    </td>
                  </tr>
                )}
                {!loading &&
                  !error &&
                  filteredRows.map((row: any, idx: number) => {
                    const name =
                      row?.name ?? row?.school_name ?? row?.title ?? "-";
                    const rSector =
                      row?.sector ?? row?.type ?? row?.category ?? "-";
                    const students =
                      row?.students ??
                      row?.student_count ??
                      row?.enrolment ??
                      "-";
                    return (
                      <tr
                        key={row?.id ?? idx}
                        className="border-b last:border-0"
                      >
                        <td className="py-2 pr-4">{name}</td>
                        <td className="py-2 pr-4 capitalize">{rSector}</td>
                        <td className="py-2 pr-4">{students}</td>
                      </tr>
                    );
                  })}
                {!loading && !error && filteredRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-6 text-center text-muted-foreground"
                    >
                      No schools match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <InviteNewSchoolDialog open={openInvite} onOpenChange={setOpenInvite} />
    </div>
  );
}
