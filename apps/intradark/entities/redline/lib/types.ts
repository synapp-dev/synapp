/**
 * Types for the Redline Panel B2B API (Pelican-fronted CS2 host).
 * Spec: https://api.redlinepanel.com/docs#/
 *
 * The public surface is deliberately small — provisioning + power + live
 * metrics. There is no file-upload endpoint; custom plugins (Metamod +
 * CounterStrikeSharp + our DLLs) are delivered by passing an HTTP zip URL in
 * `environment`, which the host downloads and caches per node. See
 * docs/redline-provisioning.md (or the sandbox page) for the env var name.
 */

/** A single configurable variable exposed by an egg. */
export type RedlineEggVariable = {
  /** Human label, e.g. "Server Hostname". */
  name: string;
  /** Env key passed in `environment`, e.g. "SRCDS_MAP". */
  env: string;
  description: string;
  required: boolean;
  /** Default value, when the egg provides one. */
  default?: string;
};

/** A deployable location for an egg. */
export type RedlineLocation = {
  key: string;
  name: string;
};

/** An egg the API key is permitted to deploy. */
export type RedlineEgg = {
  slug: string;
  name: string;
  variables: RedlineEggVariable[];
  locations: RedlineLocation[];
};

export type ListEggsResponse = { eggs: RedlineEgg[] };
export type ListLocationsResponse = { locations: RedlineLocation[] };

/** Lightweight server record returned by list/create. */
export type RedlineServerSummary = {
  id: string;
  name: string;
  status: string;
  egg: string;
  address?: string;
  tv_address?: string;
  created_at?: string;
};

export type ListServersResponse = { servers: RedlineServerSummary[] };
export type CreateServerResponse = { server: RedlineServerSummary };

/** Live resource usage, present once the server is running. */
export type RedlineResourceUsage = {
  cpu_absolute: number;
  memory_bytes: number;
  disk_bytes: number;
  network_rx_bytes: number;
  network_tx_bytes: number;
  uptime: number;
};

/** Full detail from GET /v1/servers/{id}. */
export type RedlineServerDetail = {
  id: string;
  created_at: string;
  egg: string;
  name: string;
  status: string;
  address?: string;
  tv_address?: string;
  description?: string;
  /** Values returned verbatim (including secrets); built-ins excluded. */
  environment: Record<string, string>;
  /** Live power state — null until the install completes. */
  current_state: string | null;
  is_suspended: boolean;
  resources: RedlineResourceUsage | null;
};

export type RedlineStatus = {
  current_state: string | null;
  is_suspended: boolean;
};

export type RedlinePowerSignal = "start" | "stop" | "restart";

export type CreateServerInput = {
  name: string;
  egg: string;
  location: string;
  /** Keys not on the egg's allow-list are rejected by the API. */
  environment: Record<string, string>;
  start_on_completion?: boolean;
};

/**
 * One field-level failure inside a 422 validation problem.
 * Spec: https://api.redlinepanel.com/schemas/ErrorDetail.json
 */
export type RedlineErrorDetail = {
  /** Where it occurred, e.g. `body.items[3].tags` or `path.thing-id`. */
  location?: string;
  message?: string;
  /** The offending value at `location`. */
  value?: unknown;
};

/**
 * RFC 7807 Problem Details as returned by Redline (with its extensions).
 * Spec: https://api.redlinepanel.com/schemas/ProblemDetails.json
 *
 * `code` is the stable contract — branch on it, never on `detail`/`title`
 * (those may be reworded between releases).
 */
export type RedlineProblemDetails = {
  /** Stable, machine-readable error code (the only required field). */
  code: string;
  /** Short, static summary (the HTTP status text). */
  title?: string;
  /** Human-readable, occurrence-specific explanation. May be reworded. */
  detail?: string;
  /** HTTP status, repeated for convenience. */
  status?: number;
  /** Set on 502 upstream failures — quote it when reporting to Redline. */
  correlation_id?: string;
  /** Per-field details, present on 422 input-validation failures. */
  errors?: RedlineErrorDetail[];
  /** URI to docs for this error type (absent today). */
  type?: string;
  $schema?: string;
};
