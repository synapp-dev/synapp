import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  WizardStage,
  WizardSubStep,
} from "@/entities/inventory-setup/model/types";

const nav = vi.hoisted(() => ({
  pathname: "/acme/richmond/settings/inventory-setup/inventory",
}));
const mutationMocks = vi.hoisted(() => ({
  mutate: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/use-prefers-reduced-motion", () => ({
  usePrefersReducedMotion: () => true,
}));

vi.mock("@/entities/inventory-setup/model/useWizardStateMutation", () => ({
  useWizardStateMutation: () => ({
    mutate: mutationMocks.mutate,
    isPending: false,
    variables: undefined,
  }),
}));

vi.mock("@/entities/ai-agent-chat/components/agent-bot-avatar-video", () => ({
  AgentBotAvatarVideo: () => <span data-testid="bot-avatar" />,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

import { SetupStageConfirmCard } from "./setup-stage-confirm-card";

function subStep(overrides: Partial<WizardSubStep>): WizardSubStep {
  return {
    key: "inventory.batchesDone",
    label: "Create your batches (or confirm you have none)",
    kind: "ack",
    complete: false,
    locked: false,
    lockReason: null,
    deepLink: null,
    stale: false,
    staleCount: 0,
    ...overrides,
  };
}

function inventoryStage(subSteps: WizardSubStep[]): WizardStage {
  return {
    id: "inventory",
    label: "Inventory",
    status: "current",
    introSeen: true,
    complete: false,
    subSteps,
  };
}

const BATCHES = subStep({
  key: "inventory.batchesDone",
  deepLink: "settings/inventory-setup/products/recipes",
});
const MASTER_LIST = subStep({
  key: "inventory.masterListReviewed",
  label: "Review your master inventory list",
  deepLink: "settings/inventory-setup/inventory/master-list",
});
const NORMALISED = subStep({
  key: "inventory.normalised",
  label: "Turn supplier items into trackable ingredients",
  kind: "derived",
  complete: true,
  deepLink: "settings/inventory-setup/inventory",
});

function renderCard(stage: WizardStage, canWrite = true) {
  return render(
    <SetupStageConfirmCard
      stage={stage}
      nextStageLabel="Products"
      organisationSlug="acme"
      venueSlug="richmond"
      canWrite={canWrite}
    />,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  nav.pathname = "/acme/richmond/settings/inventory-setup/inventory";
});

describe("SetupStageConfirmCard", () => {
  it("lists only ack sub-steps and confirms one via setSubStepAck", () => {
    renderCard(inventoryStage([NORMALISED, BATCHES, MASTER_LIST]));

    expect(
      screen.getByText(
        "2 quick confirmations left to finish Inventory. Then Products unlocks.",
      ),
    ).toBeDefined();
    expect(
      screen.queryByText("Turn supplier items into trackable ingredients"),
    ).toBeNull();

    const confirms = screen.getAllByRole("button", { name: "Confirm" });
    expect(confirms).toHaveLength(2);

    fireEvent.click(confirms[0]!);
    expect(mutationMocks.mutate).toHaveBeenCalledWith(
      { setSubStepAck: { key: "inventory.batchesDone", value: true } },
      expect.anything(),
    );
  });

  it("links to an ack's deep-link target unless already on that page", () => {
    nav.pathname =
      "/acme/richmond/settings/inventory-setup/inventory/master-list";
    renderCard(inventoryStage([BATCHES, MASTER_LIST]));

    const links = screen.getAllByRole("link", { name: /Open/ });
    expect(links).toHaveLength(1);
    expect(links[0]!.getAttribute("href")).toBe(
      "/acme/richmond/settings/inventory-setup/products/recipes",
    );
  });

  it("shows a locked ack without a confirm action", () => {
    renderCard(
      inventoryStage([
        BATCHES,
        subStep({
          key: "inventory.masterListReviewed",
          label: "Review your master inventory list",
          locked: true,
          lockReason: "Normalise your items first",
        }),
      ]),
    );

    expect(screen.getByText("Locked")).toBeDefined();
    expect(screen.getAllByRole("button", { name: "Confirm" })).toHaveLength(1);
  });

  it("undoes a completed ack", () => {
    renderCard(
      inventoryStage([subStep({ complete: true }), MASTER_LIST]),
    );

    expect(
      screen.getByText(
        "One quick confirmation left to finish Inventory. Then Products unlocks.",
      ),
    ).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(mutationMocks.mutate).toHaveBeenCalledWith(
      { setSubStepAck: { key: "inventory.batchesDone", value: false } },
      expect.anything(),
    );
  });

  it("disables confirm for read-only members", () => {
    renderCard(inventoryStage([BATCHES]), false);

    const confirm = screen.getByRole("button", { name: "Confirm" });
    expect(confirm.hasAttribute("disabled")).toBe(true);
    fireEvent.click(confirm);
    expect(mutationMocks.mutate).not.toHaveBeenCalled();
  });
});
