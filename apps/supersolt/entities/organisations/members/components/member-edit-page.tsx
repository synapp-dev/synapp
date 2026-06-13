"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useScopedSettingsAccess } from "@/entities/access/model/use-scoped-settings-access";
import {
  membersApi,
  membersErrorMessage,
} from "@/entities/organisations/members/api/endpoints";
import { membersKeys } from "@/entities/organisations/members/model/keys";
import { useMemberDetailQuery } from "@/entities/organisations/members/hooks/use-member-detail";
import { buildScopedPath } from "@/lib/build-scoped-path";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Checkbox } from "@workspace/ui/components/checkbox";

const ROLE_OPTIONS = [
  { slug: "admin", label: "Area Manager" },
  { slug: "manager", label: "Venue Manager" },
  { slug: "crew", label: "Staff" },
];

type Props = {
  memberId: string;
};

export function MemberEditPage({ memberId }: Props) {
  const router = useRouter();
  const access = useScopedSettingsAccess();
  const orgSlug = access.organisationSlug;
  const venueSlug = access.venueSlug;

  const { data, isLoading, error } = useMemberDetailQuery(orgSlug, memberId);
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [roleSlug, setRoleSlug] = useState("crew");
  const [venueIds, setVenueIds] = useState<string[]>([]);

  useEffect(() => {
    if (!data) return;
    setFirstName(data.firstName ?? "");
    setLastName(data.lastName ?? "");
    setRoleSlug(data.roleSlug === "owner" ? "admin" : data.roleSlug);
    setVenueIds(data.venueIds);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      membersApi.update(orgSlug, memberId, {
        firstName,
        lastName,
        roleSlug: data?.roleSlug === "owner" ? undefined : roleSlug,
        venueIds,
      }),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(membersErrorMessage(result.error));
        return;
      }
      toast.success("Saved");
      void queryClient.invalidateQueries({ queryKey: membersKeys.list(orgSlug) });
      void queryClient.invalidateQueries({
        queryKey: membersKeys.detail(orgSlug, memberId),
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => membersApi.archive(orgSlug, memberId),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(membersErrorMessage(result.error));
        return;
      }
      toast.success("User archived");
      router.push(buildScopedPath(orgSlug, venueSlug, "settings/permissions"));
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: () =>
      membersApi.reactivate(orgSlug, memberId, { venueIds, roleSlug }),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(membersErrorMessage(result.error));
        return;
      }
      toast.success("User reactivated");
      void queryClient.invalidateQueries({ queryKey: membersKeys.list(orgSlug) });
    },
  });

  if (access.isLoading || isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (!access.canSeePermissions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="text-destructive p-6 text-sm">
          {error?.message ?? "Member not found"}
        </CardContent>
      </Card>
    );
  }

  const isOwner = data.roleSlug === "owner";
  const isArchived = data.status === "archived";

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link href={buildScopedPath(orgSlug, venueSlug, "settings/permissions")}>
          <ArrowLeft className="mr-2 size-4" />
          Back to permissions
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{data.name}</CardTitle>
          <CardDescription>
            Email is read-only. Change email by archiving and re-inviting.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input value={data.email} disabled readOnly />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="first-name">First name</Label>
              <Input
                id="first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="last-name">Last name</Label>
              <Input
                id="last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Permission level</Label>
            <Select
              value={isOwner ? "owner" : roleSlug}
              onValueChange={setRoleSlug}
              disabled={isOwner}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {isOwner ? (
                  <SelectItem value="owner">Owner</SelectItem>
                ) : (
                  ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.slug} value={r.slug}>
                      {r.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Venue access</Label>
            <div className="flex flex-col gap-2">
              {data.venues.map((v) => (
                <label key={v.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={venueIds.includes(v.id)}
                    onCheckedChange={(c) =>
                      setVenueIds((prev) =>
                        c === true
                          ? [...prev, v.id]
                          : prev.filter((id) => id !== v.id),
                      )
                    }
                  />
                  {v.name}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {!isArchived ? (
              <>
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || venueIds.length === 0}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Save changes
                </Button>
                {!isOwner ? (
                  <Button
                    variant="destructive"
                    onClick={() => archiveMutation.mutate()}
                    disabled={archiveMutation.isPending}
                  >
                    Archive user
                  </Button>
                ) : null}
              </>
            ) : (
              <Button
                onClick={() => reactivateMutation.mutate()}
                disabled={reactivateMutation.isPending || venueIds.length === 0}
              >
                Reactivate user
              </Button>
            )}
            <Button variant="secondary" asChild>
              <Link
                href={buildScopedPath(orgSlug, venueSlug, "workforce/people")}
              >
                View in People
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
