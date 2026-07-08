/**
 * When true, the sidebar shows everything regardless of account state:
 * - skips the "Setup"-only collapse (needsSetup / incomplete onboarding)
 * - ignores readiness/account-setup gating so every module (Stock Management,
 *   etc.) renders unlocked
 *
 * RBAC controls (roles, feature flags, settings access) still apply. Local
 * testing only. Set in `.env.local`: NEXT_PUBLIC_DEV_FULL_SIDEBAR_UNLOCK=true
 */
export function isFullSidebarUnlockedForDev(): boolean {
  return process.env.NEXT_PUBLIC_DEV_FULL_SIDEBAR_UNLOCK === "true";
}
