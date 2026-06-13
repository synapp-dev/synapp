import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreatePersonInput,
  Person,
  PersonCircle,
  UpdatePersonInput,
} from "@/entities/people/model/types";

type PersonRow = {
  id: string;
  full_name: string;
  nickname: string | null;
  circles: PersonCircle[];
  birthday_month: number | null;
  birthday_day: number | null;
  birthday_year: number | null;
  emails: string[];
  phone: string | null;
  company: string | null;
  role: string | null;
  interests: string[];
  bio: string | null;
  facts: string[];
  touch_base_days: number | null;
  last_touch_at: string | null;
  created_at: string;
  updated_at: string;
};

const PERSON_COLUMNS =
  "id, full_name, nickname, circles, birthday_month, birthday_day, birthday_year, emails, phone, company, role, interests, bio, facts, touch_base_days, last_touch_at, created_at, updated_at";

function toPerson(row: PersonRow): Person {
  return {
    id: row.id,
    fullName: row.full_name,
    nickname: row.nickname,
    circles: row.circles ?? [],
    birthdayMonth: row.birthday_month,
    birthdayDay: row.birthday_day,
    birthdayYear: row.birthday_year,
    emails: row.emails ?? [],
    phone: row.phone,
    company: row.company,
    role: row.role,
    interests: row.interests ?? [],
    bio: row.bio,
    facts: row.facts ?? [],
    touchBaseDays: row.touch_base_days,
    lastTouchAt: row.last_touch_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRowPatch(input: UpdatePersonInput): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.fullName !== undefined) patch.full_name = input.fullName;
  if (input.nickname !== undefined) patch.nickname = input.nickname;
  if (input.circles !== undefined) patch.circles = input.circles;
  if (input.birthdayMonth !== undefined) patch.birthday_month = input.birthdayMonth;
  if (input.birthdayDay !== undefined) patch.birthday_day = input.birthdayDay;
  if (input.birthdayYear !== undefined) patch.birthday_year = input.birthdayYear;
  if (input.emails !== undefined) patch.emails = input.emails;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.company !== undefined) patch.company = input.company;
  if (input.role !== undefined) patch.role = input.role;
  if (input.interests !== undefined) patch.interests = input.interests;
  if (input.bio !== undefined) patch.bio = input.bio;
  if (input.facts !== undefined) patch.facts = input.facts;
  if (input.touchBaseDays !== undefined) patch.touch_base_days = input.touchBaseDays;
  if (input.lastTouchAt !== undefined) patch.last_touch_at = input.lastTouchAt;
  return patch;
}

export async function listPeople(
  supabase: SupabaseClient,
  filters?: { circle?: PersonCircle; search?: string }
): Promise<Person[]> {
  let query = supabase
    .from("people")
    .select(PERSON_COLUMNS)
    .order("full_name", { ascending: true });

  if (filters?.circle) {
    query = query.contains("circles", [filters.circle]);
  }
  if (filters?.search) {
    const term = `%${filters.search.replaceAll("%", "")}%`;
    query = query.or(`full_name.ilike.${term},nickname.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as PersonRow[]).map(toPerson);
}

export async function createPerson(
  supabase: SupabaseClient,
  userId: string,
  input: CreatePersonInput
): Promise<Person> {
  const { data, error } = await supabase
    .from("people")
    .insert({
      user_id: userId,
      full_name: input.fullName,
      nickname: input.nickname ?? null,
      circles: input.circles ?? [],
      birthday_month: input.birthdayMonth ?? null,
      birthday_day: input.birthdayDay ?? null,
      birthday_year: input.birthdayYear ?? null,
      emails: input.emails ?? [],
      phone: input.phone ?? null,
      company: input.company ?? null,
      role: input.role ?? null,
      interests: input.interests ?? [],
      bio: input.bio ?? null,
    })
    .select(PERSON_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return toPerson(data as PersonRow);
}

export async function createPeopleBulk(
  supabase: SupabaseClient,
  userId: string,
  inputs: CreatePersonInput[]
): Promise<Person[]> {
  if (inputs.length === 0) return [];
  const rows = inputs.map((input) => ({
    user_id: userId,
    full_name: input.fullName,
    nickname: input.nickname ?? null,
    circles: input.circles ?? [],
    birthday_month: input.birthdayMonth ?? null,
    birthday_day: input.birthdayDay ?? null,
    birthday_year: input.birthdayYear ?? null,
    emails: input.emails ?? [],
    phone: input.phone ?? null,
    company: input.company ?? null,
    role: input.role ?? null,
    interests: input.interests ?? [],
    bio: input.bio ?? null,
  }));

  const { data, error } = await supabase
    .from("people")
    .insert(rows)
    .select(PERSON_COLUMNS);

  if (error) throw new Error(error.message);
  return (data as PersonRow[]).map(toPerson);
}

export async function updatePerson(
  supabase: SupabaseClient,
  personId: string,
  input: UpdatePersonInput
): Promise<Person> {
  const { data, error } = await supabase
    .from("people")
    .update(toRowPatch(input))
    .eq("id", personId)
    .select(PERSON_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return toPerson(data as PersonRow);
}

export async function getPerson(
  supabase: SupabaseClient,
  personId: string
): Promise<Person | null> {
  const { data, error } = await supabase
    .from("people")
    .select(PERSON_COLUMNS)
    .eq("id", personId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? toPerson(data as PersonRow) : null;
}

export async function deletePerson(
  supabase: SupabaseClient,
  personId: string
): Promise<void> {
  const { error } = await supabase.from("people").delete().eq("id", personId);
  if (error) throw new Error(error.message);
}

/** Append facts / interests and optionally bump last_touch_at. */
export async function appendPersonFacts(
  supabase: SupabaseClient,
  personId: string,
  options: { facts?: string[]; interests?: string[]; markTouch?: boolean }
): Promise<Person> {
  const current = await getPerson(supabase, personId);
  if (!current) throw new Error("Person not found");

  const patch: UpdatePersonInput = {};
  if (options.facts?.length) {
    patch.facts = [...current.facts, ...options.facts];
  }
  if (options.interests?.length) {
    const merged = new Set([...current.interests, ...options.interests]);
    patch.interests = [...merged];
  }
  if (options.markTouch) {
    patch.lastTouchAt = new Date().toISOString();
  }
  if (Object.keys(patch).length === 0) return current;
  return updatePerson(supabase, personId, patch);
}
