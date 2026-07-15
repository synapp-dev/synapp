/**
 * Phase 2 module gate (Workforce, Operations, Insights P&L, command menu).
 *
 * Until Phase 2 ships these modules are hidden from the sidebar, blocked at
 * the route level, and excluded from Superbot navigation suggestions. The
 * header command menu (and its Cmd/Ctrl+K shortcut) is also hidden.
 *
 * `NEXT_PUBLIC_*` env vars are inlined at build time and readable on both the
 * client (sidebar) and the server (route guards, agent tools). Unlock locally
 * or at Phase 2 launch with `NEXT_PUBLIC_PHASE2_MODULES=true`.
 *
 * When a real per-user permission system lands, grant `PHASE2_FEATURE_FLAG`
 * through `MeUser.features` instead — the sidebar already honours it.
 */
export const PHASE2_FEATURE_FLAG = "phase2-modules";

export function isPhase2ModulesEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PHASE2_MODULES === "true";
}
