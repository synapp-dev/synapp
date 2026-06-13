import { createClient } from "@supabase/supabase-js";

const BUCKET = "venue-invoice-attachments";

function getStorageAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    process.env.SUPABASE_ADMIN_KEY?.trim();
  if (!url || !key) {
    throw new Error("Supabase storage credentials not configured");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export function buildInvoiceStoragePath(args: {
  organisationId: string;
  venueId: string;
  invoiceId: string;
  fileName: string;
}): string {
  const safeName = args.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${args.organisationId}/${args.venueId}/${args.invoiceId}/${safeName}`;
}

export async function uploadInvoiceAttachment(args: {
  organisationId: string;
  venueId: string;
  invoiceId: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<{ storagePath: string }> {
  const storagePath = buildInvoiceStoragePath(args);
  const supabase = getStorageAdmin();

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, args.bytes, {
    contentType: args.mimeType,
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { storagePath };
}

export async function downloadInvoiceAttachment(storagePath: string): Promise<{
  bytes: Buffer;
  mimeType: string | null;
}> {
  const supabase = getStorageAdmin();
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error || !data) {
    throw new Error(error?.message ?? "Download failed");
  }
  const arrayBuffer = await data.arrayBuffer();
  return {
    bytes: Buffer.from(arrayBuffer),
    mimeType: data.type || null,
  };
}

export async function createSignedAttachmentUrl(
  storagePath: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const supabase = getStorageAdmin();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Could not sign URL");
  }
  return data.signedUrl;
}
