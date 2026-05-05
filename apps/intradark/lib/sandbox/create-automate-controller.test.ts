import { afterEach, describe, expect, it, vi } from "vitest";

import { createAutomateController } from "./create-automate-controller";

describe("createAutomateController", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs steps in order then completes", () => {
    vi.useFakeTimers();
    const runs: string[] = [];
    const c = createAutomateController({
      steps: [
        { delayMs: 10, run: () => runs.push("a") },
        { delayMs: 20, run: () => runs.push("b") },
      ],
      onComplete: () => runs.push("done"),
    });
    c.start();
    expect(c.state).toBe("running");
    vi.advanceTimersByTime(10);
    expect(runs).toEqual(["a"]);
    vi.advanceTimersByTime(20);
    expect(runs).toEqual(["a", "b", "done"]);
    expect(c.state).toBe("idle");
  });

  it("cancel clears pending work and manual interrupt stops callbacks", () => {
    vi.useFakeTimers();
    const runs: string[] = [];
    const c = createAutomateController({
      steps: [
        { delayMs: 10, run: () => runs.push("a") },
        { delayMs: 100, run: () => runs.push("b") },
      ],
    });
    c.start();
    vi.advanceTimersByTime(10);
    expect(runs).toEqual(["a"]);
    c.cancel();
    vi.runAllTimers();
    expect(runs).toEqual(["a"]);
    expect(c.state).toBe("idle");
  });

  it("dispose clears timers like cancel", () => {
    vi.useFakeTimers();
    const runs: string[] = [];
    const c = createAutomateController({
      steps: [{ delayMs: 50, run: () => runs.push("x") }],
    });
    c.start();
    c.dispose();
    vi.runAllTimers();
    expect(runs).toEqual([]);
  });

  it("start accepts override steps", () => {
    vi.useFakeTimers();
    const runs: string[] = [];
    const c = createAutomateController({ steps: [] });
    c.start([{ delayMs: 5, run: () => runs.push("x") }]);
    vi.advanceTimersByTime(5);
    expect(runs).toEqual(["x"]);
    expect(c.state).toBe("idle");
  });

  it("onError cancels and does not run later steps", () => {
    vi.useFakeTimers();
    const runs: string[] = [];
    const c = createAutomateController({
      steps: [
        { delayMs: 10, run: () => runs.push("a") },
        {
          delayMs: 10,
          run: () => {
            throw new Error("boom");
          },
        },
        { delayMs: 10, run: () => runs.push("c") },
      ],
      onError: () => runs.push("err"),
    });
    c.start();
    vi.advanceTimersByTime(10);
    expect(runs).toEqual(["a"]);
    vi.advanceTimersByTime(10);
    expect(runs).toEqual(["a", "err"]);
    vi.advanceTimersByTime(50);
    expect(runs).not.toContain("c");
    expect(c.state).toBe("idle");
  });
});
