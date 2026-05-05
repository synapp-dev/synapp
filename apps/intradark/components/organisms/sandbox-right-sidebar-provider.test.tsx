import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  SandboxRightSidebarProvider,
  useRegisterSandboxRightSidebar,
  useSandboxRightSidebar,
} from "./sandbox-right-sidebar-provider";

afterEach(() => {
  cleanup();
});

function MountHost() {
  const { setSidebarMountElement } = useSandboxRightSidebar();
  return <div ref={setSidebarMountElement} data-testid="mount-host" />;
}

function Registrar({ label }: { label: string }) {
  return (
    useRegisterSandboxRightSidebar(
      () => <span data-testid="reg">{label}</span>,
      [label],
    ) ?? null
  );
}

describe("SandboxRightSidebarProvider", () => {
  it("portals registrar content into the mount host", () => {
    render(
      <SandboxRightSidebarProvider>
        <MountHost />
        <Registrar label="hello" />
      </SandboxRightSidebarProvider>,
    );
    expect(screen.getByTestId("mount-host").textContent).toBe("hello");
  });

  it("clears portal content when registrar unmounts", () => {
    const { rerender } = render(
      <SandboxRightSidebarProvider>
        <MountHost />
        <Registrar label="hello" />
      </SandboxRightSidebarProvider>,
    );
    expect(screen.getByTestId("mount-host").textContent).toBe("hello");

    rerender(
      <SandboxRightSidebarProvider>
        <MountHost />
      </SandboxRightSidebarProvider>,
    );
    expect(screen.getByTestId("mount-host").textContent).toBe("");
  });
});
