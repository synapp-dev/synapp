/**
 * Shared client loader + typings for the SoundCloud HTML5 Widget API.
 *
 * The script (`w.soundcloud.com/player/api.js`) exposes `window.SC.Widget`,
 * which wraps an embedded player iframe and lets the parent page control it
 * (play/pause/seek/volume) and read the current sound. No API key or login is
 * required. See https://developers.soundcloud.com/docs/api/html5-widget.
 *
 * We load it once and share the promise so multiple players reuse one script.
 */

export interface ScSound {
  title?: string;
  /** Artwork URL (often the `-large` 100x100 variant; upscale before display). */
  artwork_url?: string | null;
  user?: { username?: string };
}

export interface ScWidget {
  bind(event: string, listener: (e?: unknown) => void): void;
  unbind(event: string): void;
  play(): void;
  pause(): void;
  toggle(): void;
  seekTo(ms: number): void;
  setVolume(volume: number): void;
  getCurrentSound(callback: (sound: ScSound | null) => void): void;
  isPaused(callback: (paused: boolean) => void): void;
}

export interface ScWidgetEvents {
  READY: string;
  PLAY: string;
  PAUSE: string;
  FINISH: string;
  PLAY_PROGRESS: string;
  [key: string]: string;
}

export interface ScWidgetApi {
  (el: HTMLIFrameElement): ScWidget;
  Events: ScWidgetEvents;
}

declare global {
  interface Window {
    SC?: { Widget: ScWidgetApi };
  }
}

const SC_API_SRC = "https://w.soundcloud.com/player/api.js";
let scLoader: Promise<ScWidgetApi> | null = null;

export function loadSoundcloudApi(): Promise<ScWidgetApi> {
  if (typeof window === "undefined")
    return Promise.reject(new Error("no window"));
  if (window.SC?.Widget) return Promise.resolve(window.SC.Widget);
  if (!scLoader) {
    scLoader = new Promise<ScWidgetApi>((resolve, reject) => {
      const done = () =>
        window.SC?.Widget
          ? resolve(window.SC.Widget)
          : reject(new Error("SoundCloud API unavailable"));
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${SC_API_SRC}"]`,
      );
      if (existing) {
        existing.addEventListener("load", done);
        existing.addEventListener("error", () =>
          reject(new Error("load error")),
        );
        return;
      }
      const script = document.createElement("script");
      script.src = SC_API_SRC;
      script.async = true;
      script.onload = done;
      script.onerror = () => reject(new Error("load error"));
      document.body.appendChild(script);
    });
  }
  return scLoader;
}
