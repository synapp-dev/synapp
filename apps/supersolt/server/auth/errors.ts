export class AuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** @deprecated Use AuthError — kept for imports during migration. */
export class VenueAccessError extends AuthError {}
