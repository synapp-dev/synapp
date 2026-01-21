"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import { useRoles } from "@/entities/users/model/store";
import { rolesApi } from "@/entities/roles/api/endpoints";
import { cn } from "@workspace/ui/lib/utils";
import type { School as SchoolType } from "./schools-table-columns";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

interface BulkRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school: SchoolType | null;
  onSuccess?: () => void;
}

type BulkRoleResult = {
  email: string;
  success: boolean;
  message: string;
  skipped?: boolean;
};

type BulkRoleResponse = {
  success: boolean;
  results: BulkRoleResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    skipped: number;
  };
};

// Email validation helper
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// Parse CSV emails (supports comma-separated or newline-separated)
const parseEmails = (text: string): string[] => {
  return text
    .split(/[,\n]/)
    .map((email) => email.trim())
    .filter((email) => email.length > 0)
    .filter((email, index, self) => self.indexOf(email) === index); // Remove duplicates
};

export function BulkRoleDialog({
  open,
  onOpenChange,
  school,
  onSuccess,
}: BulkRoleDialogProps) {
  const { roles: allRoles } = useRoles();
  const [emailText, setEmailText] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [action, setAction] = useState<"assign" | "remove">("assign");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkRoleResponse | null>(null);

  // Filter to only school-scoped roles - check by role key patterns
  // School roles are: SCHOOL_ADMIN, SCHOOL_STAFF, TEACHER, SCHOOL_LICENCE
  const schoolRoles = useMemo(
    () =>
      allRoles.filter(
        (role) =>
          role.key &&
          (role.key === "SCHOOL_ADMIN" ||
            role.key === "SCHOOL_STAFF" ||
            role.key === "TEACHER" ||
            role.key === "SCHOOL_LICENCE")
      ),
    [allRoles]
  );

  // Parse emails from text
  const parsedEmails = useMemo(() => parseEmails(emailText), [emailText]);

  // Validate emails
  const validEmails = useMemo(
    () => parsedEmails.filter((email) => isValidEmail(email)),
    [parsedEmails]
  );

  const invalidEmails = useMemo(
    () => parsedEmails.filter((email) => !isValidEmail(email)),
    [parsedEmails]
  );

  const canSubmit =
    validEmails.length > 0 &&
    selectedRoleIds.length > 0 &&
    school &&
    !submitting;

  // Reset state when dialog closes
  const handleClose = (open: boolean) => {
    if (!open) {
      setEmailText("");
      setSelectedRoleIds([]);
      setAction("assign");
      setError(null);
      setResult(null);
      setSubmitting(false);
    }
    onOpenChange(open);
  };

  // Toggle role selection
  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  // Handle bulk role operation
  const handleSubmit = async () => {
    if (!canSubmit || !school) return;

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await rolesApi.post.bulkManageRoles({
        schoolId: school.id,
        emails: validEmails,
        roleIds: selectedRoleIds,
        action,
      });

      if (response.error) {
        setError(response.error.message || "Failed to process bulk role operation");
        setSubmitting(false);
        return;
      }

      if (response.data) {
        setResult(response.data);
        if (response.data.summary.succeeded > 0 && onSuccess) {
          // Small delay to show results before closing
          setTimeout(() => {
            onSuccess();
          }, 2000);
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Edit Roles</DialogTitle>
          <DialogDescription>
            Assign or remove roles for multiple users by pasting their email
            addresses. Users will be added to this school if they don't already have roles here.
            Supports comma-separated or newline-separated formats.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Action Selection */}
          <div className="space-y-2">
            <Label>Action</Label>
            <RadioGroup
              value={action}
              onValueChange={(value) => setAction(value as "assign" | "remove")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="assign" id="action-assign" />
                <Label
                  htmlFor="action-assign"
                  className="font-normal cursor-pointer"
                >
                  Assign Roles
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="remove" id="action-remove" />
                <Label
                  htmlFor="action-remove"
                  className="font-normal cursor-pointer"
                >
                  Remove Roles
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label>Select Roles</Label>
            <ScrollArea className="h-32 border rounded-md p-2">
              <div className="space-y-2">
                {schoolRoles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No school roles available
                  </p>
                ) : (
                  schoolRoles.map((role) => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={selectedRoleIds.includes(role.id)}
                        onCheckedChange={() => toggleRole(role.id)}
                      />
                      <Label
                        htmlFor={`role-${role.id}`}
                        className="font-normal cursor-pointer"
                      >
                        {role.name}
                        {role.key && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({role.key})
                          </span>
                        )}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="emails">Email Addresses</Label>
            <Textarea
              id="emails"
              placeholder="Paste emails here (comma or newline separated)&#10;Example:&#10;user1@example.com&#10;user2@example.com, user3@example.com"
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              className="min-h-[120px] font-mono text-sm"
              disabled={submitting}
            />
            {parsedEmails.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {validEmails.length} valid email{validEmails.length !== 1 ? "s" : ""}
                {invalidEmails.length > 0 && (
                  <span className="text-destructive ml-2">
                    • {invalidEmails.length} invalid
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Results Display */}
          {result && (
            <div className="space-y-2">
              <Alert
                variant={
                  result.summary.failed === 0 ? "default" : "destructive"
                }
              >
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Operation Complete</AlertTitle>
                <AlertDescription>
                  <div className="space-y-1 mt-2">
                    <div>
                      Total: {result.summary.total} • Succeeded:{" "}
                      {result.summary.succeeded} • Failed:{" "}
                      {result.summary.failed} • Skipped:{" "}
                      {result.summary.skipped}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <ScrollArea className="h-48 border rounded-md">
                <div className="p-2 space-y-1">
                  {result.results.map((item, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center gap-2 text-sm p-2 rounded",
                        item.success
                          ? "bg-green-50 dark:bg-green-950/20"
                          : item.skipped
                            ? "bg-yellow-50 dark:bg-yellow-950/20"
                            : "bg-red-50 dark:bg-red-950/20"
                      )}
                    >
                      {item.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : item.skipped ? (
                        <Info className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      )}
                      <span className="font-mono text-xs">{item.email}</span>
                      <span className="text-muted-foreground ml-auto">
                        {item.message}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={submitting}
          >
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {action === "assign" ? "Assign" : "Remove"} Roles
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
