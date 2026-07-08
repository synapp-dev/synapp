import { Upload } from "tus-js-client";

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
 * Chunked resumable upload so large videos are not capped by the Storage **standard** upload limit
 * (`FILE_SIZE_LIMIT_STANDARD_UPLOAD` / multipart path used by `uploadToSignedUrl`).
 */
export function uploadUtilityLineupVideoTusSigned(
  opts: UtilityLineupTusUploadOptions,
): Promise<void> {
  const endpoint = supabaseSignedTusResumableEndpoint(opts.supabaseUrl);

  return new Promise((resolve, reject) => {
    const cleanupAbort = () => {
      opts.signal?.removeEventListener("abort", onAbort);
    };

    const onAbort = () => {
      cleanupAbort();
      void upload.abort().catch(() => {});
      reject(new DOMException("The upload was aborted", "AbortError"));
    };

    const upload = new Upload(opts.file, {
      endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        apikey: opts.supabaseAnonKey,
        "x-upsert": "true",
        "x-signature": opts.token,
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
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
        reject(err instanceof Error ? err : new Error(String(err)));
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
