import { describe, expect, it } from "vitest";

import { SANDBOX_AUTOMATE_QUERY_KEY } from "./constants";
import {
  normalizeSandboxScenarioQuery,
  normalizeScenarioStepQuery,
  normalizeStepPresetQuery,
  readSandboxUrlState,
} from "./normalize-sandbox-scenario-query";

const scenarios = ["all-accept", "one-declines"] as const;
const presets = ["default", "quick-tour"] as const;

function n(sp: string) {
  return normalizeSandboxScenarioQuery({
    searchParams: new URLSearchParams(sp),
    defaultScenarioId: "all-accept",
    scenarioIds: scenarios,
    maxStepIndex: 6,
    defaultPresetId: "default",
    validPresetIds: presets,
  });
}

describe("normalizeSandboxScenarioQuery", () => {
  it("keeps known good triple unchanged (didNormalize false)", () => {
    const r = n("scenario=all-accept&step=2&preset=quick-tour");
    expect(r.scenarioId).toBe("all-accept");
    expect(r.stepIndex).toBe(2);
    expect(r.presetId).toBe("quick-tour");
    expect(r.didNormalize).toBe(false);
    expect(r.canonicalQuery).toBe(
      "scenario=all-accept&step=2&preset=quick-tour",
    );
  });

  it("maps unknown preset to default", () => {
    const r = n("scenario=all-accept&step=1&preset=unknown");
    expect(r.presetId).toBe("default");
    expect(r.didNormalize).toBe(true);
    expect(r.canonicalQuery).toContain("preset=default");
  });

  it("maps missing preset to default", () => {
    const r = n("scenario=all-accept&step=1");
    expect(r.presetId).toBe("default");
    expect(r.didNormalize).toBe(true);
  });

  it("clamps out-of-range step", () => {
    const r = n("scenario=all-accept&step=99&preset=default");
    expect(r.stepIndex).toBe(6);
    expect(r.didNormalize).toBe(true);
    expect(r.canonicalQuery).toContain("step=6");
  });

  it("falls back scenario and flags normalize", () => {
    const r = n("scenario=nope&step=0&preset=default");
    expect(r.scenarioId).toBe("all-accept");
    expect(r.didNormalize).toBe(true);
  });

  it("strips automate and unknown keys (didNormalize)", () => {
    const r = n(
      `scenario=all-accept&step=0&preset=default&${SANDBOX_AUTOMATE_QUERY_KEY}=1&foo=bar`,
    );
    expect(r.didNormalize).toBe(true);
    expect(r.canonicalQuery).not.toContain("automate");
    expect(r.canonicalQuery).not.toContain("foo");
  });
});

function np(sp: string) {
  return normalizeStepPresetQuery({
    searchParams: new URLSearchParams(sp),
    maxStepIndex: 6,
    defaultPresetId: "default",
    validPresetIds: presets,
  });
}

describe("normalizeStepPresetQuery", () => {
  it("canonical is step+preset only", () => {
    const r = np("step=2&preset=quick-tour");
    expect(r.didNormalize).toBe(false);
    expect(r.canonicalQuery).toBe("step=2&preset=quick-tour");
  });

  it("strips scenario and flags normalize", () => {
    const r = np("scenario=all-accept&step=1&preset=default");
    expect(r.didNormalize).toBe(true);
    expect(r.canonicalQuery).toBe("step=1&preset=default");
    expect(r.canonicalQuery).not.toContain("scenario");
  });

  it("strips automate and unknown keys", () => {
    const r = np(
      `step=0&preset=default&${SANDBOX_AUTOMATE_QUERY_KEY}=1&foo=bar`,
    );
    expect(r.didNormalize).toBe(true);
    expect(r.canonicalQuery).toBe("step=0&preset=default");
  });
});

function ns(sp: string) {
  return normalizeScenarioStepQuery({
    searchParams: new URLSearchParams(sp),
    defaultScenarioId: "all-accept",
    scenarioIds: scenarios,
    maxStepIndex: 6,
  });
}

describe("normalizeScenarioStepQuery", () => {
  it("keeps scenario+step when valid", () => {
    const r = ns("scenario=all-accept&step=2");
    expect(r.didNormalize).toBe(false);
    expect(r.canonicalQuery).toBe("scenario=all-accept&step=2");
  });

  it("strips preset and unknown keys", () => {
    const r = ns("scenario=all-accept&step=1&preset=default&foo=bar");
    expect(r.didNormalize).toBe(true);
    expect(r.canonicalQuery).toBe("scenario=all-accept&step=1");
  });
});

describe("readSandboxUrlState", () => {
  it("routes PUG-style sandboxes through step+preset normalizer", () => {
    const r = readSandboxUrlState({
      searchParams: new URLSearchParams("step=2&preset=quick-tour"),
      scenarioIds: [],
      defaultScenarioId: "",
      maxStepIndex: 6,
      presetIds: presets,
      defaultPresetId: "default",
    });
    expect(r.scenarioId).toBe("");
    expect(r.stepIndex).toBe(2);
    expect(r.presetId).toBe("quick-tour");
    expect(r.didNormalize).toBe(false);
  });

  it("routes onboarding-style sandboxes through scenario+preset normalizer", () => {
    const r = readSandboxUrlState({
      searchParams: new URLSearchParams(
        "scenario=all-accept&step=1&preset=default",
      ),
      scenarioIds: scenarios,
      defaultScenarioId: "all-accept",
      maxStepIndex: 6,
      presetIds: presets,
      defaultPresetId: "default",
    });
    expect(r.scenarioId).toBe("all-accept");
    expect(r.stepIndex).toBe(1);
    expect(r.presetId).toBe("default");
  });
});
