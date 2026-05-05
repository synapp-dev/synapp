import {
  SANDBOX_AUTOMATE_QUERY_KEY,
  SANDBOX_PRESET_QUERY_KEY,
  SANDBOX_SCENARIO_QUERY_KEY,
  SANDBOX_SCENARIO_URL_KEYS,
  SANDBOX_STEP_PRESET_URL_KEYS,
  SANDBOX_STEP_QUERY_KEY,
} from "./constants";

export type NormalizeSandboxScenarioQueryInput = {
  searchParams: URLSearchParams;
  defaultScenarioId: string;
  scenarioIds: readonly string[];
  maxStepIndex: number;
  defaultPresetId: string;
  validPresetIds: readonly string[];
};

export type NormalizeSandboxScenarioQueryResult = {
  scenarioId: string;
  stepIndex: number;
  presetId: string;
  didNormalize: boolean;
  /** Canonical query string (no leading `?`). */
  canonicalQuery: string;
};

const ALLOWED = new Set<string>(SANDBOX_SCENARIO_URL_KEYS);

function clampStep(raw: string | null, maxStepIndex: number): number {
  if (raw == null) return 0;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(maxStepIndex, Math.floor(n)));
}

function buildCanonical(
  scenarioId: string,
  stepIndex: number,
  presetId: string,
): string {
  const c = new URLSearchParams();
  c.set(SANDBOX_SCENARIO_QUERY_KEY, scenarioId);
  c.set(SANDBOX_STEP_QUERY_KEY, String(stepIndex));
  c.set(SANDBOX_PRESET_QUERY_KEY, presetId);
  return c.toString();
}

/**
 * Pure normalization for sandbox scenario URL search params: known keys only,
 * valid scenario/step/preset, `automate` stripped for M1, unknown keys removed.
 */
export function normalizeSandboxScenarioQuery(
  input: NormalizeSandboxScenarioQueryInput,
): NormalizeSandboxScenarioQueryResult {
  const raw = new URLSearchParams(input.searchParams.toString());
  let didNormalize = false;

  if (raw.has(SANDBOX_AUTOMATE_QUERY_KEY)) {
    didNormalize = true;
  }
  for (const key of [...raw.keys()]) {
    if (!ALLOWED.has(key)) {
      didNormalize = true;
    }
  }

  const rawScenario = raw.get(SANDBOX_SCENARIO_QUERY_KEY);
  const scenarioId =
    rawScenario && input.scenarioIds.includes(rawScenario)
      ? rawScenario
      : input.defaultScenarioId;
  if (rawScenario !== scenarioId) {
    didNormalize = true;
  }

  const rawStep = raw.get(SANDBOX_STEP_QUERY_KEY);
  const stepIndex = clampStep(rawStep, input.maxStepIndex);
  if (rawStep !== String(stepIndex)) {
    didNormalize = true;
  }

  const rawPreset = raw.get(SANDBOX_PRESET_QUERY_KEY);
  const presetId =
    rawPreset && input.validPresetIds.includes(rawPreset)
      ? rawPreset
      : input.defaultPresetId;
  if (rawPreset !== presetId) {
    didNormalize = true;
  }

  const canonicalQuery = buildCanonical(scenarioId, stepIndex, presetId);

  return {
    scenarioId,
    stepIndex,
    presetId,
    didNormalize,
    canonicalQuery,
  };
}

const STEP_PRESET_ALLOWED = new Set<string>(SANDBOX_STEP_PRESET_URL_KEYS);

export type NormalizeStepPresetQueryInput = {
  searchParams: URLSearchParams;
  maxStepIndex: number;
  defaultPresetId: string;
  validPresetIds: readonly string[];
};

export type NormalizeStepPresetQueryResult = {
  stepIndex: number;
  presetId: string;
  didNormalize: boolean;
  canonicalQuery: string;
};

function buildStepPresetCanonical(stepIndex: number, presetId: string): string {
  const c = new URLSearchParams();
  c.set(SANDBOX_STEP_QUERY_KEY, String(stepIndex));
  c.set(SANDBOX_PRESET_QUERY_KEY, presetId);
  return c.toString();
}

/**
 * Normalizes URL for sandboxes without `scenario=` — only step + preset,
 * strips `scenario`, `automate`, and unknown keys.
 */
export function normalizeStepPresetQuery(
  input: NormalizeStepPresetQueryInput,
): NormalizeStepPresetQueryResult {
  const raw = new URLSearchParams(input.searchParams.toString());
  let didNormalize = false;

  if (raw.has(SANDBOX_AUTOMATE_QUERY_KEY)) {
    didNormalize = true;
  }
  if (raw.has(SANDBOX_SCENARIO_QUERY_KEY)) {
    didNormalize = true;
  }
  for (const key of [...raw.keys()]) {
    if (!STEP_PRESET_ALLOWED.has(key)) {
      didNormalize = true;
    }
  }

  const rawStep = raw.get(SANDBOX_STEP_QUERY_KEY);
  const stepIndex = clampStep(rawStep, input.maxStepIndex);
  if (rawStep !== String(stepIndex)) {
    didNormalize = true;
  }

  const rawPreset = raw.get(SANDBOX_PRESET_QUERY_KEY);
  const presetId =
    rawPreset && input.validPresetIds.includes(rawPreset)
      ? rawPreset
      : input.defaultPresetId;
  if (rawPreset !== presetId) {
    didNormalize = true;
  }

  const canonicalQuery = buildStepPresetCanonical(stepIndex, presetId);

  return {
    stepIndex,
    presetId,
    didNormalize,
    canonicalQuery,
  };
}
