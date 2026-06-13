import { createClient } from "@supabase/supabase-js";

const BUCKET = "stock-count-photos";

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

export function buildStockCountPhotoPath(args: {
  venueId: string;
  countId: string;
  entryId: string;
  fileName: string;
}): string {
  const safeName = args.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${args.venueId}/${args.countId}/${args.entryId}/${safeName}`;
}

export async function uploadStockCountPhoto(args: {
  venueId: string;
  countId: string;
  entryId: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<{ storagePath: string; publicUrl: string }> {
  const storagePath = buildStockCountPhotoPath(args);
  const supabase = getStorageAdmin();

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, args.bytes, {
    contentType: args.mimeType,
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  return { storagePath, publicUrl: urlData.publicUrl };
}

export async function ensureStockCountPhotosBucket(): Promise<void> {
  const supabase = getStorageAdmin();
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((b) => b.name === BUCKET)) return;
  await supabase.storage.createBucket(BUCKET, { public: false });
}
