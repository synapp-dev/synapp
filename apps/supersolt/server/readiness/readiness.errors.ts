import type {
  ReadinessBlockerDto,
  ReadinessCheckId,
  ReadinessModuleId,
} from "@/entities/readiness/model/types";

export class ReadinessBlockedError extends Error {
  readonly status = 423;
  readonly code = "venue.readiness_blocked";

  constructor(
    readonly moduleId: ReadinessModuleId,
    readonly blockers: ReadinessBlockerDto[],
  ) {
    super(`Module "${moduleId}" is not ready`);
    this.name = "ReadinessBlockedError";
  }
}

export class ReadinessServiceError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ReadinessServiceError";
  }
}

export type ReadinessCheckResults = Record<ReadinessCheckId, boolean>;
