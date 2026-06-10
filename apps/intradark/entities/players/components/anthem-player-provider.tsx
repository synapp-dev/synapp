"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  anthemProvider,
  soundcloudEmbedParts,
} from "@/entities/players/lib/anthem";
import {
  loadSoundcloudApi,
  type ScWidget,
  type ScWidgetApi,
} from "@/entities/players/lib/soundcloud-widget";

/** Volume fade-in (0-100 scale): ramp from 1 → 10 over 5s when playback starts. */
const FADE_FROM = 1;
const FADE_TO = 10;
const FADE_MS = 2_000;
const FADE_STEP_MS = 80;

/** SoundCloud serves a small `-large` (100x100) artwork; bump to a crisper size. */
function upscaleArtwork(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace("-large", "-t200x200");
}

interface AnthemPlayerState {
  /** True when a controllable (SoundCloud) anthem is registered. */
  hasAnthem: boolean;
  /**
   * True once the SoundCloud widget has fired `READY` for the current anthem
   * (loaded and primed).
   */
  isAnthemReady: boolean;
  /**
   * True once the SoundCloud widget has fired `PLAY` for the current anthem
   * (audio is actually playing). Resets when the anthem changes.
   */
  hasStartedPlaying: boolean;
  /**
   * True after a user gesture unlocked the profile reveal while autoplay was
   * still blocked (movement, click, keypress, etc.).
   */
  gestureRevealUnlocked: boolean;
  isPlaying: boolean;
  artwork: string | null;
  title: string;
  artist: string;
  /**
   * True while the profile's anthem card is on screen. The compact header
   * control hides itself when this is true so the player only shows in one
   * place at a time.
   */
  cardVisible: boolean;
  /** Toggle play/pause on the shared player. */
  toggle: () => void;
  /**
   * Register (or clear with null) the current page's anthem. The provider owns a
   * single hidden SoundCloud iframe, so whichever profile is mounted drives it.
   */
  setAnthem: (canonicalUrl: string | null) => void;
  /** Report whether the anthem card is currently visible in the viewport. */
  setCardVisible: (visible: boolean) => void;
}

const AnthemPlayerContext = createContext<AnthemPlayerState | null>(null);

export function useAnthemPlayer(): AnthemPlayerState {
  const ctx = useContext(AnthemPlayerContext);
  if (!ctx) {
    throw new Error(
      "useAnthemPlayer must be used within an AnthemPlayerProvider",
    );
  }
  return ctx;
}

/**
 * Owns the one hidden SoundCloud player for the app shell. Any number of
 * controllers (the profile's anthem card, the app header) read the same state
 * and call `toggle()`, so playback stays in sync wherever it's controlled.
 * Spotify anthems aren't controllable headlessly, so they're ignored here.
 */
export function AnthemPlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [anthemUrl, setAnthemUrl] = useState<string | null>(null);
  const [isAnthemReady, setIsAnthemReady] = useState(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [gestureRevealUnlocked, setGestureRevealUnlocked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [artwork, setArtwork] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  // Default to true so the header control stays hidden until the card reports
  // it has scrolled out of view (avoids a flash on initial load).
  const [cardVisible, setCardVisible] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const widgetRef = useRef<ScWidget | null>(null);
  const attemptPlayRef = useRef<() => void>(() => {});
  const isAnthemReadyRef = useRef(false);
  const hasStartedPlayingRef = useRef(false);

  useEffect(() => {
    isAnthemReadyRef.current = isAnthemReady;
  }, [isAnthemReady]);

  useEffect(() => {
    hasStartedPlayingRef.current = hasStartedPlaying;
  }, [hasStartedPlaying]);

  const attemptPlay = useCallback(() => {
    const widget = widgetRef.current;
    if (!widget) return;
    widget.isPaused((paused) => {
      if (paused) widget.play();
    });
  }, []);

  const setAnthem = useCallback((canonicalUrl: string | null) => {
    const next =
      canonicalUrl && anthemProvider(canonicalUrl) === "soundcloud"
        ? canonicalUrl
        : null;
    setAnthemUrl(next);
  }, []);

  const parts = anthemUrl ? soundcloudEmbedParts(anthemUrl) : null;
  const startSeconds = parts?.startSeconds ?? null;
  const src = parts
    ? `https://w.soundcloud.com/player/?${new URLSearchParams({
        url: parts.url,
        auto_play: "true",
        buying: "false",
        sharing: "false",
        download: "false",
        show_artwork: "true",
        visual: "false",
      }).toString()}`
    : "";

  useEffect(() => {
    if (!anthemUrl || !iframeRef.current) return;
    const startMs = startSeconds ? startSeconds * 1000 : 0;
    let widget: ScWidget | null = null;
    let events: ScWidgetApi["Events"] | null = null;
    let cancelled = false;
    let didSeek = false;
    let didFade = false;
    let fadeTimer: ReturnType<typeof setInterval> | null = null;

    setIsAnthemReady(false);
    setHasStartedPlaying(false);
    setGestureRevealUnlocked(false);
    setIsPlaying(false);
    attemptPlayRef.current = () => {};
    setArtwork(null);
    setTitle("");
    setArtist("");

    const seekOnce = () => {
      if (startMs > 0 && !didSeek) {
        didSeek = true;
        widget?.seekTo(startMs);
      }
    };

    // Ease the volume in from FADE_FROM → FADE_TO over FADE_MS so the track
    // doesn't slam in at full level. Runs once, when playback first starts.
    const startFade = () => {
      if (didFade) return;
      didFade = true;
      const startedAt = Date.now();
      widget?.setVolume(FADE_FROM);
      fadeTimer = setInterval(() => {
        const t = Math.min(1, (Date.now() - startedAt) / FADE_MS);
        widget?.setVolume(Math.round(FADE_FROM + (FADE_TO - FADE_FROM) * t));
        if (t >= 1 && fadeTimer) {
          clearInterval(fadeTimer);
          fadeTimer = null;
        }
      }, FADE_STEP_MS);
    };

    loadSoundcloudApi()
      .then((Widget) => {
        if (cancelled || !iframeRef.current) return;
        events = Widget.Events;
        widget = Widget(iframeRef.current);
        widgetRef.current = widget;

        widget.bind(events.READY, () => {
          if (cancelled) return;
          widget?.setVolume(FADE_FROM);
          seekOnce();
          widget?.getCurrentSound((sound) => {
            if (cancelled || !sound) return;
            setArtwork(upscaleArtwork(sound.artwork_url));
            setTitle(sound.title ?? "");
            setArtist(sound.user?.username ?? "");
          });
          attemptPlayRef.current = () => {
            if (cancelled) return;
            widget?.isPaused((paused) => {
              if (paused) widget?.play();
            });
          };
          setIsAnthemReady(true);
          // Autoplay may be blocked until a user gesture; try immediately anyway.
          attemptPlayRef.current();
        });
        widget.bind(events.PLAY, () => {
          if (cancelled) return;
          seekOnce();
          startFade();
          setIsPlaying(true);
          setHasStartedPlaying(true);
        });
        widget.bind(events.PAUSE, () => !cancelled && setIsPlaying(false));
        widget.bind(events.FINISH, () => !cancelled && setIsPlaying(false));
      })
      .catch(() => {
        // Widget API failed to load; nothing to control.
      });

    return () => {
      cancelled = true;
      if (fadeTimer) clearInterval(fadeTimer);
      if (widget && events) {
        try {
          widget.unbind(events.READY);
          widget.unbind(events.PLAY);
          widget.unbind(events.PAUSE);
          widget.unbind(events.FINISH);
        } catch {
          // ignore teardown errors
        }
      }
      widgetRef.current = null;
    };
  }, [anthemUrl, startSeconds]);

  // Chrome may suspend autoplay until user activation; retry on page input only
  // while playback has never started. Listeners are removed once `PLAY` fires so
  // pausing or finishing the track isn't undone by mouse movement.
  // See https://developer.chrome.com/blog/autoplay/#web_audio
  useEffect(() => {
    if (!anthemUrl || hasStartedPlaying) return;

    let lastMouseMoveAttempt = 0;

    const unlockRevealIfBlocked = () => {
      if (isAnthemReadyRef.current && !hasStartedPlayingRef.current) {
        setGestureRevealUnlocked(true);
      }
    };

    const unlockFromGesture = () => {
      unlockRevealIfBlocked();
      attemptPlayRef.current();
      attemptPlay();
    };

    const unlockFromMouseMove = () => {
      const now = Date.now();
      if (now - lastMouseMoveAttempt < 400) return;
      lastMouseMoveAttempt = now;
      unlockRevealIfBlocked();
      attemptPlayRef.current();
      attemptPlay();
    };

    window.addEventListener("pointerdown", unlockFromGesture, {
      capture: true,
      passive: true,
    });
    window.addEventListener("keydown", unlockFromGesture, { capture: true });
    window.addEventListener("touchstart", unlockFromGesture, {
      capture: true,
      passive: true,
    });
    window.addEventListener("click", unlockFromGesture, {
      capture: true,
      passive: true,
    });
    window.addEventListener("mousemove", unlockFromMouseMove, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", unlockFromGesture, {
        capture: true,
      });
      window.removeEventListener("keydown", unlockFromGesture, { capture: true });
      window.removeEventListener("touchstart", unlockFromGesture, {
        capture: true,
      });
      window.removeEventListener("click", unlockFromGesture, { capture: true });
      window.removeEventListener("mousemove", unlockFromMouseMove);
    };
  }, [anthemUrl, attemptPlay, hasStartedPlaying]);

  const toggle = useCallback(() => widgetRef.current?.toggle(), []);

  return (
    <AnthemPlayerContext.Provider
      value={{
        hasAnthem: !!anthemUrl,
        isAnthemReady,
        hasStartedPlaying,
        gestureRevealUnlocked,
        isPlaying,
        artwork,
        title,
        artist,
        cardVisible,
        toggle,
        setAnthem,
        setCardVisible,
      }}
    >
      {children}
      {anthemUrl ? (
        // Hidden audio host: the real SoundCloud player, kept in the DOM (not
        // display:none) so audio can play, but visually collapsed.
        <div
          className="pointer-events-none fixed h-0 w-0 overflow-hidden opacity-0"
          aria-hidden
        >
          <iframe
            key={anthemUrl}
            ref={iframeRef}
            title="SoundCloud anthem"
            src={src}
            width={1}
            height={1}
            allow="autoplay; encrypted-media"
          />
        </div>
      ) : null}
    </AnthemPlayerContext.Provider>
  );
}
