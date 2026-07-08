import { and, desc, eq, inArray } from "drizzle-orm";



import type { AppDb } from "@/server/db/create-app-db";

import { inventorySetupImportJobs } from "@/server/db/schema";

import {

  IMPORT_JOB_SELECTION_GATE,

  type ImportJobRow,

  type ImportJobStatus,

  type ImportJobStep,

  type ImportJobType,

} from "@/server/inventory-setup/inventory-setup-import-job.types";



function mapRow(row: typeof inventorySetupImportJobs.$inferSelect): ImportJobRow {

  return {

    id: row.id,

    organisationId: row.organisationId,

    venueId: row.venueId,

    createdByUserId: row.createdByUserId,

    jobType: (row.jobType as ImportJobType | null) ?? "xero",

    status: row.status as ImportJobRow["status"],

    currentStepId: row.currentStepId,

    steps: row.steps as ImportJobStep[],

    result: (row.result as Record<string, unknown> | null) ?? null,

    errorMessage: row.errorMessage,

    startedAt: row.startedAt,

    completedAt: row.completedAt,

    createdAt: row.createdAt,

    updatedAt: row.updatedAt,

  };

}



export const inventorySetupImportJobRepo = {

  async create(

    appDb: AppDb,

    args: {

      organisationId: string;

      venueId: string;

      createdByUserId: string;

      jobType?: ImportJobType;

      steps: ImportJobStep[];

    },

  ): Promise<ImportJobRow> {

    const now = new Date().toISOString();

    const rows = await appDb.admin

      .insert(inventorySetupImportJobs)

      .values({

        organisationId: args.organisationId,

        venueId: args.venueId,

        createdByUserId: args.createdByUserId,

        jobType: args.jobType ?? "xero",

        status: "pending",

        steps: args.steps,

        createdAt: now,

        updatedAt: now,

      })

      .returning();

    return mapRow(rows[0]!);

  },



  async getById(appDb: AppDb, jobId: string): Promise<ImportJobRow | null> {

    const rows = await appDb.admin

      .select()

      .from(inventorySetupImportJobs)

      .where(eq(inventorySetupImportJobs.id, jobId))

      .limit(1);

    return rows[0] ? mapRow(rows[0]) : null;

  },



  async findActiveForVenue(

    appDb: AppDb,

    args: { venueId: string; createdByUserId: string; jobType?: ImportJobType },

  ): Promise<ImportJobRow | null> {

    const conditions = [

      eq(inventorySetupImportJobs.venueId, args.venueId),

      eq(inventorySetupImportJobs.createdByUserId, args.createdByUserId),

      inArray(inventorySetupImportJobs.status, ["pending", "running"]),

    ];

    if (args.jobType) {

      conditions.push(eq(inventorySetupImportJobs.jobType, args.jobType));

    }



    const rows = await appDb.admin

      .select()

      .from(inventorySetupImportJobs)

      .where(and(...conditions))

      .orderBy(desc(inventorySetupImportJobs.createdAt))

      .limit(1);

    return rows[0] ? mapRow(rows[0]) : null;

  },



  async claimPending(appDb: AppDb, jobId: string): Promise<boolean> {

    const now = new Date().toISOString();

    const rows = await appDb.admin

      .update(inventorySetupImportJobs)

      .set({

        status: "running",

        startedAt: now,

        updatedAt: now,

      })

      .where(

        and(

          eq(inventorySetupImportJobs.id, jobId),

          eq(inventorySetupImportJobs.status, "pending"),

        ),

      )

      .returning();

    return rows.length > 0;

  },



  /**
   * Atomically leave the supplier-selection gate: only succeeds when the job is
   * still parked (`status = running`, `currentStepId = awaiting_selection`).
   * Moves to the first post-selection step (`invoices`). Guards against a
   * double-submit kicking off the scoped invoice sync + parse twice.
   */
  async claimGate(appDb: AppDb, jobId: string): Promise<boolean> {
    const now = new Date().toISOString();
    const rows = await appDb.admin
      .update(inventorySetupImportJobs)
      .set({ currentStepId: "invoices", updatedAt: now })
      .where(
        and(
          eq(inventorySetupImportJobs.id, jobId),
          eq(inventorySetupImportJobs.status, "running"),
          eq(inventorySetupImportJobs.currentStepId, IMPORT_JOB_SELECTION_GATE),
        ),
      )
      .returning();
    return rows.length > 0;
  },

  /**
   * User-requested cancel: atomically flips an in-flight job to failed with a
   * clear message. The running loop polls its own row and winds down when it
   * sees the terminal status; everything already downloaded/parsed is kept
   * (re-running skips it via stored attachments + parse fingerprints).
   */
  async cancel(appDb: AppDb, jobId: string): Promise<boolean> {
    const now = new Date().toISOString();
    const rows = await appDb.admin
      .update(inventorySetupImportJobs)
      .set({
        status: "failed",
        errorMessage: "Cancelled — everything already read has been kept.",
        completedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(inventorySetupImportJobs.id, jobId),
          inArray(inventorySetupImportJobs.status, ["pending", "running"]),
        ),
      )
      .returning();
    return rows.length > 0;
  },



  async update(

    appDb: AppDb,

    jobId: string,

    patch: {

      status?: ImportJobStatus;

      currentStepId?: string | null;

      steps?: ImportJobStep[];

      result?: Record<string, unknown> | null;

      errorMessage?: string | null;

      startedAt?: string | null;

      completedAt?: string | null;

    },

  ): Promise<ImportJobRow | null> {

    const rows = await appDb.admin

      .update(inventorySetupImportJobs)

      .set({

        ...patch,

        updatedAt: new Date().toISOString(),

      })

      .where(eq(inventorySetupImportJobs.id, jobId))

      .returning();

    return rows[0] ? mapRow(rows[0]) : null;

  },

};


