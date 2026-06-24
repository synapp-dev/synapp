"use client";

import * as React from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

type DeployTargetMeta = {
  id: string;
  label: string;
  redline_server_id: string | null;
  sftp_host: string;
  sftp_port: number;
  sftp_user: string;
  rcon_host: string;
  rcon_port: number;
  is_active: boolean;
  hasSftpPassword: boolean;
  hasRconPassword: boolean;
};

type FormState = {
  label: string;
  redlineServerId: string;
  sftpHost: string;
  sftpPort: string;
  sftpUser: string;
  sftpPassword: string;
  rconHost: string;
  rconPort: string;
  rconPassword: string;
};

const BLANK: FormState = {
  label: "",
  redlineServerId: "",
  sftpHost: "syd-kvm1.redlinepanel.com",
  sftpPort: "2022",
  sftpUser: "intradark.",
  sftpPassword: "",
  rconHost: "",
  rconPort: "30006",
  rconPassword: "",
};

/**
 * Manage the per-server SFTP/RCON deploy targets (the Push-to-live creds). Lists
 * targets and lets you add/edit/activate/delete. Secrets are write-only here —
 * the API never returns them, and blank password fields on edit keep the
 * existing value.
 */
export function DeployTargetsManager({ configured }: { configured: boolean }) {
  const [targets, setTargets] = React.useState<DeployTargetMeta[]>([]);
  const [editing, setEditing] = React.useState<string | "new" | null>(null);
  const [form, setForm] = React.useState<FormState>(BLANK);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/redline/deploy-targets", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data.targets)) setTargets(data.targets);
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    if (configured) void load();
  }, [configured, load]);

  function set(patch: Partial<FormState>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function startCreate() {
    setForm(BLANK);
    setEditing("new");
    setError(null);
  }
  function startEdit(t: DeployTargetMeta) {
    setForm({
      label: t.label,
      redlineServerId: t.redline_server_id ?? "",
      sftpHost: t.sftp_host,
      sftpPort: String(t.sftp_port),
      sftpUser: t.sftp_user,
      sftpPassword: "",
      rconHost: t.rcon_host,
      rconPort: String(t.rcon_port),
      rconPassword: "",
    });
    setEditing(t.id);
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const body = {
      label: form.label,
      redlineServerId: form.redlineServerId || null,
      sftpHost: form.sftpHost,
      sftpPort: Number(form.sftpPort) || 2022,
      sftpUser: form.sftpUser,
      sftpPassword: form.sftpPassword || undefined,
      rconHost: form.rconHost,
      rconPort: Number(form.rconPort) || 27015,
      rconPassword: form.rconPassword || undefined,
    };
    try {
      const url = editing === "new" ? "/api/redline/deploy-targets" : `/api/redline/deploy-targets/${editing}`;
      const res = await fetch(url, {
        method: editing === "new" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setError(d?.error ?? `Save failed (HTTP ${res.status})`);
        return;
      }
      setEditing(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function act(path: string, method: string) {
    setBusy(true);
    try {
      await fetch(path, { method });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">
          {targets.length} target{targets.length === 1 ? "" : "s"} · active one is used by Push
        </span>
        <Button variant="outline" size="sm" disabled={!configured || editing !== null} onClick={startCreate}>
          <Plus className="h-3.5 w-3.5" />
          Add target
        </Button>
      </div>

      {targets.map((t) => (
        <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <span className="font-medium">{t.label}</span>
          {t.is_active ? <Badge>active</Badge> : null}
          <span className="text-muted-foreground font-mono text-xs">
            sftp {t.sftp_user}@{t.sftp_host}:{t.sftp_port} · rcon {t.rcon_host}:{t.rcon_port}
          </span>
          {!t.hasRconPassword || !t.hasSftpPassword ? (
            <Badge variant="destructive">missing password</Badge>
          ) : null}
          <div className="ml-auto flex items-center gap-1">
            {!t.is_active ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => void act(`/api/redline/deploy-targets/${t.id}/activate`, "POST")}
              >
                <Check className="h-4 w-4" /> Activate
              </Button>
            ) : null}
            <Button variant="ghost" size="icon" disabled={busy} title="Edit" onClick={() => startEdit(t)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={busy}
              title="Delete"
              className="text-destructive"
              onClick={() => void act(`/api/redline/deploy-targets/${t.id}`, "DELETE")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}

      {editing !== null ? (
        <div className="space-y-3 rounded-md border border-dashed p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{editing === "new" ? "New target" : "Edit target"}</span>
            <Button variant="ghost" size="icon" onClick={() => setEditing(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Label">
              <Input value={form.label} onChange={(e) => set({ label: e.target.value })} placeholder="syd test" />
            </Field>
            <Field label="Redline server id (optional)">
              <Input value={form.redlineServerId} onChange={(e) => set({ redlineServerId: e.target.value })} placeholder="118" />
            </Field>
            <Field label="SFTP host">
              <Input value={form.sftpHost} onChange={(e) => set({ sftpHost: e.target.value })} className="font-mono text-xs" />
            </Field>
            <Field label="SFTP port">
              <Input value={form.sftpPort} onChange={(e) => set({ sftpPort: e.target.value })} className="font-mono text-xs" />
            </Field>
            <Field label="SFTP user">
              <Input value={form.sftpUser} onChange={(e) => set({ sftpUser: e.target.value })} className="font-mono text-xs" placeholder="intradark.8e9c8d7c" />
            </Field>
            <Field label={`SFTP password${editing !== "new" ? " (blank = keep)" : ""}`}>
              <Input type="password" value={form.sftpPassword} onChange={(e) => set({ sftpPassword: e.target.value })} />
            </Field>
            <Field label="RCON host (real IP)">
              <Input value={form.rconHost} onChange={(e) => set({ rconHost: e.target.value })} className="font-mono text-xs" placeholder="116.251.210.34" />
            </Field>
            <Field label="RCON port">
              <Input value={form.rconPort} onChange={(e) => set({ rconPort: e.target.value })} className="font-mono text-xs" />
            </Field>
            <Field label={`RCON password${editing !== "new" ? " (blank = keep)" : ""}`}>
              <Input type="password" value={form.rconPassword} onChange={(e) => set({ rconPassword: e.target.value })} />
            </Field>
          </div>
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
          <Button disabled={busy || !form.label || !form.sftpUser || !form.rconHost} onClick={() => void save()}>
            {busy ? "Saving…" : "Save target"}
          </Button>
        </div>
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
