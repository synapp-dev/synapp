export type StockCountsErrorCode =
  | "stock_counts.forbidden"
  | "stock_counts.not_found"
  | "stock_counts.invalid_status"
  | "stock_counts.incomplete_submit"
  | "stock_counts.large_variance_owner_required"
  | "stock_counts.negative_quantity"
  | "stock_counts.locked"
  | "stock_counts.photo_upload_failed"
  | "stock_counts.concurrent_edit"
  | "stock_counts.no_ingredients"
  | "stock_counts.failed";

const STATUS_BY_CODE: Record<StockCountsErrorCode, number> = {
  "stock_counts.forbidden": 403,
  "stock_counts.not_found": 404,
  "stock_counts.invalid_status": 409,
  "stock_counts.incomplete_submit": 400,
  "stock_counts.large_variance_owner_required": 403,
  "stock_counts.negative_quantity": 400,
  "stock_counts.locked": 409,
  "stock_counts.photo_upload_failed": 502,
  "stock_counts.concurrent_edit": 409,
  "stock_counts.no_ingredients": 400,
  "stock_counts.failed": 500,
};

export class StockCountsServiceError extends Error {
  status: number;
  code: StockCountsErrorCode;

  constructor(
    code: StockCountsErrorCode,
    message: string,
    status = STATUS_BY_CODE[code],
  ) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
