/**
 * Database Error Handler Utility
 * 
 * Centralizes PostgreSQL error code handling and maps them to appropriate HTTP status codes.
 * Provides consistent error messages across API routes.
 */

type DatabaseErrorResponse = {
  status: number;
  error: string;
};

/**
 * Handles database errors and maps PostgreSQL error codes to HTTP status codes.
 * 
 * PostgreSQL Error Codes:
 * - 23505: Unique constraint violation
 * - 23503: Foreign key violation
 * - 23502: Not null violation
 * - 23514: Check constraint violation
 * 
 * @param error - The error object from database operations
 * @param defaultMessage - Optional default error message if error doesn't match known patterns
 * @returns Object with HTTP status code and error message
 */
export function handleDatabaseError(
  error: any,
  defaultMessage: string = "Database error occurred"
): DatabaseErrorResponse {
  // Check for PostgreSQL error code
  const errorCode = error?.code;
  const errorMessage = error?.message || defaultMessage;
  const errorDetail = error?.detail || "";
  const errorConstraint = error?.constraint || "";

  // Handle specific PostgreSQL error codes
  switch (errorCode) {
    case "23505": // Unique constraint violation
      // Try to extract meaningful information from constraint name or detail
      if (errorConstraint) {
        return {
          status: 409,
          error: `Duplicate entry: ${errorConstraint}`,
        };
      }
      if (errorDetail) {
        return {
          status: 409,
          error: `Duplicate entry: ${errorDetail}`,
        };
      }
      return {
        status: 409,
        error: "Duplicate entry - this record already exists",
      };

    case "23503": // Foreign key violation
      if (errorDetail) {
        return {
          status: 400,
          error: `Invalid reference: ${errorDetail}`,
        };
      }
      return {
        status: 400,
        error: "Invalid reference - related record does not exist",
      };

    case "23502": // Not null violation
      if (errorDetail) {
        return {
          status: 400,
          error: `Required field missing: ${errorDetail}`,
        };
      }
      return {
        status: 400,
        error: "Required field is missing",
      };

    case "23514": // Check constraint violation
      if (errorDetail) {
        return {
          status: 400,
          error: `Validation failed: ${errorDetail}`,
        };
      }
      return {
        status: 400,
        error: "Data validation failed",
      };

    default:
      // For non-database errors or unknown codes, preserve the original error message
      // This allows business logic errors to pass through
      return {
        status: 500,
        error: errorMessage,
      };
  }
}

/**
 * Checks if an error is a database constraint violation.
 * 
 * @param error - The error object to check
 * @returns True if the error is a constraint violation
 */
export function isDatabaseConstraintError(error: any): boolean {
  const errorCode = error?.code;
  return (
    errorCode === "23505" ||
    errorCode === "23503" ||
    errorCode === "23502" ||
    errorCode === "23514"
  );
}

/**
 * Checks if an error is a unique constraint violation.
 * 
 * @param error - The error object to check
 * @returns True if the error is a unique constraint violation
 */
export function isUniqueConstraintError(error: any): boolean {
  return error?.code === "23505";
}
