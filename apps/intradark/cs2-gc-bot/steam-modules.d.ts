// The Steam libraries used by the GC bot worker do not ship first-class TS
// types we depend on. The worker treats them as untyped; runtime behavior is
// covered by the docs/features/players-directory-profiles tdd (bot mocked).
declare module "steam-user";
declare module "globaloffensive";
declare module "steam-totp";
