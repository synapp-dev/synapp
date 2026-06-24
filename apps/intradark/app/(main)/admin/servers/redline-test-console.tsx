"use client";

import * as React from "react";
import { Copy, Eraser, Plus, Send, Terminal, X } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

import { toast } from "sonner";

import {
  extractProblemDetails,
  summarizeProblem,
} from "@/entities/redline/lib/problem-details";
import type { RedlineProblemDetails } from "@/entities/redline/lib/types";

import { DeployTargetsManager } from "./deploy-targets-manager";

/**
 * Redline test console — a by-hand dashboard over our `/api/redline/*` proxy
 * routes. Every call (quick action, provision, lifecycle, or a free-form custom
 * request) is appended to a running console log showing the exact method, URL,
 * request body, HTTP status, duration, and response — so a full test session is
 * visible at a glance instead of just the last call.
 *
 * Discovered cs2 egg facts (GET /api/redline/eggs) seed sensible defaults:
 * egg `cs2`, location `sydney`, and the egg's variable allow-list as env rows.
 */

// The cs2 egg's variable allow-list, used to seed the env editor + quick-add.
const CS2_ENV_VARS: Array<{ env: string; hint: string }> = [
  { env: "SRCDS_MAP", hint: "de_dust2" },
  { env: "SRCDS_MAXPLAYERS", hint: "10" },
  { env: "GAME_TYPE", hint: "3 = Deathmatch" },
  { env: "GAME_MODE", hint: "0" },
  { env: "CS2_MAPGROUP", hint: "mg_active" },
  { env: "STEAM_ACC", hint: "GSLT token (public listing)" },
  { env: "SRCDS_HOSTNAME", hint: "Intradark Test" },
  { env: "SRCDS_RCONPW", hint: "rcon password" },
  { env: "SRCDS_PW", hint: "join password" },
  { env: "ZIP_URL", hint: "plugins/overlay zip URL" },
];

type EnvRow = { key: string; value: string };

type PluginZip = {
  name: string;
  url: string;
  kind: string;
  version: string;
  size: number | null;
  updatedAt: string | null;
};

type SteamAccount = {
  id: string;
  label: string;
  description: string;
  configured: boolean;
};

type LogEntry = {
  id: number;
  ts: string;
  label: string;
  method: string;
  url: string;
  requestBody?: unknown;
  status: number | null;
  ok: boolean;
  durationMs: number;
  response: unknown;
};

const METHODS = ["GET", "POST", "DELETE"] as const;
type Method = (typeof METHODS)[number];

let nextId = 1;

/**
 * Surface a call's outcome as a toast so failures don't require scrolling the
 * log: decoded `code` + `detail` on error (with the correlation id one click
 * away), and a quiet confirmation for successful mutations.
 */
function notify(label: string, method: Method, ok: boolean, data: unknown) {
  if (!ok) {
    const problem = extractProblemDetails(data);
    const fallback =
      (data as { error?: string } | null)?.error ?? "Request failed";
    toast.error(`${label} failed`, {
      description: problem ? summarizeProblem(problem) : fallback,
      action: problem?.correlation_id
        ? {
            label: "Copy id",
            onClick: () => {
              void navigator.clipboard
                ?.writeText(problem.correlation_id ?? "")
                .catch(() => {});
            },
          }
        : undefined,
    });
    return;
  }
  // Don't toast read-only discovery calls — only state changes.
  if (method !== "GET") toast.success(`${label} ok`);
}

export function RedlineTestConsole({ configured }: { configured: boolean }) {
  // Provision builder
  const [name, setName] = React.useState("intradark-test");
  const [egg, setEgg] = React.useState("cs2");
  const [location, setLocation] = React.useState("sydney");
  const [startOnCompletion, setStartOnCompletion] = React.useState(true);
  const [envRows, setEnvRows] = React.useState<EnvRow[]>([
    { key: "SRCDS_MAP", value: "de_dust2" },
    { key: "SRCDS_MAXPLAYERS", value: "10" },
    { key: "SRCDS_HOSTNAME", value: "Intradark Test" },
  ]);
  const [zips, setZips] = React.useState<PluginZip[]>([]);
  const [zipSel, setZipSel] = React.useState("");
  const [accounts, setAccounts] = React.useState<SteamAccount[]>([]);
  const [gsltSel, setGsltSel] = React.useState("");

  // Lifecycle
  const [serverId, setServerId] = React.useState("");

  // Custom command
  const [method, setMethod] = React.useState<Method>("GET");
  const [path, setPath] = React.useState("/api/redline/eggs");
  const [customBody, setCustomBody] = React.useState("{\n  \n}");

  // Console
  const [log, setLog] = React.useState<LogEntry[]>([]);
  const [busy, setBusy] = React.useState(false);

  const append = React.useCallback((entry: Omit<LogEntry, "id" | "ts">) => {
    const ts = new Date().toLocaleTimeString([], { hour12: false });
    setLog((prev) => [{ ...entry, id: nextId++, ts }, ...prev]);
  }, []);

  // Load the available plugin zips from the bucket for the ZIP_URL dropdown.
  React.useEffect(() => {
    if (!configured) return;
    let active = true;
    fetch("/api/redline/plugin-zips", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (active && Array.isArray(d.zips)) setZips(d.zips);
      })
      .catch(() => {});
    fetch("/api/redline/steam-accounts", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (active && Array.isArray(d.accounts)) setAccounts(d.accounts);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [configured]);

  const send = React.useCallback(
    async (label: string, method: Method, url: string, body?: unknown) => {
      setBusy(true);
      const start = performance.now();
      try {
        const res = await fetch(url, {
          method,
          cache: "no-store",
          headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        const durationMs = Math.round(performance.now() - start);
        const data = await res.json().catch(() => null);
        append({
          label,
          method,
          url,
          requestBody: body,
          status: res.status,
          ok: res.ok,
          durationMs,
          response: data,
        });
        notify(label, method, res.ok, data);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        append({
          label,
          method,
          url,
          requestBody: body,
          status: null,
          ok: false,
          durationMs: Math.round(performance.now() - start),
          response: { error: message },
        });
        toast.error(`${label} failed`, { description: message });
      } finally {
        setBusy(false);
      }
    },
    [append],
  );

  function buildEnvironment(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const { key, value } of envRows) {
      const k = key.trim();
      if (k) out[k] = value;
    }
    return out;
  }

  function createPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      name,
      egg,
      location,
      environment: buildEnvironment(),
      startOnCompletion,
    };
    // Send only the GSLT *reference* — the server resolves the token from env.
    if (gsltSel) payload.steamAccountRef = gsltSel;
    return payload;
  }

  function setEnv(i: number, patch: Partial<EnvRow>) {
    setEnvRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function removeEnv(i: number) {
    setEnvRows((rows) => rows.filter((_, idx) => idx !== i));
  }
  function addEnv(key = "") {
    setEnvRows((rows) => [...rows, { key, value: "" }]);
  }
  /** Upsert (or remove, when value is empty) a single env row by key. */
  function setEnvByKey(key: string, value: string) {
    setEnvRows((rows) => {
      if (!value) return rows.filter((r) => r.key !== key);
      const idx = rows.findIndex((r) => r.key === key);
      if (idx >= 0) return rows.map((r, i) => (i === idx ? { ...r, value } : r));
      return [...rows, { key, value }];
    });
  }

  function sendCustom() {
    let body: unknown;
    if (method !== "GET") {
      const raw = customBody.trim();
      if (raw) {
        try {
          body = JSON.parse(raw);
        } catch {
          append({
            label: "custom (invalid body)",
            method,
            url: path,
            status: null,
            ok: false,
            durationMs: 0,
            response: { error: "Request body is not valid JSON." },
          });
          return;
        }
      }
    }
    void send("custom", method, path, body);
  }

  async function copyLog() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    } catch {
      /* clipboard may be unavailable; ignore */
    }
  }

  const disabled = !configured || busy;
  const idDisabled = disabled || !serverId.trim();

  return (
    <div className="space-y-6">
      {!configured ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base">Redline not configured</CardTitle>
            <CardDescription>
              Set <code className="text-xs">REDLINE_API_KEY</code> in{" "}
              <code className="text-xs">.env.local</code> and restart the dev server to
              use the test console.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: builders */}
        <div className="space-y-6">
          {/* Quick actions */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Quick actions</CardTitle>
              <CardDescription>Read-only discovery calls.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={disabled}
                onClick={() => void send("eggs", "GET", "/api/redline/eggs")}
              >
                List eggs
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={disabled}
                onClick={() => void send("servers", "GET", "/api/redline/servers")}
              >
                List servers
              </Button>
            </CardContent>
          </Card>

          {/* Push to live */}
          <Card className="border-primary/40">
            <CardHeader>
              <CardTitle className="text-base">Push plugins to live</CardTitle>
              <CardDescription>
                SFTP the locally-built DLLs (from{" "}
                <code className="text-xs">pnpm deploy:cs2-local</code>) to the{" "}
                <strong>active deploy target</strong>, then{" "}
                <code className="text-xs">css_plugins reload</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={disabled}
                  onClick={() => void send("deploy:push", "POST", "/api/redline/deploy-plugins", {})}
                >
                  <Send className="h-4 w-4" />
                  Push to live
                </Button>
                {["IntradarkDeathmatch", "IntradarkDmStats"].map((p) => (
                  <Button
                    key={p}
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() =>
                      void send(`deploy:${p}`, "POST", "/api/redline/deploy-plugins", { plugins: [p] })
                    }
                  >
                    {p.replace("Intradark", "")} only
                  </Button>
                ))}
              </div>
              <DeployTargetsManager configured={configured} />
            </CardContent>
          </Card>

          {/* Provision builder */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Provision</CardTitle>
              <CardDescription>
                Build a create payload. Env rows are seeded from the cs2 egg&apos;s
                allow-list — add <code className="text-xs">ZIP_URL</code> for plugins.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Name">
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="Egg">
                  <Input value={egg} onChange={(e) => setEgg(e.target.value)} />
                </Field>
                <Field label="Location">
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} />
                </Field>
              </div>

              <Field label="Plugins zip (ZIP_URL)">
                <select
                  value={zipSel}
                  onChange={(e) => {
                    setZipSel(e.target.value);
                    setEnvByKey("ZIP_URL", e.target.value);
                  }}
                  className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                >
                  <option value="">— none (vanilla server) —</option>
                  {zips.map((z) => (
                    <option key={z.name} value={z.url}>
                      {z.kind} · {z.version}
                    </option>
                  ))}
                </select>
                {zips.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    No zips in the bucket — run{" "}
                    <code className="text-xs">pnpm package:cs2-plugins -- --upload</code>.
                  </p>
                ) : null}
              </Field>

              <Field label="Steam account (GSLT)">
                <select
                  value={gsltSel}
                  onChange={(e) => setGsltSel(e.target.value)}
                  className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                >
                  <option value="">— none (LAN-only) —</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id} disabled={!a.configured}>
                      {a.label}
                      {a.configured ? "" : " (not configured)"}
                    </option>
                  ))}
                </select>
                <p className="text-muted-foreground text-xs">
                  {gsltSel
                    ? `${accounts.find((a) => a.id === gsltSel)?.description ?? ""} Token injected server-side as STEAM_ACC — never sent from the browser.`
                    : "Without a GSLT the server is LAN-only and refuses internet connections."}
                </p>
              </Field>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Environment</Label>
                <div className="space-y-2">
                  {envRows.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={row.key}
                        onChange={(e) => setEnv(i, { key: e.target.value })}
                        placeholder="ENV_KEY"
                        className="font-mono text-xs"
                      />
                      <Input
                        value={row.value}
                        onChange={(e) => setEnv(i, { value: e.target.value })}
                        placeholder="value"
                        className="font-mono text-xs"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Remove"
                        onClick={() => removeEnv(i)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Button variant="outline" size="sm" onClick={() => addEnv()}>
                    <Plus className="h-3.5 w-3.5" />
                    Row
                  </Button>
                  {CS2_ENV_VARS.filter(
                    (v) => !envRows.some((r) => r.key === v.env),
                  ).map((v) => (
                    <Button
                      key={v.env}
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground h-7 font-mono text-xs"
                      title={v.hint}
                      onClick={() => addEnv(v.env)}
                    >
                      +{v.env}
                    </Button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={startOnCompletion}
                  onChange={(e) => setStartOnCompletion(e.target.checked)}
                />
                Start on completion
              </label>

              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={disabled}
                  onClick={() => void send("create", "POST", "/api/redline/servers", createPayload())}
                >
                  <Send className="h-4 w-4" />
                  Create server
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    append({
                      label: "preview (not sent)",
                      method: "POST",
                      url: "/api/redline/servers",
                      requestBody: createPayload(),
                      status: null,
                      ok: true,
                      durationMs: 0,
                      response: { note: "Payload preview only — nothing was sent." },
                    })
                  }
                >
                  Preview payload
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lifecycle */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Lifecycle</CardTitle>
              <CardDescription>Detail / power / delete by server id.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Server id">
                <Input
                  value={serverId}
                  onChange={(e) => setServerId(e.target.value)}
                  placeholder="server uuid / id"
                  className="font-mono text-xs"
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={idDisabled}
                  onClick={() =>
                    void send(
                      "detail",
                      "GET",
                      `/api/redline/servers/${encodeURIComponent(serverId)}`,
                    )
                  }
                >
                  Detail
                </Button>
                {(["start", "stop", "restart"] as const).map((signal) => (
                  <Button
                    key={signal}
                    variant="outline"
                    size="sm"
                    disabled={idDisabled}
                    onClick={() =>
                      void send(
                        `power:${signal}`,
                        "POST",
                        `/api/redline/servers/${encodeURIComponent(serverId)}/power`,
                        { signal },
                      )
                    }
                  >
                    {signal}
                  </Button>
                ))}
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={idDisabled}
                  onClick={() =>
                    void send(
                      "delete",
                      "DELETE",
                      `/api/redline/servers/${encodeURIComponent(serverId)}?force=true`,
                    )
                  }
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Custom command */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Custom command</CardTitle>
              <CardDescription>
                Hit any <code className="text-xs">/api/redline/*</code> route directly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as Method)}
                  className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                >
                  {METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <Input
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/api/redline/…"
                  className="font-mono text-xs"
                />
              </div>
              {method !== "GET" ? (
                <Field label="Body (JSON)">
                  <Textarea
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    rows={5}
                    className="font-mono text-xs"
                  />
                </Field>
              ) : null}
              <Button disabled={disabled} onClick={sendCustom}>
                <Send className="h-4 w-4" />
                Send
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right column: console */}
        <Card className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <Terminal className="text-muted-foreground h-4 w-4" />
              <CardTitle className="text-base">Console</CardTitle>
              <span className="text-muted-foreground text-xs">
                {log.length} {log.length === 1 ? "entry" : "entries"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={log.length === 0}
                onClick={() => void copyLog()}
                title="Copy log as JSON"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={log.length === 0}
                onClick={() => setLog([])}
                title="Clear"
              >
                <Eraser className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="h-full overflow-auto pb-16">
            {log.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No calls yet. Fire a quick action or build a request — every call lands
                here with its payload, status, and response.
              </p>
            ) : (
              <div className="space-y-3">
                {log.map((entry) => (
                  <LogRow key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function statusTone(entry: LogEntry): "default" | "secondary" | "destructive" | "outline" {
  if (entry.status === null) return entry.ok ? "outline" : "destructive";
  if (entry.status >= 200 && entry.status < 300) return "default";
  if (entry.status >= 500) return "destructive";
  return "secondary";
}

function LogRow({ entry }: { entry: LogEntry }) {
  const problem = extractProblemDetails(entry.response);
  return (
    <div className="rounded-md border">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2 text-xs">
        <span className="text-muted-foreground font-mono">{entry.ts}</span>
        <span className="font-mono font-semibold">{entry.method}</span>
        <span className="text-muted-foreground truncate font-mono">{entry.url}</span>
        <Badge variant={statusTone(entry)} className="ml-auto">
          {entry.status ?? "ERR"}
        </Badge>
        <span className="text-muted-foreground">{entry.durationMs}ms</span>
      </div>
      <div className="space-y-2 p-3">
        <div className="text-muted-foreground text-xs">{entry.label}</div>
        {problem ? <ProblemPanel problem={problem} /> : null}
        {entry.requestBody !== undefined ? (
          <details>
            <summary className="text-muted-foreground cursor-pointer text-xs">
              request body
            </summary>
            <pre className="bg-muted mt-1 max-h-48 overflow-auto rounded p-2 text-xs">
              {JSON.stringify(entry.requestBody, null, 2)}
            </pre>
          </details>
        ) : null}
        <details open={!problem}>
          <summary className="text-muted-foreground cursor-pointer text-xs">
            {problem ? "raw response" : "response"}
          </summary>
          <pre className="bg-muted mt-1 max-h-80 overflow-auto rounded p-2 text-xs">
            {entry.response ? JSON.stringify(entry.response, null, 2) : "—"}
          </pre>
        </details>
      </div>
    </div>
  );
}

/** Decoded RFC 7807 view: branch-on `code`, with the correlation id one click away. */
function ProblemPanel({ problem }: { problem: RedlineProblemDetails }) {
  return (
    <div className="border-destructive/40 bg-destructive/5 space-y-2 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="destructive" className="font-mono">
          {problem.code}
        </Badge>
        {problem.title ? (
          <span className="text-sm font-medium">{problem.title}</span>
        ) : null}
        {typeof problem.status === "number" ? (
          <span className="text-muted-foreground text-xs">HTTP {problem.status}</span>
        ) : null}
      </div>
      {problem.detail ? <p className="text-sm">{problem.detail}</p> : null}
      {problem.correlation_id ? (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">correlation_id</span>
          <code className="bg-muted rounded px-1.5 py-0.5 font-mono">
            {problem.correlation_id}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Copy correlation id"
            onClick={() => {
              void navigator.clipboard
                ?.writeText(problem.correlation_id ?? "")
                .catch(() => {});
            }}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}
      {problem.errors && problem.errors.length > 0 ? (
        <ul className="space-y-1 text-xs">
          {problem.errors.map((e, i) => (
            <li key={i} className="font-mono">
              <span className="text-muted-foreground">{e.location ?? "?"}</span>
              {e.message ? ` — ${e.message}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      {children}
    </div>
  );
}
