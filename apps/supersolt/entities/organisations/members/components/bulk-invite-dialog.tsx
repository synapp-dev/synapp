"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { parseBulkEmails } from "@/entities/organisations/members/lib/bulk-email";
import {
  membersApi,
  membersErrorMessage,
} from "@/entities/organisations/members/api/endpoints";
import { membersKeys } from "@/entities/organisations/members/model/keys";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Checkbox } from "@workspace/ui/components/checkbox";

type VenueOption = { id: string; name: string };
type RoleOption = { slug: string; label: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisationSlug: string;
  venues: VenueOption[];
  roleOptions: RoleOption[];
};

export function BulkInviteDialog({
  open,
  onOpenChange,
  organisationSlug,
  venues,
  roleOptions,
}: Props) {
  const queryClient = useQueryClient();
  const [paste, setPaste] = useState("");
  const [roleSlug, setRoleSlug] = useState("crew");
  const [venueIds, setVenueIds] = useState<string[]>([]);

  useEffect(() => {
    if (open && venues.length > 0 && venueIds.length === 0) {
      setVenueIds([venues[0]!.id]);
    }
  }, [open, venues, venueIds.length]);

  const parsed = parseBulkEmails(paste);

  const mutation = useMutation({
    mutationFn: () =>
      membersApi.inviteBulk(organisationSlug, {
        emails: parsed.valid.map((v) => v.email),
        roleSlug,
        venueIds,
      }),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(membersErrorMessage(result.error));
        return;
      }
      const { created, skipped, errors } = result.data!;
      toast.success(`Sent ${created} invite(s)${skipped ? `, skipped ${skipped}` : ""}`);
      if (errors.length) {
        toast.message(errors.slice(0, 3).join("; "));
      }
      void queryClient.invalidateQueries({
        queryKey: membersKeys.list(organisationSlug),
      });
      onOpenChange(false);
      setPaste("");
    },
  });

  function toggleVenue(id: string, checked: boolean) {
    setVenueIds((prev) =>
      checked ? [...prev, id] : prev.filter((v) => v !== id),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk invite</DialogTitle>
          <DialogDescription>
            Paste one email per line. Defaults to Staff and your first venue.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="bulk-emails">Emails</Label>
            <Textarea
              id="bulk-emails"
              rows={6}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder={"chef@venue.com\ncounter@venue.com"}
            />
            {parsed.errors.length > 0 ? (
              <ul className="text-destructive text-xs">
                {parsed.errors.slice(0, 5).map((e) => (
                  <li key={`${e.line}-${e.value}`}>
                    Line {e.line}: {e.reason}
                  </li>
                ))}
              </ul>
            ) : null}
            {parsed.valid.length > 0 ? (
              <p className="text-muted-foreground text-xs">
                {parsed.valid.length} valid email(s) ready to send
              </p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label>Permission level</Label>
            <Select value={roleSlug} onValueChange={setRoleSlug}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => (
                  <SelectItem key={r.slug} value={r.slug}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Venue access</Label>
            <div className="flex flex-col gap-2">
              {venues.map((v) => (
                <label key={v.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={venueIds.includes(v.id)}
                    onCheckedChange={(c) => toggleVenue(v.id, c === true)}
                  />
                  {v.name}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={
              mutation.isPending ||
              parsed.valid.length === 0 ||
              venueIds.length === 0
            }
          >
            {mutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Send invites
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
