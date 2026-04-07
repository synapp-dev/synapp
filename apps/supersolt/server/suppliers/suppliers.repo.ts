import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/types";

type Supabase = SupabaseClient<Database>;

export type SupplierRow = Database["public"]["Tables"]["suppliers"]["Row"];

export const suppliersRepo = {
  async listSuppliers(
    supabase: Supabase,
    args: {
      organisationId: string;
      venueId: string;
      search?: string;
      category?: string;
      status?: string;
      page: number;
      pageSize: number;
    }
  ): Promise<{ rows: SupplierRow[]; total: number }> {
    const from = (args.page - 1) * args.pageSize;
    const to = from + args.pageSize - 1;

    let query = supabase
      .from("suppliers")
      .select("*", { count: "exact" })
      .eq("organisation_id", args.organisationId)
      .is("archived_at", null)
      .or(`venue_id.is.null,venue_id.eq.${args.venueId}`);

    if (args.search?.trim()) {
      const raw = args.search
        .trim()
        .replace(/%/g, "")
        .replace(/_/g, "")
        .replace(/[(),]/g, "");
      if (raw.length > 0) {
        const pattern = `%${raw}%`;
        query = query.or(
          `name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},abn.ilike.${pattern},contact_person.ilike.${pattern}`
        );
      }
    }

    if (args.category) {
      query = query.eq("category", args.category);
    }

    if (args.status === "active") {
      query = query.eq("active", true);
    } else if (args.status === "inactive") {
      query = query.eq("active", false);
    }

    const { data, error, count } = await query
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    return {
      rows: (data ?? []) as SupplierRow[],
      total: count ?? 0,
    };
  },

  async getSupplierById(
    supabase: Supabase,
    args: { organisationId: string; venueId: string; supplierId: string }
  ): Promise<SupplierRow | null> {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", args.supplierId)
      .eq("organisation_id", args.organisationId)
      .is("archived_at", null)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const row = data as SupplierRow | null;
    if (!row) {
      return null;
    }
    if (row.venue_id !== null && row.venue_id !== args.venueId) {
      return null;
    }
    return row;
  },

  async createSupplier(
    supabase: Supabase,
    row: Database["public"]["Tables"]["suppliers"]["Insert"]
  ): Promise<SupplierRow> {
    const { data, error } = await supabase.from("suppliers").insert(row).select("*").single();

    if (error) {
      throw new Error(error.message);
    }

    return data as SupplierRow;
  },

  async updateSupplier(
    supabase: Supabase,
    args: {
      organisationId: string;
      venueId: string;
      supplierId: string;
      row: Database["public"]["Tables"]["suppliers"]["Update"];
    }
  ): Promise<SupplierRow | null> {
    const existing = await suppliersRepo.getSupplierById(supabase, {
      organisationId: args.organisationId,
      venueId: args.venueId,
      supplierId: args.supplierId,
    });

    if (!existing) {
      return null;
    }

    const { data, error } = await supabase
      .from("suppliers")
      .update(args.row)
      .eq("id", args.supplierId)
      .eq("organisation_id", args.organisationId)
      .is("archived_at", null)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return (data as SupplierRow | null) ?? null;
  },

  async softDeleteSupplier(
    supabase: Supabase,
    args: { organisationId: string; venueId: string; supplierId: string }
  ): Promise<boolean> {
    const existing = await suppliersRepo.getSupplierById(supabase, {
      organisationId: args.organisationId,
      venueId: args.venueId,
      supplierId: args.supplierId,
    });

    if (!existing) {
      return false;
    }

    const { data, error } = await supabase
      .from("suppliers")
      .update({
        active: false,
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", args.supplierId)
      .eq("organisation_id", args.organisationId)
      .is("archived_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return Boolean(data?.id);
  },
};
