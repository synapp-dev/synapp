export type NotificationSettings = {
  dailyDigestEnabled: boolean;
  /** Local hour (0-23) at which the daily digest fires. */
  digestHour: number;
  /** IANA timezone the digest hour is interpreted in. */
  timezone: string;
  lastDigestDate: string | null;
};

export type UpdateNotificationSettingsInput = Partial<{
  dailyDigestEnabled: boolean;
  digestHour: number;
  timezone: string;
}>;

/** Browser PushSubscription shape we persist and send to. */
export type PushSubscriptionPayload = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** What the device can do right now re: push. */
export type PushCapability =
  | "ready" // service worker + Push API available, can subscribe
  | "subscribed" // already subscribed on this device
  | "needs-install" // iOS Safari tab — must Add to Home Screen first
  | "denied" // notification permission was denied
  | "unsupported"; // no service worker / Push API at all

/** Payload the server pushes; mirrored by the service worker's push handler. */
export type PushMessage = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};
