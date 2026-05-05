export type AutomateRunState = "idle" | "running";

export type AutomateController = {
  readonly state: AutomateRunState;
  start: (overrideSteps?: readonly StepSpec[]) => void;
  cancel: () => void;
  dispose: () => void;
};

type StepSpec = { delayMs: number; run: () => void };

/**
 * Minimal timer-based automate runner: cancel clears pending timeouts;
 * dispose is alias for cancel (hard teardown on unmount).
 */
export function createAutomateController(opts: {
  steps: readonly StepSpec[];
  onComplete?: () => void;
  onError?: (err: unknown) => void;
  onState?: (s: AutomateRunState) => void;
}): AutomateController {
  let state: AutomateRunState = "idle";
  const timeoutIds: ReturnType<typeof setTimeout>[] = [];

  const notify = () => {
    opts.onState?.(state);
  };

  const clearTimers = () => {
    for (const id of timeoutIds) {
      clearTimeout(id);
    }
    timeoutIds.length = 0;
  };

  const cancel = () => {
    clearTimers();
    if (state === "running") {
      state = "idle";
      notify();
    }
  };

  const dispose = () => {
    cancel();
  };

  const start = (overrideSteps?: readonly StepSpec[]) => {
    cancel();
    state = "running";
    notify();

    let t = 0;
    const steps = overrideSteps ?? opts.steps;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
      const isLast = i === steps.length - 1;
      t += step.delayMs;
      const id = setTimeout(() => {
        if (state !== "running") return;
        try {
          step.run();
        } catch (e) {
          opts.onError?.(e);
          cancel();
          return;
        }
        if (isLast) {
          clearTimers();
          state = "idle";
          notify();
          opts.onComplete?.();
        }
      }, t);
      timeoutIds.push(id);
    }

    if (steps.length === 0) {
      state = "idle";
      notify();
      opts.onComplete?.();
    }
  };

  return {
    get state() {
      return state;
    },
    start,
    cancel,
    dispose,
  };
}
