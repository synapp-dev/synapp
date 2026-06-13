export type OAuthPopupProvider = "square" | "xero";

export type OAuthPopupResult =
  | { status: "connected"; provider: OAuthPopupProvider }
  | {
      status: "error";
      provider: OAuthPopupProvider;
      code: string;
      detail?: string;
    };

export const OAUTH_POPUP_MESSAGE_TYPE = "supersolt:oauth-popup" as const;

/** Used when window.opener is cleared after the OAuth provider redirect. */
export const OAUTH_POPUP_BROADCAST_CHANNEL = "supersolt-oauth-popup" as const;

export const OAUTH_POPUP_STORAGE_KEY = "supersolt:oauth-popup-result" as const;

export type OAuthPopupMessage = OAuthPopupResult & {
  type: typeof OAUTH_POPUP_MESSAGE_TYPE;
};

export function buildSetupOAuthBridgePath(
  provider: OAuthPopupProvider,
  setupStep: number,
): string {
  const params = new URLSearchParams({
    provider,
    step: String(setupStep),
  });
  return `/setup/oauth-bridge?${params.toString()}`;
}

export function buildSetupOAuthAuthorizeHref(
  provider: OAuthPopupProvider,
  setupStep: number,
  organisationSlug: string,
  venueSlug: string,
): string {
  const api =
    provider === "square"
      ? "/api/square/oauth/authorize"
      : "/api/xero/oauth/authorize";
  const query = new URLSearchParams({
    organisation: organisationSlug,
    venue: venueSlug,
    next: buildSetupOAuthBridgePath(provider, setupStep),
  });
  return `${api}?${query.toString()}`;
}

/** Notify the opener (setup page) and close when this window is the OAuth popup. */
export function completeOAuthPopupFromChild(
  result: OAuthPopupResult,
): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const isPopup =
    window.name === "supersolt-oauth" ||
    Boolean(window.opener && window.opener !== window);
  if (!isPopup) {
    return false;
  }

  const message: OAuthPopupMessage = {
    type: OAUTH_POPUP_MESSAGE_TYPE,
    ...result,
  };

  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(message, window.location.origin);
    }
  } catch {
    /* opener may be cross-origin or detached */
  }

  try {
    const channel = new BroadcastChannel(OAUTH_POPUP_BROADCAST_CHANNEL);
    channel.postMessage(message);
    channel.close();
  } catch {
    /* ignore */
  }

  try {
    sessionStorage.setItem(OAUTH_POPUP_STORAGE_KEY, JSON.stringify(message));
  } catch {
    /* ignore */
  }

  window.close();
  return true;
}

function isOAuthPopupMessage(data: unknown): data is OAuthPopupMessage {
  if (!data || typeof data !== "object") {
    return false;
  }
  const msg = data as OAuthPopupMessage;
  if (msg.type !== OAUTH_POPUP_MESSAGE_TYPE) {
    return false;
  }
  if (msg.provider !== "square" && msg.provider !== "xero") {
    return false;
  }
  if (msg.status === "connected") {
    return true;
  }
  if (msg.status === "error" && typeof msg.code === "string") {
    return true;
  }
  return false;
}

export type OpenOAuthPopupOptions = {
  /** Called when the popup reports success or error (before close). */
  onResult: (result: OAuthPopupResult) => void;
  /** Popup closed without a result (user dismissed the window). */
  onCancel?: () => void;
  /** Popup could not open (blocker); caller may fall back to full navigation. */
  onBlocked?: () => void;
};

const POPUP_FEATURES =
  "popup=yes,width=520,height=720,left=100,top=100,resizable=yes,scrollbars=yes";

/**
 * Opens OAuth in a centered popup. The callback should redirect to
 * `/setup/oauth-bridge`, which postMessages the opener and closes.
 */
function readOAuthPopupResultFromStorage(): OAuthPopupMessage | null {
  try {
    const raw = sessionStorage.getItem(OAUTH_POPUP_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    sessionStorage.removeItem(OAUTH_POPUP_STORAGE_KEY);
    const parsed: unknown = JSON.parse(raw);
    return isOAuthPopupMessage(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function openOAuthPopup(
  authorizeUrl: string,
  options: OpenOAuthPopupOptions,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.removeItem(OAUTH_POPUP_STORAGE_KEY);
  } catch {
    /* ignore */
  }

  const popup = window.open(authorizeUrl, "supersolt-oauth", POPUP_FEATURES);
  if (!popup) {
    options.onBlocked?.();
    return;
  }

  let settled = false;
  let broadcastChannel: BroadcastChannel | null = null;

  const finish = (handler: () => void) => {
    if (settled) {
      return;
    }
    settled = true;
    window.clearInterval(closePoll);
    window.clearInterval(storagePoll);
    window.removeEventListener("message", onMessage);
    broadcastChannel?.close();
    broadcastChannel = null;
    handler();
  };

  const handleResult = (result: OAuthPopupMessage) => {
    finish(() => {
      options.onResult(result);
      try {
        popup.close();
      } catch {
        /* popup may already be closed */
      }
    });
  };

  const onMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) {
      return;
    }
    if (!isOAuthPopupMessage(event.data)) {
      return;
    }
    handleResult(event.data);
  };

  window.addEventListener("message", onMessage);

  try {
    broadcastChannel = new BroadcastChannel(OAUTH_POPUP_BROADCAST_CHANNEL);
    broadcastChannel.onmessage = (event: MessageEvent) => {
      if (!isOAuthPopupMessage(event.data)) {
        return;
      }
      handleResult(event.data);
    };
  } catch {
    broadcastChannel = null;
  }

  const storagePoll = window.setInterval(() => {
    const stored = readOAuthPopupResultFromStorage();
    if (stored) {
      handleResult(stored);
    }
  }, 250);

  const closePoll = window.setInterval(() => {
    if (!popup.closed) {
      return;
    }
    const stored = readOAuthPopupResultFromStorage();
    if (stored) {
      handleResult(stored);
      return;
    }
    finish(() => {
      options.onCancel?.();
    });
  }, 400);
}
