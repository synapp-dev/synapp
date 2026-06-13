import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/lib/media/constants";

export type UploadTeamAvatarResult =
  | { ok: true; objectPath: string; publicUrl: string }
  | { ok: false; message: string };

export async function uploadTeamAvatarFile(
  teamId: string,
  file: File,
): Promise<UploadTeamAvatarResult> {
  if (!(ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, message: "Use PNG, JPEG, WebP, or GIF." };
  }
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      message: `Image must be under ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
    };
  }

  const signRes = await fetch("/api/media/team-avatar-upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      teamId,
      contentType: file.type,
      byteLength: file.size,
    }),
  });

  const signJson = (await signRes.json()) as {
    signedUrl?: string;
    objectPath?: string;
    publicUrl?: string;
    error?: string;
  };

  if (!signRes.ok || !signJson.signedUrl || !signJson.objectPath) {
    return {
      ok: false,
      message: signJson.error ?? `Could not start upload (HTTP ${signRes.status}).`,
    };
  }

  const putRes = await fetch(signJson.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!putRes.ok) {
    return {
      ok: false,
      message: `Upload failed (storage returned ${putRes.status}).`,
    };
  }

  return {
    ok: true,
    objectPath: signJson.objectPath,
    publicUrl: signJson.publicUrl ?? signJson.objectPath,
  };
}
