import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * CRUD + read access for `redline_deploy_targets` — the per-server SFTP/RCON
 * creds used by the Push-to-live deploy. The table is RLS-locked (no client
 * access); everything here runs through the service role, server-side only.
 * Secrets (`sftp_password`, `rcon_password`) are returned to API layers only for
 * the deploy itself — list/metadata callers must redact them (see `toMeta`).
 */

const TABLE = "redline_deploy_targets";

export type DeployTarget = {
  id: string;
  label: string;
  redline_server_id: string | null;
  sftp_host: string;
  sftp_port: number;
  sftp_user: string;
  sftp_password: string;
  rcon_host: string;
  rcon_port: number;
  rcon_password: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/** Client-safe view — no secrets. */
export type DeployTargetMeta = Omit<DeployTarget, "sftp_password" | "rcon_password"> & {
  hasSftpPassword: boolean;
  hasRconPassword: boolean;
};

export function toMeta(t: DeployTarget): DeployTargetMeta {
  const { sftp_password, rcon_password, ...rest } = t;
  return { ...rest, hasSftpPassword: Boolean(sftp_password), hasRconPassword: Boolean(rcon_password) };
}

function admin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ADMIN_KEY;
  if (!url || !key) throw new Error("Supabase not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_ADMIN_KEY).");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function listDeployTargets(): Promise<DeployTargetMeta[]> {
  const { data, error } = await admin().from(TABLE).select("*").order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as DeployTarget[]).map(toMeta);
}

/** Full row (WITH secrets) for the active target — used only by the deploy route. */
export async function getActiveDeployTarget(): Promise<DeployTarget | null> {
  const { data, error } = await admin().from(TABLE).select("*").eq("is_active", true).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as DeployTarget) ?? null;
}

export type DeployTargetInput = {
  label: string;
  redlineServerId?: string | null;
  sftpHost: string;
  sftpPort?: number;
  sftpUser: string;
  sftpPassword?: string; // blank on edit = keep existing
  rconHost: string;
  rconPort?: number;
  rconPassword?: string; // blank on edit = keep existing
};

export async function createDeployTarget(input: DeployTargetInput): Promise<DeployTargetMeta> {
  const { data, error } = await admin()
    .from(TABLE)
    .insert({
      label: input.label,
      redline_server_id: input.redlineServerId ?? null,
      sftp_host: input.sftpHost,
      sftp_port: input.sftpPort ?? 2022,
      sftp_user: input.sftpUser,
      sftp_password: input.sftpPassword ?? "",
      rcon_host: input.rconHost,
      rcon_port: input.rconPort ?? 27015,
      rcon_password: input.rconPassword ?? "",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return toMeta(data as DeployTarget);
}

export async function updateDeployTarget(id: string, input: DeployTargetInput): Promise<DeployTargetMeta> {
  const patch: Record<string, unknown> = {
    label: input.label,
    redline_server_id: input.redlineServerId ?? null,
    sftp_host: input.sftpHost,
    sftp_port: input.sftpPort ?? 2022,
    sftp_user: input.sftpUser,
    rcon_host: input.rconHost,
    rcon_port: input.rconPort ?? 27015,
    updated_at: new Date().toISOString(),
  };
  // Only overwrite secrets when a new value is provided.
  if (input.sftpPassword) patch.sftp_password = input.sftpPassword;
  if (input.rconPassword) patch.rcon_password = input.rconPassword;

  const { data, error } = await admin().from(TABLE).update(patch).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return toMeta(data as DeployTarget);
}

export async function deleteDeployTarget(id: string): Promise<void> {
  const { error } = await admin().from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Flip the active target: clear all, then set this one (partial unique index allows one active). */
export async function activateDeployTarget(id: string): Promise<void> {
  const client = admin();
  const cleared = await client.from(TABLE).update({ is_active: false }).eq("is_active", true);
  if (cleared.error) throw new Error(cleared.error.message);
  const set = await client.from(TABLE).update({ is_active: true }).eq("id", id);
  if (set.error) throw new Error(set.error.message);
}
