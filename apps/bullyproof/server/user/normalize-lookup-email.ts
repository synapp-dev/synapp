export function normalizeLookupEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isEmailExistsAuthError(error: {
  message?: string;
  code?: string;
  status?: number;
}): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "email_exists" ||
    error.status === 422 ||
    message.includes("already been registered") ||
    message.includes("already registered") ||
    message.includes("email address has already been registered")
  );
}
