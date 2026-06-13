import { describe, expect, it } from "vitest";
import { wizardStatePatchSchema } from "@/server/inventory-setup/wizard-state.schemas";
import { WIZARD_ACK_KEYS } from "@/server/inventory-setup/wizard-model";

describe("wizardStatePatchSchema", () => {
  it("accepts a valid markIntroSeen patch", () => {
    expect(
      wizardStatePatchSchema.safeParse({ markIntroSeen: "suppliers" }).success,
    ).toBe(true);
  });

  it("accepts a valid sub-step ack", () => {
    expect(
      wizardStatePatchSchema.safeParse({
        setSubStepAck: {
          key: WIZARD_ACK_KEYS.productsModifiersConfirmed,
          value: true,
        },
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown stage id", () => {
    expect(
      wizardStatePatchSchema.safeParse({ markIntroSeen: "kitchen" }).success,
    ).toBe(false);
  });

  it("rejects an unknown ack key", () => {
    expect(
      wizardStatePatchSchema.safeParse({
        setSubStepAck: { key: "suppliers.unknown", value: true },
      }).success,
    ).toBe(false);
  });

  it("rejects an empty patch with no action", () => {
    expect(wizardStatePatchSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a markWelcomeSeen patch", () => {
    expect(
      wizardStatePatchSchema.safeParse({ markWelcomeSeen: true }).success,
    ).toBe(true);
    expect(
      wizardStatePatchSchema.safeParse({ markWelcomeSeen: false }).success,
    ).toBe(true);
  });
});
