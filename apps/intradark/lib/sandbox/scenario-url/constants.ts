export const SANDBOX_SCENARIO_QUERY_KEY = "scenario";
export const SANDBOX_STEP_QUERY_KEY = "step";
export const SANDBOX_PRESET_QUERY_KEY = "preset";
/** Reserved for future autostart; stripped in M1 (explicit Run only). */
export const SANDBOX_AUTOMATE_QUERY_KEY = "automate";

export const SANDBOX_SCENARIO_URL_KEYS = [
  SANDBOX_SCENARIO_QUERY_KEY,
  SANDBOX_STEP_QUERY_KEY,
  SANDBOX_PRESET_QUERY_KEY,
] as const;

/** PUG-style sandboxes: URL carries only step + preset (no scenario param). */
export const SANDBOX_STEP_PRESET_URL_KEYS = [
  SANDBOX_STEP_QUERY_KEY,
  SANDBOX_PRESET_QUERY_KEY,
] as const;
