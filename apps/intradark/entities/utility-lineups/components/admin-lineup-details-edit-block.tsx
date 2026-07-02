"use client";

import * as React from "react";
import {
  ArrowBigUp,
  Minus as MinusIcon,
  MousePointer2,
  MousePointerClick,
  StretchHorizontal,
  Users,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";

import { updateUtilityLineupDetailsAction } from "@/entities/utility-lineups/actions/admin-utility-lineups-moderation-actions";
import {
  CT_SIDE_ICON_SRC,
  GRENADE_TYPE_OPTIONS,
  MARGIN_OPTIONS,
  MOVEMENT_OPTIONS,
  T_SIDE_ICON_SRC,
} from "@/entities/utility-lineups/components/upload-wizard/constants";
import {
  buildTechnique,
  wizardLineupDetailTileClass,
} from "@/entities/utility-lineups/components/upload-wizard/helpers";
import { WizardDetailOptionButton } from "@/entities/utility-lineups/components/upload-wizard/shared-components";
import type {
  GrenadeType,
  MarginType,
  MovementType,
  SideType,
  TechniqueClickChoice,
} from "@/entities/utility-lineups/components/upload-wizard/types";

export type AdminEditableLineup = {
  id: string;
  throwLabel: string;
  landLabel: string;
  grenadeType: string;
  side: string;
  movement: string;
  technique: string;
  margin: string;
  description: string;
  setposText: string | null;
  youtubeUrl: string | null;
};

function decomposeTechnique(t: string): {
  jumping: boolean;
  click: TechniqueClickChoice;
} {
  const jumping = t.startsWith("jump_");
  const click: TechniqueClickChoice = t.includes("left_and_right")
    ? "both"
    : t.includes("right")
      ? "right"
      : "left";
  return { jumping, click };
}

export function AdminDetailsEditBlock({
  lineup,
  mapSlug,
  onCancel,
  onSaved,
}: {
  lineup: AdminEditableLineup;
  mapSlug: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [throwLabel, setThrowLabel] = React.useState(lineup.throwLabel);
  const [landLabel, setLandLabel] = React.useState(lineup.landLabel);
  const [side, setSide] = React.useState<SideType>(lineup.side as SideType);
  const [grenadeType, setGrenadeType] = React.useState<GrenadeType>(
    lineup.grenadeType as GrenadeType,
  );
  const [movement, setMovement] = React.useState<MovementType>(
    lineup.movement as MovementType,
  );
  const [jumping, setJumping] = React.useState(
    () => decomposeTechnique(lineup.technique).jumping,
  );
  const [click, setClick] = React.useState<TechniqueClickChoice>(
    () => decomposeTechnique(lineup.technique).click,
  );
  const [margin, setMargin] = React.useState<MarginType>(
    lineup.margin as MarginType,
  );
  const [description, setDescription] = React.useState(lineup.description);
  const [setposText, setSetposText] = React.useState(lineup.setposText ?? "");
  const [youtubeUrl, setYoutubeUrl] = React.useState(lineup.youtubeUrl ?? "");
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    setThrowLabel(lineup.throwLabel);
    setLandLabel(lineup.landLabel);
    setSide(lineup.side as SideType);
    setGrenadeType(lineup.grenadeType as GrenadeType);
    setMovement(lineup.movement as MovementType);
    const decomposed = decomposeTechnique(lineup.technique);
    setJumping(decomposed.jumping);
    setClick(decomposed.click);
    setMargin(lineup.margin as MarginType);
    setDescription(lineup.description);
    setSetposText(lineup.setposText ?? "");
    setYoutubeUrl(lineup.youtubeUrl ?? "");
    setErr(null);
  }, [lineup]);

  async function save() {
    if (!throwLabel.trim() || !landLabel.trim() || !description.trim()) {
      setErr("Throw label, land label, and description are required.");
      return;
    }
    setSaving(true);
    setErr(null);
    const res = await updateUtilityLineupDetailsAction({
      lineupId: lineup.id,
      mapSlug,
      throwLabel: throwLabel.trim(),
      landLabel: landLabel.trim(),
      grenadeType,
      side,
      movement,
      technique: buildTechnique(jumping, click),
      margin,
      description: description.trim(),
      setposText: setposText.trim() || null,
      youtubeUrl: youtubeUrl.trim() || null,
    });
    setSaving(false);
    if (!res.ok) {
      setErr(res.message);
      return;
    }
    onSaved();
  }

  return (
    <div className="border-border space-y-4 border-t pt-3">
      <p className="text-sm font-medium">Edit lineup details</p>
      {err ? <p className="text-destructive text-sm">{err}</p> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="admin-throw-label">Throw label</Label>
          <Input
            id="admin-throw-label"
            value={throwLabel}
            disabled={saving}
            onChange={(e) => setThrowLabel(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin-land-label">Land label</Label>
          <Input
            id="admin-land-label"
            value={landLabel}
            disabled={saving}
            onChange={(e) => setLandLabel(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Side</Label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => setSide("ct")}
            className={cn(
              wizardLineupDetailTileClass(side === "ct"),
              "flex min-h-11 w-full items-center justify-center gap-2 px-2.5 py-2 text-sm font-medium",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={CT_SIDE_ICON_SRC} alt="" className="size-5 shrink-0" />
            CT
          </button>
          <WizardDetailOptionButton
            selected={side === "both"}
            onClick={() => setSide("both")}
            icon={Users}
            label="Both"
            className="min-h-11 w-full justify-center"
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => setSide("t")}
            className={cn(
              wizardLineupDetailTileClass(side === "t"),
              "flex min-h-11 w-full items-center justify-center gap-2 px-2.5 py-2 text-sm font-medium",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={T_SIDE_ICON_SRC} alt="" className="size-5 shrink-0" />
            T
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Grenade type</Label>
        <div className="grid grid-cols-4 gap-2">
          {GRENADE_TYPE_OPTIONS.map(({ value, label, icon }) => (
            <WizardDetailOptionButton
              key={value}
              selected={grenadeType === value}
              onClick={() => setGrenadeType(value)}
              icon={icon}
              label={label}
              className="w-full justify-center text-xs sm:text-sm"
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Movement</Label>
        <div className="grid grid-cols-5 gap-2">
          {MOVEMENT_OPTIONS.map(({ value, label, icon }) => (
            <WizardDetailOptionButton
              key={value}
              selected={movement === value}
              onClick={() => setMovement(value)}
              icon={icon}
              label={label}
              className="w-full justify-center text-[11px] leading-tight sm:text-xs"
              iconClassName="size-3.5 sm:size-4"
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Technique</Label>
          <div className="grid grid-cols-2 gap-2">
            <WizardDetailOptionButton
              selected={!jumping}
              onClick={() => setJumping(false)}
              icon={MinusIcon}
              label="Standing"
              className="w-full justify-center text-[11px] leading-tight sm:text-xs"
              iconClassName="size-3.5 sm:size-4"
            />
            <WizardDetailOptionButton
              selected={jumping}
              onClick={() => setJumping(true)}
              icon={ArrowBigUp}
              label="Jumping"
              className="w-full justify-center text-[11px] leading-tight sm:text-xs"
              iconClassName="size-3.5 sm:size-4"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Click type</Label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { choice: "left" as const, label: "Left", icon: MousePointer2 },
                {
                  choice: "right" as const,
                  label: "Right",
                  icon: MousePointerClick,
                },
                {
                  choice: "both" as const,
                  label: "Both",
                  icon: StretchHorizontal,
                },
              ] as const
            ).map(({ choice, label, icon }) => (
              <WizardDetailOptionButton
                key={choice}
                selected={click === choice}
                onClick={() => setClick(choice)}
                icon={icon}
                label={label}
                className="w-full justify-center text-[11px] leading-tight sm:text-xs"
                iconClassName="size-3.5 sm:size-4"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Margin for error</Label>
        <div className="grid grid-cols-3 gap-2">
          {MARGIN_OPTIONS.map(({ value, label, icon }) => (
            <WizardDetailOptionButton
              key={value}
              selected={margin === value}
              onClick={() => setMargin(value)}
              icon={icon}
              label={label}
              className="w-full justify-center"
            />
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="admin-description">Description</Label>
        <Textarea
          id="admin-description"
          rows={4}
          value={description}
          disabled={saving}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="admin-setpos">Setpos (optional)</Label>
        <Textarea
          id="admin-setpos"
          rows={3}
          value={setposText}
          disabled={saving}
          onChange={(e) => setSetposText(e.target.value)}
          className="font-mono text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="admin-youtube">YouTube URL (optional)</Label>
        <Input
          id="admin-youtube"
          value={youtubeUrl}
          disabled={saving}
          placeholder="https://youtube.com/watch?v=…"
          onChange={(e) => setYoutubeUrl(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save details"}
        </Button>
      </div>
    </div>
  );
}
