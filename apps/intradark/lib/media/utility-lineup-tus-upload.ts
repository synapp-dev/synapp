import { DetailedError, Upload } from "tus-js-client";

/**
 * TUS endpoint for **signed** resumable uploads (`createSignedUploadUrl` token in `x-signature`).
 * Must end with `/sign` — see `supabase/storage` `routes/tus/lifecycle.ts` (`SIGNED_URL_SUFFIX`).
 *
 * Hosted: `https://<ref>.storage.supabase.co/storage/v1/upload/resumable/sign`
 * Local / same-origin: `<NEXT_PUBLIC_SUPABASE_URL>/storage/v1/upload/resumable/sign`
 */
export function supabaseSignedTusResumableEndpoint(supabaseUrl: string): string {
  const trimmed = supabaseUrl.replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Invalid NEXT_PUBLIC_SUPABASE_URL");
  }

  const host = parsed.hostname;
  const m = host.match(/^([a-z0-9-]+)\.supabase\.co$/i);
  if (m) {
    return `https://${m[1]}.storage.supabase.co/storage/v1/upload/resumable/sign`;
  }

  return `${trimmed}/storage/v1/upload/resumable/sign`;
}

export type UtilityLineupTusUploadOptions = {
  file: File;
  bucket: string;
  objectPath: string;
  token: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  contentType: string;
  signal?: AbortSignal;
  onProgress?: (percentApprox: number) => void;
};

/**
 * Chrome invalidates a picked `File` handle when the file on disk is modified after selection
 * (recorder still finalizing the clip, cloud sync touching it). Every read after that fails at
 * the network layer (`ERR_UPLOAD_FILE_CHANGED`), which tus surfaces as an opaque ProgressEvent
 * error with no response code. Snapshotting into detached blob storage up front makes the read
 * failure immediate and explainable, and immunizes the rest of the upload.
 */
async function snapshotFileForUpload(file: File): Promise<Blob> {
  try {
    return await new Response(file).blob();
  } catch {
    throw new Error(
      "Couldn't read the video from disk — it changed after you selected it (still saving from your recorder, or being synced?). Wait for it to finish saving, re-select it, and try again.",
    );
  }
}

function friendlyTusError(err: unknown): Error {
  if (err instanceof DetailedError && !err.originalResponse) {
    return new Error(
      "The upload kept getting interrupted before reaching the server. Check your connection (and any VPN/antivirus web protection), then try again.",
      { cause: err },
    );
  }
  return err instanceof Error ? err : new Error(String(err));
}

/**
 * Chunked resumable upload so large videos are not capped by the Storage **standard** upload limit
 * (`FILE_SIZE_LIMIT_STANDARD_UPLOAD` / multipart path used by `uploadToSignedUrl`).
 */
export async function uploadUtilityLineupVideoTusSigned(
  opts: UtilityLineupTusUploadOptions,
): Promise<void> {
  const endpoint = supabaseSignedTusResumableEndpoint(opts.supabaseUrl);
  const source = await snapshotFileForUpload(opts.file);

  return new Promise((resolve, reject) => {
    const cleanupAbort = () => {
      opts.signal?.removeEventListener("abort", onAbort);
    };

    const onAbort = () => {
      cleanupAbort();
      void upload.abort().catch(() => {});
      reject(new DOMException("The upload was aborted", "AbortError"));
    };

    const upload = new Upload(source, {
      endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        apikey: opts.supabaseAnonKey,
        "x-upsert": "true",
        "x-signature": opts.token,
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      // The snapshot Blob has no name, so the default name/size fingerprint could collide
      // across different clips; the signed object path is unique per upload job.
      fingerprint: () =>
        Promise.resolve(
          ["intradark-tus", opts.bucket, opts.objectPath].join("-"),
        ),
      chunkSize: 6 * 1024 * 1024,
      metadata: {
        bucketName: opts.bucket,
        objectName: opts.objectPath,
        contentType: opts.contentType,
        cacheControl: "3600",
      },
      onProgress(bytesSent, bytesTotal) {
        if (bytesTotal > 0) {
          const pct = 15 + Math.round((bytesSent / bytesTotal) * 80);
          opts.onProgress?.(Math.min(95, pct));
        }
      },
      onError(err) {
        cleanupAbort();
        reject(friendlyTusError(err));
      },
      onSuccess() {
        cleanupAbort();
        opts.onProgress?.(100);
        resolve();
      },
    });

    if (opts.signal) {
      if (opts.signal.aborted) {
        onAbort();
        return;
      }
      opts.signal.addEventListener("abort", onAbort);
    }

    void upload
      .findPreviousUploads()
      .then((previous) => {
        const first = previous[0];
        if (first) {
          upload.resumeFromPreviousUpload(first);
        }
        upload.start();
      })
      .catch((e) => {
        cleanupAbort();
        reject(e instanceof Error ? e : new Error(String(e)));
      });
  });
}
