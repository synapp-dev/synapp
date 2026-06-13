"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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

type VenueOption = { id: string; name: string };
type RoleOption = { slug: string; label: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisationSlug: string;
  venues: VenueOption[];
  roleOptions: RoleOption[];
};

export function InviteMemberDialog({
  open,
  onOpenChange,
  organisationSlug,
  venues,
  roleOptions,
}: Props) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [roleSlug, setRoleSlug] = useState("crew");
  const [venueIds, setVenueIds] = useState<string[]>([]);

  useEffect(() => {
    if (open && venues.length > 0 && venueIds.length === 0) {
      setVenueIds([venues[0]!.id]);
    }
  }, [open, venues, venueIds.length]);

  const mutation = useMutation({
    mutationFn: () =>
      membersApi.invite(organisationSlug, { email, roleSlug, venueIds }),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(membersErrorMessage(result.error));
        return;
      }
      toast.success("Invite sent");
      void queryClient.invalidateQueries({
        queryKey: membersKeys.list(organisationSlug),
      });
      onOpenChange(false);
      setEmail("");
    },
  });

  function toggleVenue(id: string, checked: boolean) {
    setVenueIds((prev) =>
      checked ? [...prev, id] : prev.filter((v) => v !== id),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite user</DialogTitle>
          <DialogDescription>
            Send a magic-link invite. They will appear as pending until they accept.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@venue.com"
            />
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
            disabled={mutation.isPending || !email || venueIds.length === 0}
          >
            {mutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Send invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
