export type ConsumptionErrorCode =
  | "consumption.forbidden"
  | "consumption.not_found"
  | "consumption.failed"
  | "waste.forbidden"
  | "waste.not_found"
  | "waste.invalid_input"
  | "waste.unit_conversion"
  | "waste.failed";

const STATUS_BY_CODE: Record<ConsumptionErrorCode, number> = {
  "consumption.forbidden": 403,
  "consumption.not_found": 404,
  "consumption.failed": 500,
  "waste.forbidden": 403,
  "waste.not_found": 404,
  "waste.invalid_input": 400,
  "waste.unit_conversion": 400,
  "waste.failed": 500,
};

export class ConsumptionServiceError extends Error {
  status: number;
  code: ConsumptionErrorCode;

  constructor(
    code: ConsumptionErrorCode,
    message: string,
    status = STATUS_BY_CODE[code],
  ) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
