"use client";

import { useState } from "react";

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

type CallState = {
  loading: boolean;
  status: number | null;
  label: string | null;
  data: unknown;
};

const EMPTY: CallState = { loading: false, status: null, label: null, data: null };

/**
 * Everything-by-hand harness for the Redline API. Each button maps to one of
 * our `/api/redline/*` proxy routes; the response (and the exact payload sent)
 * is dumped into the result panel so we can see precisely what the panel did.
 */
export function RedlineHarness() {
  // Create form
  const [name, setName] = useState("intradark-test");
  const [egg, setEgg] = useState("cs2");
  const [location, setLocation] = useState("");
  const [zipUrl, setZipUrl] = useState("");
  const [envJson, setEnvJson] = useState("{\n  \n}");
  const [startOnCompletion, setStartOnCompletion] = useState(true);

  // Lifecycle form
  const [serverId, setServerId] = useState("");
  const [force, setForce] = useState(true);

  const [call, setCall] = useState<CallState>(EMPTY);

  async function run(label: string, input: RequestInfo, init?: RequestInit) {
    setCall({ loading: true, status: null, label, data: null });
    try {
      const res = await fetch(input, init);
      const data = await res.json().catch(() => null);
      setCall({ loading: false, status: res.status, label, data });
    } catch (err) {
      setCall({
        loading: false,
        status: null,
        label,
        data: { error: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  function parseEnv(): Record<string, string> | null {
    const raw = envJson.trim();
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, string>;
      }
    } catch {
      /* fall through */
    }
    return null;
  }

  function createServer() {
    const environment = parseEnv();
    if (environment === null) {
      setCall({
        loading: false,
        status: null,
        label: "create",
        data: { error: "Environment must be a JSON object of string→string." },
      });
      return;
    }
    const body: Record<string, unknown> = {
      name,
      egg,
      location,
      environment,
      startOnCompletion,
    };
    if (zipUrl.trim()) body.pluginsZipUrl = zipUrl.trim();

    void run("create", "/api/redline/servers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  const idDisabled = !serverId.trim();

  return (
    <div className="space-y-6">
      {/* Discovery */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">1 · Discover</CardTitle>
          <CardDescription>
            List eggs (and their variable allow-lists / locations) and existing
            servers. The eggs call reveals which env var carries the plugins zip
            URL.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => run("eggs", "/api/redline/eggs")}
            disabled={call.loading}
          >
            List eggs
          </Button>
          <Button
            variant="secondary"
            onClick={() => run("servers", "/api/redline/servers")}
            disabled={call.loading}
          >
            List servers
          </Button>
        </CardContent>
      </Card>

      {/* Create */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">2 · Create</CardTitle>
          <CardDescription>
            Pass everything by hand. Plugins zip URL is folded into{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">environment</code>{" "}
            under the egg&apos;s plugin var.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Egg slug">
              <Input value={egg} onChange={(e) => setEgg(e.target.value)} />
            </Field>
            <Field label="Location key">
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. syd (from List eggs)"
              />
            </Field>
            <Field label="Plugins zip URL (optional)">
              <Input
                value={zipUrl}
                onChange={(e) => setZipUrl(e.target.value)}
                placeholder="https://…/intradark-plugins.zip"
              />
            </Field>
          </div>
          <Field label="Environment (JSON)">
            <Textarea
              value={envJson}
              onChange={(e) => setEnvJson(e.target.value)}
              rows={6}
              className="font-mono text-xs"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={startOnCompletion}
              onChange={(e) => setStartOnCompletion(e.target.checked)}
            />
            Start on completion
          </label>
          <Button onClick={createServer} disabled={call.loading}>
            Create server
          </Button>
        </CardContent>
      </Card>

      {/* Lifecycle */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">3 · Lifecycle</CardTitle>
          <CardDescription>
            Detail, power, and teardown for a given server id (copy it from a
            create / list response).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Server id">
            <Input
              value={serverId}
              onChange={(e) => setServerId(e.target.value)}
              placeholder="server uuid / id"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={idDisabled || call.loading}
              onClick={() =>
                run("detail", `/api/redline/servers/${encodeURIComponent(serverId)}`)
              }
            >
              Get detail
            </Button>
            {(["start", "stop", "restart"] as const).map((signal) => (
              <Button
                key={signal}
                variant="outline"
                disabled={idDisabled || call.loading}
                onClick={() =>
                  run(
                    `power:${signal}`,
                    `/api/redline/servers/${encodeURIComponent(serverId)}/power`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ signal }),
                    },
                  )
                }
              >
                {signal}
              </Button>
            ))}
            <Button
              variant="destructive"
              disabled={idDisabled || call.loading}
              onClick={() =>
                run(
                  "delete",
                  `/api/redline/servers/${encodeURIComponent(serverId)}${
                    force ? "?force=true" : ""
                  }`,
                  { method: "DELETE" },
                )
              }
            >
              Delete
            </Button>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
              />
              force
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Result</CardTitle>
          <CardDescription>
            {call.label
              ? `${call.label}${call.status ? ` · HTTP ${call.status}` : ""}${
                  call.loading ? " · …" : ""
                }`
              : "No call yet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[28rem] overflow-auto rounded bg-muted p-3 text-xs">
            {call.data ? JSON.stringify(call.data, null, 2) : "—"}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
