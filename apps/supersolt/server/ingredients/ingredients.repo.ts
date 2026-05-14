import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/types";

type Supabase = SupabaseClient<Database>;

export type IngredientRow = Database["public"]["Tables"]["ingredients"]["Row"];

export const ingredientsRepo = {
  async getVenueContextBySlugs(
    supabase: Supabase,
    organisationSlug: string,
    venueSlug: string
  ): Promise<{
    organisationId: string;
    venueId: string;
    timezone: string;
    organisationName: string;
    venueName: string;
  } | null> {
    const { data, error } = await supabase
      .from("venues")
      .select(
        "id, name, organisation_id, timezone, organisations:organisation_id (slug, name)",
      )
      .eq("slug", venueSlug)
      .eq("is_active", true)
      .is("archived_at", null)
      .eq("organisations.slug", organisationSlug)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const row = data as {
      id: string;
      name: string;
      organisation_id: string;
      timezone: string;
      organisations: { slug: string; name: string } | { slug: string; name: string }[];
    };

    const orgRel = Array.isArray(row.organisations)
      ? row.organisations[0]
      : row.organisations;
    if (!orgRel?.name) {
      return null;
    }

    return {
      organisationId: row.organisation_id,
      venueId: row.id,
      timezone: row.timezone,
      organisationName: orgRel.name,
      venueName: row.name,
    };
  },

  async listIngredients(
    supabase: Supabase,
    args: {
      organisationId: string;
      venueId: string;
      search?: string;
      category?: string;
      status?: string;
      supplierId?: string;
      page: number;
      pageSize: number;
    }
  ): Promise<{ rows: IngredientRow[]; total: number }> {
    const from = (args.page - 1) * args.pageSize;
    const to = from + args.pageSize - 1;

    let query = supabase
      .from("ingredients")
      .select("*", { count: "exact" })
      .eq("organisation_id", args.organisationId)
      .eq("venue_id", args.venueId)
      .is("archived_at", null);

    if (args.search) {
      query = query.ilike("name", `%${args.search}%`);
    }
    if (args.category) {
      query = query.eq("category", args.category);
    }
    if (args.status) {
      query = query.eq("status", args.status);
    }
    if (args.supplierId) {
      query = query.eq("supplier_id", args.supplierId);
    }

    const { data, error, count } = await query
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    return {
      rows: (data ?? []) as IngredientRow[],
      total: count ?? 0,
    };
  },

  async getIngredientById(
    supabase: Supabase,
    args: { organisationId: string; venueId: string; ingredientId: string }
  ): Promise<IngredientRow | null> {
    const { data, error } = await supabase
      .from("ingredients")
      .select("*")
      .eq("id", args.ingredientId)
      .eq("organisation_id", args.organisationId)
      .eq("venue_id", args.venueId)
      .is("archived_at", null)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return (data as IngredientRow | null) ?? null;
  },

  async createIngredient(
    supabase: Supabase,
    row: Database["public"]["Tables"]["ingredients"]["Insert"]
  ): Promise<IngredientRow> {
    const { data, error } = await supabase
      .from("ingredients")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as IngredientRow;
  },

  async updateIngredient(
    supabase: Supabase,
    args: {
      organisationId: string;
      venueId: string;
      ingredientId: string;
      row: Database["public"]["Tables"]["ingredients"]["Update"];
    }
  ): Promise<IngredientRow | null> {
    const { data, error } = await supabase
      .from("ingredients")
      .update(args.row)
      .eq("id", args.ingredientId)
      .eq("organisation_id", args.organisationId)
      .eq("venue_id", args.venueId)
      .is("archived_at", null)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return (data as IngredientRow | null) ?? null;
  },

  async softDeleteIngredient(
    supabase: Supabase,
    args: { organisationId: string; venueId: string; ingredientId: string }
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from("ingredients")
      .update({
        status: "inactive",
        is_active: false,
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", args.ingredientId)
      .eq("organisation_id", args.organisationId)
      .eq("venue_id", args.venueId)
      .is("archived_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return Boolean(data?.id);
  },
};
