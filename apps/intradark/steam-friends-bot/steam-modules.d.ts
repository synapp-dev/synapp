// The Steam libraries used by the friends bot worker don't ship the first-class
// TS types we depend on. The worker treats them as untyped; behavior is exercised
// at runtime. Mirrors cs2-gc-bot/steam-modules.d.ts.
declare module "steam-user";
declare module "steam-totp";
