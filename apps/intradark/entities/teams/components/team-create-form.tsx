"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createTeamAction } from "@/entities/teams/actions";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

export function TeamCreateForm() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [nickname, setNickname] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createTeamAction({
        name,
        slug: slug.trim() || undefined,
        nickname: nickname.trim() || undefined,
        description: description.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.push(`/teams/${res.data.slug}/home`);
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
      <div className="space-y-2">
        <Label htmlFor="team-name">Team name</Label>
        <Input
          id="team-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={255}
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="team-slug">URL slug (optional)</Label>
        <Input
          id="team-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          maxLength={160}
          placeholder="auto-generated from name"
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="team-nickname">Nickname / tag (optional)</Label>
        <Input
          id="team-nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={255}
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="team-description">Description (optional)</Label>
        <Textarea
          id="team-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={4000}
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="team-avatar">Avatar URL (optional)</Label>
        <Input
          id="team-avatar"
          type="url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://…"
          autoComplete="off"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create team"}
        </Button>
        <Button type="button" variant="outline" asChild disabled={pending}>
          <Link href="/teams">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
