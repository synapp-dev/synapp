/**
 * Maps Supabase Auth errors to operator-facing copy (see supersolt-authentication flows).
 */
export function supabaseAuthErrorMessage(error: {
  message?: string;
  code?: string;
}): string {
  const raw = (error.message ?? "").trim();
  const lower = raw.toLowerCase();
  const code = error.code ?? "";

  if (
    lower.includes("invalid login credentials") ||
    code === "invalid_credentials" ||
    lower === "invalid email or password"
  ) {
    return "Incorrect email or password. Check your details and try again.";
  }

  if (lower.includes("email not confirmed") || code === "email_not_confirmed") {
    return "Please confirm your email using the link we sent you before signing in.";
  }

  if (
    lower.includes("already registered") ||
    lower.includes("user already registered") ||
    code === "user_already_exists"
  ) {
    return "An account with this email already exists. Try signing in instead.";
  }

  if (lower.includes("password") && lower.includes("at least")) {
    return "Use a longer password that meets the minimum length.";
  }

  if (
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("for security purposes") ||
    lower.includes("only request this after") ||
    code === "over_request_rate_limit"
  ) {
    return "Too many attempts. Wait a moment and try again.";
  }

  if (lower.includes("network") || code === "network_error") {
    return "Network error. Check your connection and try again.";
  }

  if (raw.length > 0 && raw.length < 200) {
    return raw;
  }

  return "Something went wrong. Please try again.";
}
