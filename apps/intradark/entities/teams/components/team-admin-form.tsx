"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { updateTeamAction } from "@/entities/teams/actions";
import { TeamAvatarUpload } from "@/entities/teams/components/team-avatar-upload";
import type { TeamRow } from "@/entities/teams/types";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

export function TeamAdminForm({ team }: { team: TeamRow }) {
  const router = useRouter();
  const [name, setName] = React.useState(team.name);
  const [slug, setSlug] = React.useState(team.slug);
  const [nickname, setNickname] = React.useState(team.nickname ?? "");
  const [description, setDescription] = React.useState(team.description ?? "");
  const [primaryColor, setPrimaryColor] = React.useState(team.primaryColor ?? "");
  const [secondaryColor, setSecondaryColor] = React.useState(
    team.secondaryColor ?? "",
  );
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await updateTeamAction({
        teamId: team.id,
        name,
        slug,
        nickname: nickname.trim() || null,
        description: description.trim() || null,
        primaryColor: primaryColor.trim() || null,
        secondaryColor: secondaryColor.trim() || null,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setSuccess("Team settings saved.");
      if (res.data.slug !== team.slug) {
        router.replace(`/teams/${res.data.slug}/admin`);
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-6">
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-muted-foreground" role="status">
          {success}
        </p>
      ) : null}

      <TeamAvatarUpload
        teamId={team.id}
        initialAvatar={team.avatarObjectPath}
        onUploaded={() => router.refresh()}
      />

      <div className="space-y-2">
        <Label htmlFor="admin-team-name">Team name</Label>
        <Input
          id="admin-team-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={255}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-team-slug">URL slug</Label>
        <Input
          id="admin-team-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          maxLength={160}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-team-nickname">Nickname / tag</Label>
        <Input
          id="admin-team-nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={255}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-team-description">Description</Label>
        <Textarea
          id="admin-team-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={4000}
          rows={4}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="admin-team-primary-color">Primary colour</Label>
          <p className="text-muted-foreground text-xs">
            Profile header glow for players on this team.
          </p>
          <div className="flex items-center gap-2">
            <Input
              id="admin-team-primary-color"
              type="color"
              value={primaryColor || "#00497d"}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-14 shrink-0 cursor-pointer p-1"
            />
            <Input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              maxLength={7}
              placeholder="#00497d"
              pattern="^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$"
              aria-label="Primary colour hex value"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-team-secondary-color">Secondary colour</Label>
          <p className="text-muted-foreground text-xs">
            Profile header border and team name accent.
          </p>
          <div className="flex items-center gap-2">
            <Input
              id="admin-team-secondary-color"
              type="color"
              value={secondaryColor || "#0483c8"}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="h-10 w-14 shrink-0 cursor-pointer p-1"
            />
            <Input
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              maxLength={7}
              placeholder="#0483c8"
              pattern="^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$"
              aria-label="Secondary colour hex value"
            />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" asChild disabled={pending}>
          <Link href={`/teams/${team.slug}/home`}>Back to home</Link>
        </Button>
      </div>
    </form>
  );
}
