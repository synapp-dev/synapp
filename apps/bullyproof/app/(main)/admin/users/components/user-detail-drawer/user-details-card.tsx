"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Loader2, Pencil, Save, AlertCircle } from "lucide-react";
import { formatDate } from "./utils";
import type { UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
import { usersApi } from "@/entities/users/api/endpoints";

interface UserDetailsCardProps {
  user: UserWithRolesAndSchools | null;
  onUserUpdate?: () => void;
}

export function UserDetailsCard({ user, onUserUpdate }: UserDetailsCardProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  // Initialize form when user changes
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setEmail(user.email || "");
    }
  }, [user?.id]);

  // Check if there are changes
  const hasChanges =
    user &&
    (firstName !== (user.firstName || "") ||
      lastName !== (user.lastName || "") ||
      email !== (user.email || ""));

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      setSaveError(null);

      const result = await usersApi.patch.update(user.id, {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: email || undefined,
      });

      if (result.error) {
        const errorMessage =
          result.error.message || "Failed to update user";
        throw new Error(errorMessage);
      }

      setEditing(false);
      onUserUpdate?.();
    } catch (err: any) {
      console.error("Failed to update user:", err);
      setSaveError(err.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setSaveError(null);
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setEmail(user.email || "");
    }
  };

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          {user.createdAt && (
            <p className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
              Created {formatDate(user.createdAt)}
            </p>
          )}
          {editing ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className={
                  hasChanges && !saving
                    ? "bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90"
                    : ""
                }
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(true);
                setSaveError(null);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="firstName"
              className="text-xs text-muted-foreground ml-2"
            >
              First Name
            </Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={!editing}
              className={!editing ? "bg-muted" : ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="lastName"
              className="text-xs text-muted-foreground ml-2"
            >
              Last Name
            </Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={!editing}
              className={!editing ? "bg-muted" : ""}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-xs text-muted-foreground ml-2"
          >
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!editing}
            className={!editing ? "bg-muted" : ""}
          />
        </div>

        {saveError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
