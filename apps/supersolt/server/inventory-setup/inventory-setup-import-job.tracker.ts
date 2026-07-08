import type { AppDb } from "@/server/db/create-app-db";

import { inventorySetupImportJobRepo } from "@/server/inventory-setup/inventory-setup-import-job.repo";

import {

  IMPORT_JOB_SELECTION_GATE,

  type ImportJobStatus,

  type ImportJobStep,

  type ImportJobStepId,

  type ImportJobStepProgress,

} from "@/server/inventory-setup/inventory-setup-import-job.types";



export class InventorySetupImportJobTracker {

  private steps: ImportJobStep[];



  constructor(

    private readonly appDb: AppDb,

    private readonly jobId: string,

    initialSteps: ImportJobStep[],

  ) {

    this.steps = structuredClone(initialSteps);

  }



  private async persist(args: {

    status?: ImportJobStatus;

    currentStepId?: string | null;

    result?: Record<string, unknown> | null;

    errorMessage?: string | null;

    startedAt?: string | null;

    completedAt?: string | null;

  }): Promise<void> {

    await inventorySetupImportJobRepo.update(this.appDb, this.jobId, {

      ...args,

      steps: this.steps,

    });

  }



  async start(): Promise<boolean> {

    return inventorySetupImportJobRepo.claimPending(this.appDb, this.jobId);

  }



  async beginStep(stepId: ImportJobStepId): Promise<void> {

    this.steps = this.steps.map((step) =>

      step.id === stepId

        ? { ...step, status: "running", detail: null, progress: null, summary: null }

        : step,

    );

    await this.persist({ currentStepId: stepId });

  }



  async updateStepDetail(

    stepId: ImportJobStepId,

    detail: string,

    progress?: ImportJobStepProgress,

  ): Promise<void> {

    this.steps = this.steps.map((step) =>

      step.id === stepId ? { ...step, detail, progress: progress ?? step.progress } : step,

    );

    await this.persist({});

  }



  async completeStep(stepId: ImportJobStepId, summary?: string): Promise<void> {

    this.steps = this.steps.map((step) =>

      step.id === stepId

        ? {

            ...step,

            status: "complete",

            detail: null,

            progress: null,

            summary: summary ?? step.summary ?? null,

          }

        : step,

    );

    await this.persist({});

  }



  async skipStep(stepId: ImportJobStepId, summary?: string): Promise<void> {

    this.steps = this.steps.map((step) =>

      step.id === stepId

        ? {

            ...step,

            status: "skipped",

            detail: null,

            progress: null,

            summary: summary ?? "Skipped",

          }

        : step,

    );

    await this.persist({});

  }



  async failStep(stepId: ImportJobStepId, message: string): Promise<void> {

    this.steps = this.steps.map((step) =>

      step.id === stepId

        // Keep `progress` — its diagnostic event log is exactly what the user
        // needs to see when a step dies.
        ? { ...step, status: "failed", detail: message }

        : step,

    );

    await this.persist({});

  }



  /**
   * Park the job at the supplier-selection gate: suppliers + invoices are done,
   * but parsing is deferred until the user picks inventory suppliers. The job
   * stays `running`; only `currentStepId` + an interim `result` are persisted.
   */
  async pauseForSelection(result: Record<string, unknown>): Promise<void> {
    await this.persist({
      currentStepId: IMPORT_JOB_SELECTION_GATE,
      result,
    });
  }



  async complete(result: Record<string, unknown>): Promise<void> {

    await this.persist({

      status: "completed",

      currentStepId: null,

      result,

      completedAt: new Date().toISOString(),

    });

  }



  async fail(message: string, result?: Record<string, unknown> | null): Promise<void> {

    await this.persist({

      status: "failed",

      errorMessage: message,

      result: result ?? null,

      completedAt: new Date().toISOString(),

    });

  }

}


