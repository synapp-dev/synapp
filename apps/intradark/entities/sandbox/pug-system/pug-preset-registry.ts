export const PUG_PRESET_IDS = ["default", "quick-tour"] as const;

export type PugPresetId = (typeof PUG_PRESET_IDS)[number];

export const PUG_PRESETS: { id: PugPresetId; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "quick-tour", label: "Quick tour (automate)" },
];

export const PUG_DEFAULT_PRESET_ID: PugPresetId = "default";

export function applyPugPresetToPlayout(
  _presetId: PugPresetId,
  actions: {
    setAcceptOneDeclines: (v: boolean) => void;
    setServerSimulateStall: (v: boolean) => void;
  },
): void {
  actions.setAcceptOneDeclines(false);
  actions.setServerSimulateStall(false);
}
