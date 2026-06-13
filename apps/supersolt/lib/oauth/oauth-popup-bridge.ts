import {
  OAUTH_POPUP_BROADCAST_CHANNEL,
  OAUTH_POPUP_MESSAGE_TYPE,
  OAUTH_POPUP_STORAGE_KEY,
  type OAuthPopupMessage,
  type OAuthPopupProvider,
} from "@/lib/oauth/oauth-popup";

function parseProvider(value: string | null): OAuthPopupProvider | null {
  if (value === "square" || value === "xero") {
    return value;
  }
  return null;
}

export function buildFallbackSetupPath(
  searchParams: URLSearchParams,
): string {
  const params = new URLSearchParams();
  const step = searchParams.get("step");
  if (step) {
    params.set("step", step);
  }
  for (const key of [
    "square",
    "square_error",
    "square_error_detail",
    "xero",
    "xero_error",
    "xero_error_detail",
  ]) {
    const value = searchParams.get(key);
    if (value) {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `/setup?${qs}` : "/setup";
}

export function oauthPopupMessageFromUrl(
  url: URL,
): OAuthPopupMessage | null {
  const provider = parseProvider(url.searchParams.get("provider"));
  if (!provider) {
    return null;
  }

  const connectedKey = provider === "square" ? "square" : "xero";
  const errorKey = provider === "square" ? "square_error" : "xero_error";
  const detailKey =
    provider === "square" ? "square_error_detail" : "xero_error_detail";

  if (url.searchParams.get(connectedKey) === "connected") {
    return {
      type: OAUTH_POPUP_MESSAGE_TYPE,
      status: "connected",
      provider,
    };
  }

  const errorCode = url.searchParams.get(errorKey);
  if (errorCode) {
    return {
      type: OAUTH_POPUP_MESSAGE_TYPE,
      status: "error",
      provider,
      code: errorCode,
      detail: url.searchParams.get(detailKey) ?? undefined,
    };
  }

  return null;
}

/** Inline HTML for the OAuth popup callback — runs before React so the window closes immediately. */
export function buildOAuthPopupBridgeHtml(
  message: OAuthPopupMessage,
  origin: string,
  fallbackPath: string,
): string {
  const payload = JSON.stringify(message);
  const safeOrigin = JSON.stringify(origin);
  const safeFallback = JSON.stringify(fallbackPath);
  const channel = JSON.stringify(OAUTH_POPUP_BROADCAST_CHANNEL);
  const storageKey = JSON.stringify(OAUTH_POPUP_STORAGE_KEY);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Finishing connection</title>
</head>
<body>
  <p style="font-family:system-ui,sans-serif;color:#666;text-align:center;margin-top:2rem">
    Finishing connection…
  </p>
  <script>
    (function () {
      var message = ${payload};
      var origin = ${safeOrigin};
      var fallback = ${safeFallback};
      var channelName = ${channel};
      var storageKey = ${storageKey};

      function notifyParent() {
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(message, origin);
          }
        } catch (e) {}

        try {
          var channel = new BroadcastChannel(channelName);
          channel.postMessage(message);
          channel.close();
        } catch (e) {}

        try {
          sessionStorage.setItem(storageKey, JSON.stringify(message));
        } catch (e) {}
      }

      notifyParent();
      window.close();

      setTimeout(function () {
        if (!window.closed) {
          window.location.replace(fallback);
        }
      }, 350);
    })();
  </script>
</body>
</html>`;
}
