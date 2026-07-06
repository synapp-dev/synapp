"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Key, Loader2 } from "lucide-react";
import { licencesApi } from "@/entities/licences/api/endpoints";
import { meApi } from "@/entities/me/api/endpoints";
import { useUsers } from "@/entities/users/model/store";
import { useSchoolDetail } from "../school-detail-context";

function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]{2,}@[^\s@]+\.[^\s@]{2,}$/;
  return emailRegex.test(email);
}

async function fetchSchoolLicenceRecord(schoolId: string) {
  const activeResult = await licencesApi.get.list({
    schoolId,
    status: "ACTIVE",
    limit: 1,
  });

  if (!activeResult.error && activeResult.data && activeResult.data.length > 0) {
    return activeResult.data[0];
  }

  const pendingResult = await licencesApi.get.list({
    schoolId,
    status: "PENDING",
    limit: 1,
  });

  if (
    !pendingResult.error &&
    pendingResult.data &&
    pendingResult.data.length > 0
  ) {
    return pendingResult.data[0];
  }

  return null;
}

export function SchoolLicencePanel() {
  const { school, open, activeSection, onSchoolUpdate } = useSchoolDetail();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { users } = useUsers();

  const [schoolLicence, setSchoolLicence] = useState<any | null>(null);
  const [loadingLicence, setLoadingLicence] = useState(false);
  const [addLicenceDialogOpen, setAddLicenceDialogOpen] = useState(false);
  const [licenceDuration, setLicenceDuration] = useState("");
  const [schoolLicenceEmail, setSchoolLicenceEmail] = useState("");
  const [existingLicenceEmail, setExistingLicenceEmail] = useState<
    string | null
  >(null);
  const [loadingLicenceEmail, setLoadingLicenceEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [licenceError, setLicenceError] = useState<string | null>(null);

  const isClosingDialogRef = useRef(false);
  const prevLicenseSectionRef = useRef<string | null>(null);
  const prevDialogParamRef = useRef<string | null>(null);

  const dialogParam = searchParams?.get("dialog") || null;

  const licenseUser = useMemo(() => {
    if (!users || !school.id) return null;
    return users.find((user) =>
      user.schoolRoles?.some(
        (role) =>
          role.schoolId === school.id && role.roleKey === "SCHOOL_LICENCE"
      )
    );
  }, [users, school.id]);

  const hasValidEmail = existingLicenceEmail
    ? true
    : schoolLicenceEmail
      ? isValidEmail(schoolLicenceEmail)
      : false;

  useEffect(() => {
    if (activeSection === "license" && school.id) {
      if (prevLicenseSectionRef.current !== "license") {
        setLoadingLicence(true);
        fetchSchoolLicenceRecord(school.id)
          .then(setSchoolLicence)
          .catch((error) => {
            console.error("Failed to fetch licence:", error);
            setSchoolLicence(null);
          })
          .finally(() => setLoadingLicence(false));
        prevLicenseSectionRef.current = "license";
      }
    } else if (activeSection !== "license") {
      prevLicenseSectionRef.current = activeSection;
    }
  }, [activeSection, school.id]);

  useEffect(() => {
    if (isClosingDialogRef.current) {
      return;
    }

    const dialogParamChanged = prevDialogParamRef.current !== dialogParam;
    if (!dialogParamChanged && !open) {
      return;
    }
    prevDialogParamRef.current = dialogParam;

    if (open && activeSection === "license") {
      if (dialogParam === "ADD-school-licence" && !addLicenceDialogOpen) {
        setAddLicenceDialogOpen(true);
      } else if (!dialogParam && addLicenceDialogOpen) {
        setAddLicenceDialogOpen(false);
      }
    }
  }, [open, school.id, activeSection, dialogParam, addLicenceDialogOpen]);

  useEffect(() => {
    if (addLicenceDialogOpen) {
      setLoadingLicenceEmail(true);
      meApi.get
        .listAllUsers()
        .then((result) => {
          if (!result.error && result.data) {
            const licenceUser = result.data.users.find((user) =>
              user.schoolRoles.some(
                (role) =>
                  role.schoolId === school.id &&
                  role.roleKey === "SCHOOL_LICENCE"
              )
            );
            if (licenceUser) {
              setExistingLicenceEmail(licenceUser.email);
              setSchoolLicenceEmail(licenceUser.email);
            } else {
              setExistingLicenceEmail(null);
              setSchoolLicenceEmail("");
            }
          }
        })
        .catch((error) => {
          console.error("Failed to fetch licence email:", error);
          setExistingLicenceEmail(null);
        })
        .finally(() => {
          setLoadingLicenceEmail(false);
        });
    }
  }, [addLicenceDialogOpen, school.id]);

  const closeAddLicenceDialog = () => {
    isClosingDialogRef.current = true;
    setAddLicenceDialogOpen(false);
    setLicenceDuration("");
    setSchoolLicenceEmail("");
    setExistingLicenceEmail(null);
    setLicenceError(null);

    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete("dialog");
    const newUrl = params.toString()
      ? `/admin/schools?${params.toString()}`
      : "/admin/schools";
    router.replace(newUrl, { scroll: false });

    setTimeout(() => {
      isClosingDialogRef.current = false;
    }, 100);
  };

  const openAddLicenceDialog = () => {
    setAddLicenceDialogOpen(true);
    if (school.slug) {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("school", school.slug);
      params.set("tab", "license");
      params.set("dialog", "ADD-school-licence");
      router.push(`/admin/schools?${params.toString()}`, { scroll: false });
    }
  };

  const refreshLicence = async () => {
    setLoadingLicence(true);
    try {
      const licence = await fetchSchoolLicenceRecord(school.id);
      setSchoolLicence(licence);
    } catch (error) {
      console.error("Failed to refresh licence:", error);
      setSchoolLicence(null);
    } finally {
      setLoadingLicence(false);
    }
  };

  const handleCreateLicence = async () => {
    if (!licenceDuration || !hasValidEmail) return;

    setSubmitting(true);
    setLicenceError(null);

    try {
      const result = await licencesApi.post.create({
        schoolId: school.id,
        status: "ACTIVE",
        durationYears: parseInt(licenceDuration, 10),
        metadata: schoolLicenceEmail
          ? { mainSchoolEmail: schoolLicenceEmail }
          : undefined,
      });

      if (result.error) {
        const error = result.error;
        const errorMessage =
          typeof error === "string"
            ? error
            : (error as { message?: string })?.message || String(error);

        if (
          errorMessage.includes("already been used") ||
          errorMessage.includes("cannot have any other roles")
        ) {
          setLicenceError(
            "This email has already been used for another role! The school licence can only be tied to the school email, and it cannot have any other roles."
          );
        } else {
          setLicenceError(
            errorMessage || "Failed to create licence. Please try again."
          );
        }
        return;
      }

      closeAddLicenceDialog();
      onSchoolUpdate?.();
      await refreshLicence();
    } catch (error: unknown) {
      console.warn("Error creating licence:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : error != null
            ? String(error)
            : "";

      if (
        errorMessage.includes("already been used") ||
        errorMessage.includes("cannot have any other roles")
      ) {
        setLicenceError(
          "This email has already been used for another role! The school licence can only be tied to the school email, and it cannot have any other roles."
        );
      } else {
        setLicenceError(
          errorMessage || "Failed to create licence. Please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const addLicenceDialog = (
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add School Licence</DialogTitle>
          <DialogDescription>
            Create a new licence for this school.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-8 py-4">
          <div className="flex gap-4">
            <div className="space-y-2 shrink-0">
              <Label htmlFor="licence-duration">Duration</Label>
              <Select value={licenceDuration} onValueChange={setLicenceDuration}>
                <SelectTrigger id="licence-duration" className="w-[140px]">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Year</SelectItem>
                  <SelectItem value="2">2 Years</SelectItem>
                  <SelectItem value="3">3 Years</SelectItem>
                  <SelectItem value="4">4 Years</SelectItem>
                  <SelectItem value="5">5 Years</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1">
              <Label htmlFor="school-licence-email">Main School Email</Label>
              <Input
                id="school-licence-email"
                type="email"
                placeholder={
                  existingLicenceEmail ? undefined : "Enter main school email"
                }
                value={schoolLicenceEmail}
                onChange={(e) => {
                  setSchoolLicenceEmail(e.target.value);
                  if (licenceError) {
                    setLicenceError(null);
                  }
                }}
                disabled={loadingLicenceEmail || !!existingLicenceEmail}
                className={
                  schoolLicenceEmail &&
                  !existingLicenceEmail &&
                  !isValidEmail(schoolLicenceEmail)
                    ? "border-red-500 focus-visible:ring-red-500"
                    : ""
                }
              />
              {schoolLicenceEmail &&
                !existingLicenceEmail &&
                !isValidEmail(schoolLicenceEmail) && (
                  <p className="text-sm text-red-500">
                    Please enter a valid email address (e.g., name@domain.com)
                  </p>
                )}
              {existingLicenceEmail && (
                <p className="text-sm text-muted-foreground">
                  Using existing licence email
                </p>
              )}
              {licenceError && (
                <div className="mt-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive font-medium">
                    {licenceError}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeAddLicenceDialog}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateLicence}
            disabled={submitting || !licenceDuration || !hasValidEmail}
          >
            {submitting ? "Creating..." : "Create Licence"}
          </Button>
        </DialogFooter>
      </DialogContent>
  );

  return (
    <>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          {loadingLicence ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ) : schoolLicence ? (
            <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900 p-0">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <Key className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">School Licence</h4>
                        <Badge
                          variant={
                            schoolLicence.status === "ACTIVE"
                              ? "default"
                              : "secondary"
                          }
                          className={
                            schoolLicence.status === "ACTIVE"
                              ? "bg-green-600"
                              : ""
                          }
                        >
                          {schoolLicence.status}
                        </Badge>
                      </div>
                      {licenseUser?.email && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {licenseUser.email}
                        </p>
                      )}
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {schoolLicence.startsAt && (
                          <p>
                            Starts:{" "}
                            {new Date(
                              schoolLicence.startsAt
                            ).toLocaleDateString()}
                          </p>
                        )}
                        {schoolLicence.endsAt && (
                          <p>
                            Expires:{" "}
                            {new Date(
                              schoolLicence.endsAt
                            ).toLocaleDateString()}
                          </p>
                        )}
                        {schoolLicence.planLength && (
                          <p>
                            Duration: {schoolLicence.planLength} year
                            {schoolLicence.planLength !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={openAddLicenceDialog}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <Key className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Add School Licence</h4>
                    <p className="text-sm text-muted-foreground">
                      Create a new licence
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog
        open={addLicenceDialogOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeAddLicenceDialog();
          } else {
            setAddLicenceDialogOpen(true);
          }
        }}
      >
        {addLicenceDialog}
      </Dialog>
    </>
  );
}
