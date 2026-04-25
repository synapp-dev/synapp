export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      positions: {
        Row: {
          archived_at: string | null;
          created_at: string;
          display_name: string;
          id: string;
          organisation_id: string;
          slug: string;
          sort_order: number;
          updated_at: string;
          venue_id: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          display_name: string;
          id?: string;
          organisation_id: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
          venue_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["positions"]["Insert"]>;
        Relationships: [];
      };
      organisations: {
        Row: {
          abn: string | null;
          archived_at: string | null;
          created_at: string;
          currency: string;
          email: string | null;
          id: string;
          is_active: boolean;
          is_gst_registered: boolean;
          legal_name: string | null;
          logo_url: string | null;
          name: string;
          phone: string | null;
          slug: string;
          timezone: string;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          abn?: string | null;
          archived_at?: string | null;
          created_at?: string;
          currency?: string;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          is_gst_registered?: boolean;
          legal_name?: string | null;
          logo_url?: string | null;
          name: string;
          phone?: string | null;
          slug: string;
          timezone?: string;
          updated_at?: string;
          website?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["organisations"]["Insert"]>;
        Relationships: [];
      };
      roles: {
        Row: {
          archived_at: string | null;
          created_at: string;
          description: string | null;
          display_name: string;
          grants_org_admin: boolean;
          id: string;
          is_system: boolean;
          organisation_id: string | null;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          description?: string | null;
          display_name: string;
          grants_org_admin?: boolean;
          id: string;
          is_system?: boolean;
          organisation_id?: string | null;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["roles"]["Insert"]>;
        Relationships: [];
      };
      venues: {
        Row: {
          address_line1: string | null;
          address_line2: string | null;
          archived_at: string | null;
          country: string | null;
          created_at: string;
          email: string | null;
          id: string;
          is_active: boolean;
          name: string;
          organisation_id: string;
          phone: string | null;
          postcode: string | null;
          slug: string;
          state: string | null;
          suburb: string | null;
          timezone: string;
          updated_at: string;
          venue_type: string;
        };
        Insert: {
          address_line1?: string | null;
          address_line2?: string | null;
          archived_at?: string | null;
          country?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          organisation_id: string;
          phone?: string | null;
          postcode?: string | null;
          slug: string;
          state?: string | null;
          suburb?: string | null;
          timezone?: string;
          updated_at?: string;
          venue_type?: string;
        };
        Update: Partial<Database["public"]["Tables"]["venues"]["Insert"]>;
        Relationships: [];
      };
      venue_square_connections: {
        Row: {
          created_at: string;
          environment: string;
          id: string;
          organisation_id: string;
          square_access_token: string;
          square_location_id: string | null;
          square_merchant_id: string;
          square_refresh_token: string;
          token_expires_at: string | null;
          updated_at: string;
          venue_id: string;
        };
        Insert: {
          created_at?: string;
          environment: string;
          id?: string;
          organisation_id: string;
          square_access_token: string;
          square_location_id?: string | null;
          square_merchant_id: string;
          square_refresh_token: string;
          token_expires_at?: string | null;
          updated_at?: string;
          venue_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["venue_square_connections"]["Insert"]>;
        Relationships: [];
      };
      venue_square_order_lines: {
        Row: {
          created_at: string;
          currency: string;
          gross_amount_cents: number;
          id: string;
          line_name: string | null;
          match_source: string;
          menu_item_id: string | null;
          observed_at: string;
          organisation_id: string;
          quantity: number;
          square_catalog_object_id: string | null;
          square_line_uid: string;
          square_order_id: string | null;
          square_payment_id: string;
          updated_at: string;
          venue_id: string;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          gross_amount_cents?: number;
          id?: string;
          line_name?: string | null;
          match_source?: string;
          menu_item_id?: string | null;
          observed_at: string;
          organisation_id: string;
          quantity: number;
          square_catalog_object_id?: string | null;
          square_line_uid: string;
          square_order_id?: string | null;
          square_payment_id: string;
          updated_at?: string;
          venue_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["venue_square_order_lines"]["Insert"]>;
        Relationships: [];
      };
      venue_staff_weekly_availability: {
        Row: {
          available_end_time: string | null;
          available_start_time: string | null;
          created_at: string;
          day_of_week: number;
          id: string;
          is_available: boolean;
          organisation_id: string;
          updated_at: string;
          user_profile_id: string;
          venue_id: string;
        };
        Insert: {
          available_end_time?: string | null;
          available_start_time?: string | null;
          created_at?: string;
          day_of_week: number;
          id?: string;
          is_available?: boolean;
          organisation_id: string;
          updated_at?: string;
          user_profile_id: string;
          venue_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["venue_staff_weekly_availability"]["Insert"]>;
        Relationships: [];
      };
      venue_staff_week_instance_availability: {
        Row: {
          available_end_time: string | null;
          available_start_time: string | null;
          created_at: string;
          day_of_week: number;
          id: string;
          is_available: boolean;
          organisation_id: string;
          updated_at: string;
          user_profile_id: string;
          venue_id: string;
          week_start_monday: string;
        };
        Insert: {
          available_end_time?: string | null;
          available_start_time?: string | null;
          created_at?: string;
          day_of_week: number;
          id?: string;
          is_available: boolean;
          organisation_id: string;
          updated_at?: string;
          user_profile_id: string;
          venue_id: string;
          week_start_monday: string;
        };
        Update: Partial<Database["public"]["Tables"]["venue_staff_week_instance_availability"]["Insert"]>;
        Relationships: [];
      };
      roster_shifts: {
        Row: {
          break_minutes: number;
          created_at: string;
          ends_at: string;
          id: string;
          lifecycle: Database["public"]["Enums"]["roster_shift_lifecycle"];
          organisation_id: string;
          position_id: string;
          source: Database["public"]["Enums"]["roster_shift_source"];
          starts_at: string;
          template_id: string | null;
          updated_at: string;
          user_profile_id: string;
          venue_id: string;
        };
        Insert: {
          break_minutes?: number;
          created_at?: string;
          ends_at: string;
          id?: string;
          lifecycle?: Database["public"]["Enums"]["roster_shift_lifecycle"];
          organisation_id: string;
          position_id: string;
          source?: Database["public"]["Enums"]["roster_shift_source"];
          starts_at: string;
          template_id?: string | null;
          updated_at?: string;
          user_profile_id: string;
          venue_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["roster_shifts"]["Insert"]>;
        Relationships: [];
      };
      roster_template_shifts: {
        Row: {
          break_minutes: number;
          created_at: string;
          day_of_week: number;
          end_time: string;
          id: string;
          position_id: string;
          start_time: string;
          template_id: string;
          updated_at: string;
          user_profile_id: string | null;
        };
        Insert: {
          break_minutes?: number;
          created_at?: string;
          day_of_week: number;
          end_time: string;
          id?: string;
          position_id: string;
          start_time: string;
          template_id: string;
          updated_at?: string;
          user_profile_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["roster_template_shifts"]["Insert"]>;
        Relationships: [];
      };
      roster_templates: {
        Row: {
          archived_at: string | null;
          created_at: string;
          id: string;
          name: string;
          organisation_id: string;
          updated_at: string;
          venue_id: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          organisation_id: string;
          updated_at?: string;
          venue_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["roster_templates"]["Insert"]>;
        Relationships: [];
      };
      user_profiles: {
        Row: {
          archived_at: string | null;
          avatar_url: string | null;
          created_at: string;
          email: string;
          first_name: string | null;
          full_name: string | null;
          id: string;
          is_active: boolean;
          last_name: string | null;
          phone: string | null;
          setup_completed_at: string | null;
          timezone: string | null;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          first_name?: string | null;
          full_name?: string | null;
          id: string;
          is_active?: boolean;
          last_name?: string | null;
          phone?: string | null;
          setup_completed_at?: string | null;
          timezone?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_profiles"]["Insert"]>;
        Relationships: [];
      };
      user_organisations: {
        Row: {
          archived_at: string | null;
          created_at: string;
          id: string;
          invited_at: string | null;
          is_active: boolean;
          joined_at: string | null;
          organisation_id: string;
          revoked_at: string | null;
          role_id: string;
          updated_at: string;
          user_profile_id: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          invited_at?: string | null;
          is_active?: boolean;
          joined_at?: string | null;
          organisation_id: string;
          revoked_at?: string | null;
          role_id: string;
          updated_at?: string;
          user_profile_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_organisations"]["Insert"]>;
        Relationships: [];
      };
      user_venues: {
        Row: {
          archived_at: string | null;
          created_at: string;
          default_position_id: string | null;
          id: string;
          is_active: boolean;
          organisation_id: string;
          role_id: string | null;
          updated_at: string;
          user_organisation_id: string;
          venue_id: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          default_position_id?: string | null;
          id?: string;
          is_active?: boolean;
          organisation_id: string;
          role_id?: string | null;
          updated_at?: string;
          user_organisation_id: string;
          venue_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_venues"]["Insert"]>;
        Relationships: [];
      };
      ingredients: {
        Row: {
          archived_at: string | null;
          best_supplier_cost_cents: number | null;
          category: string;
          cost_per_unit_cents: number;
          created_at: string;
          created_by: string | null;
          current_stock_level: number;
          id: string;
          is_active: boolean;
          name: string;
          organisation_id: string;
          status: string;
          supplier_id: string | null;
          unit: string;
          updated_at: string;
          updated_by: string | null;
          venue_id: string;
        };
        Insert: {
          archived_at?: string | null;
          best_supplier_cost_cents?: number | null;
          category?: string;
          cost_per_unit_cents?: number;
          created_at?: string;
          created_by?: string | null;
          current_stock_level?: number;
          id?: string;
          is_active?: boolean;
          name: string;
          organisation_id: string;
          status?: string;
          supplier_id?: string | null;
          unit: string;
          updated_at?: string;
          updated_by?: string | null;
          venue_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["ingredients"]["Insert"]>;
        Relationships: [];
      };
      suppliers: {
        Row: {
          abn: string | null;
          active: boolean;
          address_line1: string | null;
          address_line2: string | null;
          archived_at: string | null;
          category: string;
          certificate_expiry: string | null;
          certificate_number: string | null;
          contact_person: string | null;
          country: string | null;
          created_at: string;
          created_by: string | null;
          delivery_days: string | null;
          delivery_schedule: Json;
          email: string | null;
          haccp_certified: boolean;
          id: string;
          is_gst_registered: boolean;
          name: string;
          notes: string | null;
          order_method: string | null;
          organisation_id: string;
          payment_terms: string | null;
          phone: string | null;
          postcode: string | null;
          schedule_overrides: Json;
          state: string | null;
          suburb: string | null;
          updated_at: string;
          updated_by: string | null;
          venue_id: string | null;
        };
        Insert: {
          abn?: string | null;
          active?: boolean;
          address_line1?: string | null;
          address_line2?: string | null;
          archived_at?: string | null;
          category?: string;
          certificate_expiry?: string | null;
          certificate_number?: string | null;
          contact_person?: string | null;
          country?: string | null;
          created_at?: string;
          created_by?: string | null;
          delivery_days?: string | null;
          delivery_schedule?: Json;
          email?: string | null;
          haccp_certified?: boolean;
          id?: string;
          is_gst_registered?: boolean;
          name: string;
          notes?: string | null;
          order_method?: string | null;
          organisation_id: string;
          payment_terms?: string | null;
          phone?: string | null;
          postcode?: string | null;
          schedule_overrides?: Json;
          state?: string | null;
          suburb?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          venue_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["suppliers"]["Insert"]>;
        Relationships: [];
      };
      menu_item_recipes: {
        Row: {
          created_at: string;
          id: string;
          menu_item_id: string;
          quantity: number;
          recipe_id: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          menu_item_id: string;
          quantity?: number;
          recipe_id: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["menu_item_recipes"]["Insert"]>;
        Relationships: [];
      };
      menu_item_square_catalog_links: {
        Row: {
          created_at: string;
          id: string;
          menu_item_id: string;
          organisation_id: string;
          square_catalog_object_id: string;
          updated_at: string;
          venue_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          menu_item_id: string;
          organisation_id: string;
          square_catalog_object_id: string;
          updated_at?: string;
          venue_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["menu_item_square_catalog_links"]["Insert"]>;
        Relationships: [];
      };
      menu_items: {
        Row: {
          archived_at: string | null;
          cost_per_serve_cents: number;
          created_at: string;
          created_by: string | null;
          gp_percent: number;
          gst_mode: string;
          id: string;
          is_active: boolean;
          name: string;
          organisation_id: string;
          plu_code: string | null;
          price_cents: number;
          price_mode: string;
          section_name: string;
          show_on_menu: boolean;
          status: string;
          tags: string[];
          updated_at: string;
          updated_by: string | null;
          venue_id: string;
        };
        Insert: {
          archived_at?: string | null;
          cost_per_serve_cents?: number;
          created_at?: string;
          created_by?: string | null;
          gp_percent?: number;
          gst_mode?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          organisation_id: string;
          plu_code?: string | null;
          price_cents?: number;
          price_mode?: string;
          section_name: string;
          show_on_menu?: boolean;
          status?: string;
          tags?: string[];
          updated_at?: string;
          updated_by?: string | null;
          venue_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["menu_items"]["Insert"]>;
        Relationships: [];
      };
      recipes: {
        Row: {
          archived_at: string | null;
          category: string;
          cost_per_serve_cents: number;
          created_at: string;
          created_by: string | null;
          description: string | null;
          gp_target_percent: number;
          id: string;
          is_active: boolean;
          method: string | null;
          name: string;
          organisation_id: string;
          serves: number;
          status: string;
          suggested_price_cents: number;
          updated_at: string;
          updated_by: string | null;
          venue_id: string;
          waste_percent: number;
        };
        Insert: {
          archived_at?: string | null;
          category?: string;
          cost_per_serve_cents?: number;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          gp_target_percent?: number;
          id?: string;
          is_active?: boolean;
          method?: string | null;
          name: string;
          organisation_id: string;
          serves?: number;
          status?: string;
          suggested_price_cents?: number;
          updated_at?: string;
          updated_by?: string | null;
          venue_id: string;
          waste_percent?: number;
        };
        Update: Partial<Database["public"]["Tables"]["recipes"]["Insert"]>;
        Relationships: [];
      };
      recipe_ingredients: {
        Row: {
          created_at: string;
          id: string;
          ingredient_id: string | null;
          ingredient_name: string;
          is_sub_recipe: boolean;
          quantity: number;
          recipe_id: string;
          sort_order: number;
          sub_recipe_id: string | null;
          unit: string;
          unit_cost_cents: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          ingredient_id?: string | null;
          ingredient_name: string;
          is_sub_recipe?: boolean;
          quantity?: number;
          recipe_id: string;
          sort_order?: number;
          sub_recipe_id?: string | null;
          unit: string;
          unit_cost_cents?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["recipe_ingredients"]["Insert"]>;
        Relationships: [];
      };
      recipe_method_steps: {
        Row: {
          created_at: string;
          id: string;
          instruction: string;
          recipe_id: string;
          step_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          instruction: string;
          recipe_id: string;
          step_order: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["recipe_method_steps"]["Insert"]>;
        Relationships: [];
      };
      recipe_allergens: {
        Row: {
          allergen_code: string;
          created_at: string;
          id: string;
          recipe_id: string;
          updated_at: string;
        };
        Insert: {
          allergen_code: string;
          created_at?: string;
          id?: string;
          recipe_id: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["recipe_allergens"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_org_admin: {
        Args: { p_org_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      roster_shift_lifecycle: "draft" | "published";
      roster_shift_source:
        | "manual"
        | "copy_week"
        | "template_apply"
        | "autofill"
        | "demand_fill";
    };
    CompositeTypes: Record<string, never>;
  };
};
