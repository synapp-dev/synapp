"use client";

import {
  ArrowBigUp,
  Minus,
  MousePointer2,
  MousePointerClick,
  StretchHorizontal,
  Users,
} from "lucide-react";

import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";

import { StaggeredAnimation } from "@/components/atoms/staggered-animation";

import {
  CT_SIDE_ICON_SRC,
  GRENADE_TYPE_OPTIONS,
  MARGIN_OPTIONS,
  MOVEMENT_OPTIONS,
  T_SIDE_ICON_SRC,
} from "../constants";
import { nadeDetailRowLabelClass, wizardLineupDetailTileClass } from "../helpers";
import { WizardDetailOptionButton } from "../shared-components";
import { useUploadWizard } from "../upload-wizard-context";

export function NadeDetailsStep() {
  const {
    nadeDetailActiveRow,
    nadeRowStagger,
    prefersReducedMotion,
    side,
    setSide,
    grenadeType,
    setGrenadeType,
    movement,
    setMovement,
    techniqueJump,
    setTechniqueJump,
    techniqueClick,
    setTechniqueClick,
    resolvedTechnique,
    margin,
    setMargin,
  } = useUploadWizard();

  return (
    <div className="flex w-full min-w-0 flex-col gap-10">
      <div className="w-full min-w-0 space-y-2">
        <Label
          className={nadeDetailRowLabelClass(
            nadeDetailActiveRow === "side",
            prefersReducedMotion,
          )}
        >
          Side
        </Label>
        <div className="grid w-full min-w-0 grid-cols-3 gap-2">
          <StaggeredAnimation
            {...nadeRowStagger}
            className="min-w-0 w-full"
            index={0}
          >
            <button
              type="button"
              onClick={() => setSide("ct")}
              className={cn(
                wizardLineupDetailTileClass(side === "ct"),
                "group flex min-h-14 w-full items-center justify-start gap-2 px-2.5 py-2.5 text-sm font-medium",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={CT_SIDE_ICON_SRC}
                alt=""
                className={cn(
                  "size-7 shrink-0 object-contain sm:size-8",
                  side === "ct"
                    ? "opacity-100"
                    : "opacity-70 group-hover:opacity-100",
                )}
                draggable={false}
              />
              <span className="min-w-0 leading-tight">CT</span>
            </button>
          </StaggeredAnimation>
          <StaggeredAnimation
            {...nadeRowStagger}
            className="min-w-0 w-full"
            index={1}
          >
            <WizardDetailOptionButton
              selected={side === "both"}
              onClick={() => setSide("both")}
              icon={Users}
              label="Both sides"
              className="min-h-14 w-full"
            />
          </StaggeredAnimation>
          <StaggeredAnimation
            {...nadeRowStagger}
            className="min-w-0 w-full"
            index={2}
          >
            <button
              type="button"
              onClick={() => setSide("t")}
              className={cn(
                wizardLineupDetailTileClass(side === "t"),
                "group flex min-h-14 w-full items-center justify-start gap-2 px-2.5 py-2.5 text-sm font-medium",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={T_SIDE_ICON_SRC}
                alt=""
                className={cn(
                  "size-7 shrink-0 object-contain sm:size-8",
                  side === "t"
                    ? "opacity-100"
                    : "opacity-70 group-hover:opacity-100",
                )}
                draggable={false}
              />
              <span className="min-w-0 leading-tight">T</span>
            </button>
          </StaggeredAnimation>
        </div>
      </div>

      {side !== null ? (
        <div className="w-full min-w-0 space-y-2">
          <Label
            className={nadeDetailRowLabelClass(
              nadeDetailActiveRow === "grenade",
              prefersReducedMotion,
            )}
          >
            Grenade type
          </Label>
          <ul className="grid w-full min-w-0 grid-cols-4 gap-2" role="list">
            {GRENADE_TYPE_OPTIONS.map(({ value, label, icon }, i) => (
              <li key={value} className="min-w-0 list-none [&>*]:w-full">
                <StaggeredAnimation
                  {...nadeRowStagger}
                  className="min-w-0 w-full"
                  index={i}
                >
                  <WizardDetailOptionButton
                    selected={grenadeType === value}
                    onClick={() => setGrenadeType(value)}
                    icon={icon}
                    label={label}
                    className="w-full text-xs sm:text-sm"
                  />
                </StaggeredAnimation>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {side !== null && grenadeType !== null ? (
        <div className="w-full min-w-0 space-y-2">
          <Label
            className={nadeDetailRowLabelClass(
              nadeDetailActiveRow === "movement",
              prefersReducedMotion,
            )}
          >
            Movement
          </Label>
          <ul className="grid w-full min-w-0 grid-cols-5 gap-2" role="list">
            {MOVEMENT_OPTIONS.map(({ value, label, icon }, i) => (
              <li key={value} className="min-w-0 list-none [&>*]:w-full">
                <StaggeredAnimation
                  {...nadeRowStagger}
                  className="min-w-0 w-full"
                  index={i}
                >
                  <WizardDetailOptionButton
                    selected={movement === value}
                    onClick={() => setMovement(value)}
                    icon={icon}
                    label={label}
                    className="w-full text-[11px] leading-tight sm:text-xs"
                    iconClassName="size-3.5 sm:size-4"
                  />
                </StaggeredAnimation>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {side !== null && grenadeType !== null && movement !== null ? (
        <div className="w-full min-w-0 space-y-2">
          <div className="grid w-full min-w-0 grid-cols-5 gap-2">
            <div className="col-span-2 min-w-0">
              <Label
                className={nadeDetailRowLabelClass(
                  nadeDetailActiveRow === "technique" &&
                    techniqueJump === null,
                  prefersReducedMotion,
                )}
              >
                Technique
              </Label>
            </div>
            <div className="col-span-3 min-w-0">
              <Label
                className={nadeDetailRowLabelClass(
                  nadeDetailActiveRow === "technique" &&
                    techniqueClick === null,
                  prefersReducedMotion,
                )}
              >
                Click type
              </Label>
            </div>
          </div>
          <div className="grid w-full min-w-0 grid-cols-5 gap-2">
            <StaggeredAnimation
              {...nadeRowStagger}
              className="min-w-0 w-full"
              index={0}
            >
              <WizardDetailOptionButton
                selected={techniqueJump === "standing"}
                onClick={() => setTechniqueJump("standing")}
                icon={Minus}
                label="Standing"
                className="w-full text-[11px] leading-tight sm:text-xs"
                iconClassName="size-3.5 sm:size-4"
              />
            </StaggeredAnimation>
            <StaggeredAnimation
              {...nadeRowStagger}
              className="min-w-0 w-full"
              index={1}
            >
              <WizardDetailOptionButton
                selected={techniqueJump === "jumping"}
                onClick={() => setTechniqueJump("jumping")}
                icon={ArrowBigUp}
                label="Jumping"
                className="w-full text-[11px] leading-tight sm:text-xs"
                iconClassName="size-3.5 sm:size-4"
              />
            </StaggeredAnimation>
            {(
              [
                {
                  choice: "left" as const,
                  label: "Left click",
                  icon: MousePointer2,
                },
                {
                  choice: "right" as const,
                  label: "Right click",
                  icon: MousePointerClick,
                },
                {
                  choice: "both" as const,
                  label: "Left + right",
                  icon: StretchHorizontal,
                },
              ] as const
            ).map(({ choice, label, icon }, i) => (
              <StaggeredAnimation
                key={choice}
                {...nadeRowStagger}
                className="min-w-0 w-full"
                index={2 + i}
              >
                <WizardDetailOptionButton
                  selected={techniqueClick === choice}
                  onClick={() => setTechniqueClick(choice)}
                  icon={icon}
                  label={label}
                  className="w-full text-[11px] leading-tight sm:text-xs"
                  iconClassName="size-3.5 sm:size-4"
                />
              </StaggeredAnimation>
            ))}
          </div>
        </div>
      ) : null}

      {side !== null &&
      grenadeType !== null &&
      movement !== null &&
      resolvedTechnique !== null ? (
        <div className="w-full min-w-0 space-y-2">
          <Label
            className={nadeDetailRowLabelClass(
              nadeDetailActiveRow === "margin",
              prefersReducedMotion,
            )}
          >
            Margin for error
          </Label>
          <div className="grid w-full min-w-0 grid-cols-3 gap-2">
            {MARGIN_OPTIONS.map(({ value, label, icon }, i) => (
              <StaggeredAnimation
                key={value}
                {...nadeRowStagger}
                className="min-w-0 w-full"
                index={i}
              >
                <WizardDetailOptionButton
                  selected={margin === value}
                  onClick={() => setMargin(value)}
                  icon={icon}
                  label={label}
                  className="w-full"
                />
              </StaggeredAnimation>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
