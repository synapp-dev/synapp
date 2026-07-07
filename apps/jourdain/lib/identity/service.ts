import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateIdentityEntryInput,
  IdentityEntry,
  IdentityEntryExtras,
  IdentitySection,
  UpdateIdentityEntryInput,
} from "@/entities/identity/model/types";

type IdentityEntryRow = {
  id: string;
  section: IdentitySection;
  title: string;
  body: string | null;
  extras: IdentityEntryExtras | null;
  order_index: number;
  created_at: string;
  updated_at: string;
};

const ENTRY_COLUMNS =
  "id, section, title, body, extras, order_index, created_at, updated_at";

function toEntry(row: IdentityEntryRow): IdentityEntry {
  return {
    id: row.id,
    section: row.section,
    title: row.title,
    body: row.body,
    extras: row.extras ?? {},
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listEntries(
  supabase: SupabaseClient,
  section?: IdentitySection
): Promise<IdentityEntry[]> {
  let query = supabase
    .from("identity_entries")
    .select(ENTRY_COLUMNS)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });
  if (section) query = query.eq("section", section);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as IdentityEntryRow[]).map(toEntry);
}

export async function createEntry(
  supabase: SupabaseClient,
  userId: string,
  input: CreateIdentityEntryInput
): Promise<IdentityEntry> {
  const { data: maxRow } = await supabase
    .from("identity_entries")
    .select("order_index")
    .eq("section", input.section)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextIndex = ((maxRow as { order_index: number } | null)?.order_index ?? -1) + 1;

  const { data, error } = await supabase
    .from("identity_entries")
    .insert({
      user_id: userId,
      section: input.section,
      title: input.title,
      body: input.body ?? null,
      extras: input.extras ?? {},
      order_index: nextIndex,
    })
    .select(ENTRY_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toEntry(data as IdentityEntryRow);
}

export async function updateEntry(
  supabase: SupabaseClient,
  entryId: string,
  input: UpdateIdentityEntryInput
): Promise<IdentityEntry> {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.body !== undefined) patch.body = input.body;
  if (input.extras !== undefined) patch.extras = input.extras;

  const { data, error } = await supabase
    .from("identity_entries")
    .update(patch)
    .eq("id", entryId)
    .select(ENTRY_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toEntry(data as IdentityEntryRow);
}

export async function deleteEntry(
  supabase: SupabaseClient,
  entryId: string
): Promise<void> {
  const { error } = await supabase
    .from("identity_entries")
    .delete()
    .eq("id", entryId);
  if (error) throw new Error(error.message);
}

export async function reorderEntries(
  supabase: SupabaseClient,
  section: IdentitySection,
  ids: string[]
): Promise<void> {
  const results = await Promise.all(
    ids.map((id, index) =>
      supabase
        .from("identity_entries")
        .update({ order_index: index })
        .eq("id", id)
        .eq("section", section)
    )
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);
}
