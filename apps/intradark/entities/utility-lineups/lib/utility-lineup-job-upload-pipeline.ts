"use client";

import {
  failEnemyPovUploadJobAction,
  finalizeEnemyPovUploadJobAction,
  markEnemyPovUploadJobUploadingAction,
} from "@/entities/utility-lineups/actions/enemy-pov-upload-job-actions";
import {
  failUtilityLineupUploadJobAction,
  finalizeUtilityLineupUploadJobAction,
  markUtilityLineupUploadJobUploadingAction,
} from "@/entities/utility-lineups/actions/user-upload-job-actions";
import {
  INTRADARK_MEDIA_BUCKET,
  MAX_UTILITY_LINEUP_VIDEO_BYTES,
} from "@/lib/media/constants";
import { uploadUtilityLineupVideoTusSigned } from "@/lib/media/utility-lineup-tus-upload";
import {
  isAllowedUtilityLineupVideoMime,
  isAllowedUtilityLineupVideoSize,
} from "@/lib/media/utility-lineup-video-validation";
import { createBrowserClient } from "@/utils/supabase/client";

function resolvedVideoContentType(file: File): string {
  if (file.type && isAllowedUtilityLineupVideoMime(file.type)) {
    return file.type;
  }
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mov")) return "video/quicktime";
  return "video/mp4";
}

type PipelineHooks<TFinalize extends { ok: true } | { ok: false; message: string }> = {
  jobId: string;
  file: File;
  onProgress: (pct: number) => void;
  signal?: AbortSignal;
  markUploading: (
    jobId: string,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
  finalize: (jobId: string) => Promise<TFinalize>;
  fail: (jobId: string, message: string) => Promise<unknown>;
};

async function runUploadPipelineWithHooks<
  TFinalize extends { ok: true } | { ok: false; message: string },
>(
  hooks: PipelineHooks<TFinalize>,
): Promise<TFinalize | { ok: false; message: string }> {
  const contentType = resolvedVideoContentType(hooks.file);
  if (!isAllowedUtilityLineupVideoMime(contentType)) {
    return { ok: false, message: "Use MP4, WebM, or QuickTime (MOV)." };
  }
  if (!isAllowedUtilityLineupVideoSize(hooks.file.size)) {
    return {
      ok: false,
      message: `Video must be at most ${Math.floor(MAX_UTILITY_LINEUP_VIDEO_BYTES / (1024 * 1024))} MB.`,
    };
  }

  const mark = await hooks.markUploading(hooks.jobId);
  if (!mark.ok) {
    return { ok: false, message: mark.message };
  }

  try {
    const res = await fetch("/api/media/utility-lineup-upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: hooks.jobId,
        contentType,
        byteLength: hooks.file.size,
      }),
      signal: hooks.signal,
    });
    const json = (await res.json()) as {
      objectPath?: string;
      token?: string;
      error?: string;
    };
    if (!res.ok) {
      throw new Error(json.error ?? "Could not start upload");
    }
    if (!json.objectPath || !json.token) {
      throw new Error("Invalid upload response");
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY.",
      );
    }

    const supabase = createBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error("Sign in to upload.");
    }

    hooks.onProgress(8);
    await uploadUtilityLineupVideoTusSigned({
      file: hooks.file,
      bucket: INTRADARK_MEDIA_BUCKET,
      objectPath: json.objectPath,
      token: json.token,
      supabaseUrl,
      supabaseAnonKey,
      contentType,
      signal: hooks.signal,
      onProgress: hooks.onProgress,
    });

    return await hooks.finalize(hooks.jobId);
  } catch (err) {
    const msg =
      err instanceof DOMException && err.name === "AbortError"
        ? "Upload cancelled."
        : err instanceof Error
          ? err.message
          : "Upload failed.";
    await hooks.fail(hooks.jobId, msg);
    return { ok: false, message: msg };
  }
}

export type LineupUploadPipelineResult =
  | { ok: true; lineupId: string }
  | { ok: false; message: string };

export async function runUtilityLineupJobUploadPipeline(opts: {
  jobId: string;
  file: File;
  onProgress: (pct: number) => void;
  signal?: AbortSignal;
}): Promise<LineupUploadPipelineResult> {
  const result = await runUploadPipelineWithHooks({
    jobId: opts.jobId,
    file: opts.file,
    onProgress: opts.onProgress,
    signal: opts.signal,
    markUploading: markUtilityLineupUploadJobUploadingAction,
    finalize: async (id) => {
      const fin = await finalizeUtilityLineupUploadJobAction(id);
      if (!fin.ok) return { ok: false as const, message: fin.message };
      return { ok: true as const, lineupId: fin.lineupId };
    },
    fail: failUtilityLineupUploadJobAction,
  });
  return result;
}

export type EnemyPovUploadPipelineResult =
  | { ok: true; enemyPovVideoId: string }
  | { ok: false; message: string };

export async function runEnemyPovUploadPipeline(opts: {
  jobId: string;
  file: File;
  onProgress: (pct: number) => void;
  signal?: AbortSignal;
}): Promise<EnemyPovUploadPipelineResult> {
  const result = await runUploadPipelineWithHooks({
    jobId: opts.jobId,
    file: opts.file,
    onProgress: opts.onProgress,
    signal: opts.signal,
    markUploading: markEnemyPovUploadJobUploadingAction,
    finalize: async (id) => {
      const fin = await finalizeEnemyPovUploadJobAction(id);
      if (!fin.ok) return { ok: false as const, message: fin.message };
      return { ok: true as const, enemyPovVideoId: fin.enemyPovVideoId };
    },
    fail: failEnemyPovUploadJobAction,
  });
  return result;
}
