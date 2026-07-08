/**
 * Thin Tauri bridge. All `invoke`/`listen` calls funnel through here so the UI can
 * also run in a plain browser (`pnpm dev`) with graceful fallbacks.
 */
import type { Environment } from "./environment";

export function inTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export type ProcessEntry = { name: string; path: string | null; sha256: string | null };
export type DriverEntry = { name: string; path: string | null; state: string | null };
export type SystemInventory = { processes: ProcessEntry[]; drivers: DriverEntry[] };

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

/**
 * HTTP for the AC backend. In the Tauri shell this goes through the native HTTP
 * plugin (Rust-side request) so it bypasses the webview's CORS + CSP entirely. In a
 * plain browser (dev) it falls back to global fetch.
 */
export async function acFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  if (!inTauri()) return fetch(input, init);
  const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
  return tauriFetch(input, init);
}

export async function getEnvironment(): Promise<Environment> {
  if (!inTauri()) {
    return { tpmPresent: true, secureBoot: true, iommu: true, vbs: false, osBuild: "dev" };
  }
  return invoke<Environment>("get_environment");
}

export async function detectGame(): Promise<boolean> {
  if (!inTauri()) return false;
  return invoke<boolean>("detect_game");
}

export async function scanSystem(): Promise<SystemInventory> {
  if (!inTauri()) return { processes: [], drivers: [] };
  return invoke<SystemInventory>("scan_system");
}

export async function getDeviceToken(): Promise<string | null> {
  if (!inTauri()) return null;
  return (await invoke<string | null>("get_device_token")) ?? null;
}

export async function saveDeviceToken(token: string): Promise<void> {
  if (!inTauri()) return;
  await invoke("save_device_token", { token });
}

export async function clearDeviceToken(): Promise<void> {
  if (!inTauri()) return;
  await invoke("clear_device_token");
}

/** The deep-link URL the app was launched with (cold-start pairing), or null. */
export async function getLaunchUrl(): Promise<string | null> {
  if (!inTauri()) return null;
  return (await invoke<string | null>("get_launch_url")) ?? null;
}

/** Open an http(s) URL in the default browser (falls back to window.open in dev). */
export async function openExternal(url: string): Promise<void> {
  if (!inTauri()) {
    window.open(url, "_blank", "noopener");
    return;
  }
  await invoke("open_url", { url });
}

/** Subscribe to deep-link URLs forwarded from Rust. Returns an unsubscribe fn. */
export async function onDeepLink(cb: (url: string) => void): Promise<() => void> {
  if (!inTauri()) return () => {};
  const { listen } = await import("@tauri-apps/api/event");
  const unlisten = await listen<string>("deep-link", (e) => cb(e.payload));
  return unlisten;
}
