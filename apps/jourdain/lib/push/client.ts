import type {
  PushCapability,
  PushSubscriptionPayload,
} from "@/entities/notifications/model/types";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** VAPID public key (base64url) → Uint8Array for PushManager.subscribe. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS reports as Mac; disambiguate via touch support.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** True when running as an installed (home-screen) PWA. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (
    window.navigator as Navigator & { standalone?: boolean }
  ).standalone;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    iosStandalone === true
  );
}

/** What the device can do about push right now. Cheap, sync-ish checks only. */
export async function getPushCapability(): Promise<PushCapability> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    // On iOS, the APIs only exist once the PWA is installed.
    if (isIos() && !isStandalone()) return "needs-install";
    return "unsupported";
  }

  if (isIos() && !isStandalone()) return "needs-install";
  if (Notification.permission === "denied") return "denied";

  const registration = await navigator.serviceWorker.getRegistration();
  const existing = await registration?.pushManager.getSubscription();
  return existing ? "subscribed" : "ready";
}

/**
 * Request permission and subscribe this device to push. Must be called from a
 * user gesture (button click). Returns the subscription to persist server-side.
 */
export async function subscribeToPush(): Promise<PushSubscriptionPayload> {
  if (!VAPID_PUBLIC_KEY) {
    throw new Error("Push is not configured (missing VAPID public key).");
  }

  const registration = await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  return subscription.toJSON() as PushSubscriptionPayload;
}

/** Unsubscribe this device locally; returns the endpoint that was removed. */
export async function unsubscribeFromPush(): Promise<string | null> {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return null;
  const { endpoint } = subscription;
  await subscription.unsubscribe();
  return endpoint;
}
