import { describe, expect, it } from "vitest";
import { supabaseAuthErrorMessage } from "./supabase-auth-error-message";

describe("supabaseAuthErrorMessage", () => {
  it("maps invalid credentials", () => {
    expect(
      supabaseAuthErrorMessage({ message: "Invalid login credentials" })
    ).toContain("Incorrect email or password");
  });

  it("maps email not confirmed", () => {
    expect(
      supabaseAuthErrorMessage({ message: "Email not confirmed", code: "email_not_confirmed" })
    ).toContain("confirm your email");
  });

  it("maps duplicate signup", () => {
    expect(
      supabaseAuthErrorMessage({ message: "User already registered" })
    ).toContain("already exists");
  });

  it("maps rate limit", () => {
    expect(
      supabaseAuthErrorMessage({ message: "For security purposes, you can only request this after 56 seconds." })
    ).toContain("Too many attempts");
  });

  it("falls back for unknown short messages", () => {
    expect(supabaseAuthErrorMessage({ message: "Custom provider error" })).toBe(
      "Custom provider error"
    );
  });

  it("falls back for empty message", () => {
    expect(supabaseAuthErrorMessage({})).toBe("Something went wrong. Please try again.");
  });
});
