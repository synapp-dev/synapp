"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { useScopedSettingsAccess } from "@/entities/access/model/use-scoped-settings-access";
import { useSettingsSectionRedirect } from "@/entities/settings/lib/use-settings-section-redirect";
import { buildScopedPath } from "@/lib/build-scoped-path";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
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

type OrganisationMemberApi = {
  userOrganisationId: string;
  userProfileId: string;
  name: string;
  email: string;
  roleSlug: string;
  roleDisplayName: string;
};

const ASSIGNABLE_SLUGS = ["admin", "manager", "supervisor", "crew"] as const;

const ROLE_LABEL: Record<(typeof ASSIGNABLE_SLUGS)[number], string> = {
  admin: "Admin",
  manager: "Manager",
  supervisor: "Supervisor",
  crew: "Crew",
};

function isAssignableSlug(
  slug: string
): slug is (typeof ASSIGNABLE_SLUGS)[number] {
  return (ASSIGNABLE_SLUGS as readonly string[]).includes(slug);
}

type AddWizardStep = "email" | "existing" | "new";

export function SettingsOrganisationPageClient() {
  const access = useScopedSettingsAccess();
  const allowed = access.canSeeOrganisation;
  const { showForbidden, isRedirecting } = useSettingsSectionRedirect(access, allowed);

  const [members, setMembers] = useState<OrganisationMemberApi[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addWizardStep, setAddWizardStep] = useState<AddWizardStep>("email");
  const [addEmail, setAddEmail] = useState("");
  const [addFirstName, setAddFirstName] = useState("");
  const [addLastName, setAddLastName] = useState("");
  const [addRoleSlug, setAddRoleSlug] =
    useState<(typeof ASSIGNABLE_SLUGS)[number]>("crew");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addEmailChecking, setAddEmailChecking] = useState(false);

  const openAddMemberSheet = useCallback(() => {
    setAddWizardStep("email");
    setAddEmail("");
    setAddFirstName("");
    setAddLastName("");
    setAddRoleSlug("crew");
    setAddSheetOpen(true);
  }, []);

  const continueAddMemberFromEmail = useCallback(async () => {
    if (!access.organisationSlug) return;
    const email = addEmail.trim().toLowerCase();
    if (!email.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    setAddEmailChecking(true);
    try {
      const path = `/api/organisations/${encodeURIComponent(access.organisationSlug)}/members/check-email`;
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as {
        data: { exists: boolean } | null;
        error: { message: string } | null;
      };
      if (!res.ok || json.error || json.data == null) {
        toast.error(json.error?.message ?? "Could not check email");
        return;
      }
      setAddFirstName("");
      setAddLastName("");
      setAddRoleSlug("crew");
      setAddWizardStep(json.data.exists ? "existing" : "new");
    } catch {
      toast.error("Could not check email");
    } finally {
      setAddEmailChecking(false);
    }
  }, [access.organisationSlug, addEmail]);

  const ownerCount = useMemo(
    () => members.filter((m) => m.roleSlug === "owner").length,
    [members]
  );

  const loadMembers = useCallback(async () => {
    if (!access.organisationSlug) {
      return;
    }
    setMembersLoading(true);
    setMembersError(null);
    try {
      const path = `/api/organisations/${encodeURIComponent(access.organisationSlug)}/members`;
      const res = await fetch(path);
      const json = (await res.json()) as {
        data: { members: OrganisationMemberApi[] } | null;
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
  }, [access.organisationSlug]);

  useEffect(() => {
    if (!access.isLoading && allowed && access.organisationSlug) {
      void loadMembers();
    }
  }, [access.isLoading, allowed, access.organisationSlug, loadMembers]);

  const patchRole = useCallback(
    async (userOrganisationId: string, roleSlug: string) => {
      if (!access.organisationSlug) return;
      setUpdatingId(userOrganisationId);
      try {
        const path = `/api/organisations/${encodeURIComponent(access.organisationSlug)}/members`;
        const res = await fetch(path, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userOrganisationId, roleSlug }),
        });
        const json = (await res.json()) as {
          data: { ok: boolean } | null;
          error: { message: string } | null;
        };
        if (!res.ok || json.error) {
          toast.error(json.error?.message ?? "Could not update role");
          return;
        }
        toast.success("Organisation role updated");
        await loadMembers();
      } catch {
        toast.error("Could not update role");
      } finally {
        setUpdatingId(null);
      }
    },
    [access.organisationSlug, loadMembers]
  );

  const addMember = useCallback(async () => {
    if (!access.organisationSlug) return;
    if (addWizardStep === "email") return;
    const email = addEmail.trim().toLowerCase();
    if (!email.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    const firstName = addFirstName.trim();
    const lastName = addLastName.trim();
    if (addWizardStep === "new" && (!firstName || !lastName)) {
      toast.error("First name and last name are required");
      return;
    }
    setAddSubmitting(true);
    try {
      const path = `/api/organisations/${encodeURIComponent(access.organisationSlug)}/members`;
      const body: {
        email: string;
        roleSlug: string;
        firstName?: string;
        lastName?: string;
      } = { email, roleSlug: addRoleSlug };
      if (addWizardStep === "new") {
        body.firstName = firstName;
        body.lastName = lastName;
      }
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        data: { ok: boolean } | null;
        error: { message: string; status?: number } | null;
      };
      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? "Could not add member");
        return;
      }
      toast.success("Member added to organisation");
      setAddSheetOpen(false);
      setAddWizardStep("email");
      setAddEmail("");
      setAddFirstName("");
      setAddLastName("");
      setAddRoleSlug("crew");
      await loadMembers();
    } catch {
      toast.error("Could not add member");
    } finally {
      setAddSubmitting(false);
    }
  }, [
    access.organisationSlug,
    addWizardStep,
    addEmail,
    addFirstName,
    addLastName,
    addRoleSlug,
    loadMembers,
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
          Only organisation owners can change organisation-wide settings.
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
          <CardTitle className="inline-flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            Organisation
          </CardTitle>
          <CardDescription>
            Legal name, billing, and defaults across venues will live here later. As owner, you
            can manage who belongs to the organisation and their organisation-level role.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-muted-foreground" />
            Members
          </CardTitle>
          <CardDescription>
            Organisation role controls admin access and defaults; venue access and roster stations
            are still managed in Workforce.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
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
              <span className="text-sm text-muted-foreground">Loading members…</span>
            ) : null}
            {membersError ? (
              <span className="text-sm text-destructive">{membersError}</span>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-medium uppercase tracking-wider">
                    Member
                  </TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider">
                    Email
                  </TableHead>
                  <TableHead className="w-[220px] text-xs font-medium uppercase tracking-wider">
                    Organisation role
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  role="button"
                  tabIndex={0}
                  aria-label="Add organisation member"
                  className="h-14 cursor-pointer bg-[#bcdc88]/20 hover:bg-[#bcdc88]/50"
                  onClick={openAddMemberSheet}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openAddMemberSheet();
                    }
                  }}
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-dashed border-primary/50 bg-primary/5">
                        <Plus className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="font-medium">Add organisation member</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">—</TableCell>
                  <TableCell className="text-muted-foreground">—</TableCell>
                </TableRow>

                {membersLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Loading members…
                    </TableCell>
                  </TableRow>
                ) : members.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No active members found.
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => {
                    const soleOwner =
                      member.roleSlug === "owner" && ownerCount <= 1;
                    const isOwner = member.roleSlug === "owner";
                    const busy = updatingId === member.userOrganisationId;

                    return (
                      <TableRow key={member.userOrganisationId}>
                        <TableCell>
                          <div className="font-medium">{member.name}</div>
                        </TableCell>
                        <TableCell className="max-w-[280px] truncate text-sm text-muted-foreground">
                          {member.email}
                        </TableCell>
                        <TableCell>
                          {soleOwner ? (
                            <div className="flex flex-col gap-1">
                              <Badge variant="secondary" className="w-fit">
                                Owner
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Sole owner cannot be demoted here.
                              </span>
                            </div>
                          ) : isOwner ? (
                            <Select
                              disabled={busy}
                              onValueChange={(value) => {
                                if (isAssignableSlug(value)) {
                                  void patchRole(member.userOrganisationId, value);
                                }
                              }}
                            >
                              <SelectTrigger className="h-9 w-[200px]">
                                <SelectValue placeholder="Demote from owner…" />
                              </SelectTrigger>
                              <SelectContent>
                                {ASSIGNABLE_SLUGS.map((slug) => (
                                  <SelectItem key={slug} value={slug}>
                                    {ROLE_LABEL[slug]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : isAssignableSlug(member.roleSlug) ? (
                            <Select
                              disabled={busy}
                              value={member.roleSlug}
                              onValueChange={(value) => {
                                if (value !== member.roleSlug && isAssignableSlug(value)) {
                                  void patchRole(member.userOrganisationId, value);
                                }
                              }}
                            >
                              <SelectTrigger className="h-9 w-[200px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ASSIGNABLE_SLUGS.map((slug) => (
                                  <SelectItem key={slug} value={slug}>
                                    {ROLE_LABEL[slug]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className="w-fit">
                                {member.roleDisplayName}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Custom role — change in database if needed.
                              </span>
                            </div>
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

      <Sheet
        open={addSheetOpen}
        onOpenChange={(open) => {
          setAddSheetOpen(open);
          if (!open) {
            setAddSubmitting(false);
            setAddEmailChecking(false);
            setAddWizardStep("email");
            setAddEmail("");
            setAddFirstName("");
            setAddLastName("");
            setAddRoleSlug("crew");
          }
        }}
      >
        <SheetContent
          side="top"
          className="inset-x-1/2 right-auto flex w-full max-w-lg -translate-x-1/2 flex-col gap-0 rounded-b-xl border sm:max-w-xl"
        >
          <SheetHeader className="text-left">
            <SheetTitle>
              {addWizardStep === "email"
                ? "Add organisation member"
                : addWizardStep === "existing"
                  ? "Add to organisation"
                  : "Create account"}
            </SheetTitle>
            <SheetDescription>
              {addWizardStep === "email"
                ? "Enter their email. We will check whether they already have an account."
                : addWizardStep === "existing"
                  ? `An account already exists for ${addEmail.trim() || "this email"}. Choose their organisation role, then add them. Venue access stays in Workforce.`
                  : `No account yet for ${addEmail.trim() || "this email"}. Enter their name and organisation role. They will be email-confirmed and can sign in with password reset.`}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 pb-2">
            {addWizardStep === "email" ? (
              <div className="space-y-2">
                <Label htmlFor="org-add-email">Email</Label>
                <Input
                  id="org-add-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  disabled={addSubmitting || addEmailChecking}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void continueAddMemberFromEmail();
                    }
                  }}
                />
              </div>
            ) : null}

            {addWizardStep === "existing" ? (
              <div className="space-y-2">
                <Label>Organisation role</Label>
                <Select
                  value={addRoleSlug}
                  onValueChange={(value) => {
                    if (isAssignableSlug(value)) {
                      setAddRoleSlug(value);
                    }
                  }}
                  disabled={addSubmitting}
                >
                  <SelectTrigger className="h-10 w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE_SLUGS.map((slug) => (
                      <SelectItem key={slug} value={slug}>
                        {ROLE_LABEL[slug]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {addWizardStep === "new" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="org-add-first-name">First name</Label>
                    <Input
                      id="org-add-first-name"
                      autoComplete="given-name"
                      placeholder="First name"
                      value={addFirstName}
                      onChange={(e) => setAddFirstName(e.target.value)}
                      disabled={addSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-add-last-name">Last name</Label>
                    <Input
                      id="org-add-last-name"
                      autoComplete="family-name"
                      placeholder="Last name"
                      value={addLastName}
                      onChange={(e) => setAddLastName(e.target.value)}
                      disabled={addSubmitting}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Organisation role</Label>
                  <Select
                    value={addRoleSlug}
                    onValueChange={(value) => {
                      if (isAssignableSlug(value)) {
                        setAddRoleSlug(value);
                      }
                    }}
                    disabled={addSubmitting}
                  >
                    <SelectTrigger className="h-10 w-full max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_SLUGS.map((slug) => (
                        <SelectItem key={slug} value={slug}>
                          {ROLE_LABEL[slug]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : null}
          </div>
          <SheetFooter className="flex flex-row flex-wrap justify-between gap-2 border-t pt-4">
            <div className="flex gap-2">
              {addWizardStep !== "email" ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={addSubmitting || addEmailChecking}
                  onClick={() => {
                    setAddWizardStep("email");
                  }}
                >
                  Back
                </Button>
              ) : null}
            </div>
            <div className="ml-auto flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={addSubmitting || addEmailChecking}
                onClick={() => setAddSheetOpen(false)}
              >
                Cancel
              </Button>
              {addWizardStep === "email" ? (
                <Button
                  type="button"
                  disabled={addSubmitting || addEmailChecking}
                  onClick={() => void continueAddMemberFromEmail()}
                >
                  {addEmailChecking ? "Checking…" : "Continue"}
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={addSubmitting}
                  onClick={() => void addMember()}
                >
                  {addSubmitting
                    ? "Adding…"
                    : addWizardStep === "existing"
                      ? "Add to organisation"
                      : "Create and add"}
                </Button>
              )}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
