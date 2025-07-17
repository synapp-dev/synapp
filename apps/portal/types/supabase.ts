export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      action_types: {
        Row: {
          description: string | null
          id: string
        }
        Insert: {
          description?: string | null
          id: string
        }
        Update: {
          description?: string | null
          id?: string
        }
        Relationships: []
      }
      actions: {
        Row: {
          action_type_id: string
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          label: string | null
          module_id: string | null
          name: string
          scope_id: number
        }
        Insert: {
          action_type_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          module_id?: string | null
          name: string
          scope_id: number
        }
        Update: {
          action_type_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          module_id?: string | null
          name?: string
          scope_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "actions_action_type_id_fkey"
            columns: ["action_type_id"]
            isOneToOne: false
            referencedRelation: "action_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_scope_id_fkey"
            columns: ["scope_id"]
            isOneToOne: false
            referencedRelation: "scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      app_module_role_access: {
        Row: {
          app_template_id: number | null
          can_access: boolean | null
          can_view: boolean | null
          id: string
          module_id: string | null
          role_name: string
        }
        Insert: {
          app_template_id?: number | null
          can_access?: boolean | null
          can_view?: boolean | null
          id?: string
          module_id?: string | null
          role_name: string
        }
        Update: {
          app_template_id?: number | null
          can_access?: boolean | null
          can_view?: boolean | null
          id?: string
          module_id?: string | null
          role_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_module_role_access_app_template_id_fkey"
            columns: ["app_template_id"]
            isOneToOne: false
            referencedRelation: "app_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_module_role_access_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      app_roles: {
        Row: {
          description: string | null
          id: string
          name: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      app_template_package_exclusions: {
        Row: {
          app_template_id: number | null
          id: string
          module_id: string | null
          package_id: string | null
        }
        Insert: {
          app_template_id?: number | null
          id?: string
          module_id?: string | null
          package_id?: string | null
        }
        Update: {
          app_template_id?: number | null
          id?: string
          module_id?: string | null
          package_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_template_package_exclusions_app_template_id_fkey"
            columns: ["app_template_id"]
            isOneToOne: false
            referencedRelation: "app_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_template_package_exclusions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_template_package_exclusions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      app_templates: {
        Row: {
          description: string | null
          icon: string | null
          id: number
          metadata: Json | null
          name: string
        }
        Insert: {
          description?: string | null
          icon?: string | null
          id: number
          metadata?: Json | null
          name: string
        }
        Update: {
          description?: string | null
          icon?: string | null
          id?: number
          metadata?: Json | null
          name?: string
        }
        Relationships: []
      }
      apps: {
        Row: {
          app_template_id: number
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          name: string
          organisation_id: string
          package_id: string | null
          slug: string | null
          status: string | null
        }
        Insert: {
          app_template_id: number
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          organisation_id: string
          package_id?: string | null
          slug?: string | null
          status?: string | null
        }
        Update: {
          app_template_id?: number
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          organisation_id?: string
          package_id?: string | null
          slug?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apps_app_template_id_fkey"
            columns: ["app_template_id"]
            isOneToOne: false
            referencedRelation: "app_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apps_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apps_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          app_template_id: number
          description: string | null
          icon: string | null
          id: string
          label: string
          metadata: Json | null
          name: string
          parent_module_id: string | null
          slug: string
        }
        Insert: {
          app_template_id: number
          description?: string | null
          icon?: string | null
          id?: string
          label: string
          metadata?: Json | null
          name: string
          parent_module_id?: string | null
          slug: string
        }
        Update: {
          app_template_id?: number
          description?: string | null
          icon?: string | null
          id?: string
          label?: string
          metadata?: Json | null
          name?: string
          parent_module_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_app_template_id_fkey"
            columns: ["app_template_id"]
            isOneToOne: false
            referencedRelation: "app_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_parent_module_id_fkey"
            columns: ["parent_module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_roles: {
        Row: {
          description: string | null
          id: string
          name: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      organisations: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          metadata: Json | null
          name: string
          settings: Json | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          metadata?: Json | null
          name: string
          settings?: Json | null
          slug: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          settings?: Json | null
          slug?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          base_package_id: string | null
          description: string | null
          id: string
          is_custom: boolean | null
          name: string
          organisation_id: string | null
        }
        Insert: {
          base_package_id?: string | null
          description?: string | null
          id?: string
          is_custom?: boolean | null
          name: string
          organisation_id?: string | null
        }
        Update: {
          base_package_id?: string | null
          description?: string | null
          id?: string
          is_custom?: boolean | null
          name?: string
          organisation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packages_base_package_id_fkey"
            columns: ["base_package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_target_types: {
        Row: {
          description: string | null
          id: string
        }
        Insert: {
          description?: string | null
          id: string
        }
        Update: {
          description?: string | null
          id?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action_id: string
          allow: boolean
          created_at: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          notes: string | null
          target_id: string
          target_type_id: string
        }
        Insert: {
          action_id: string
          allow?: boolean
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          target_id: string
          target_type_id: string
        }
        Update: {
          action_id?: string
          allow?: boolean
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          target_id?: string
          target_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissions_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permissions_target_type_id_fkey"
            columns: ["target_type_id"]
            isOneToOne: false
            referencedRelation: "permission_target_types"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_roles: {
        Row: {
          description: string | null
          id: string
          name: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      scopes: {
        Row: {
          description: string | null
          id: number
          name: string
        }
        Insert: {
          description?: string | null
          id: number
          name: string
        }
        Update: {
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      system_users: {
        Row: {
          biography_description: string | null
          biography_title: string | null
          birthday: string | null
          business_number: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          linkedin_url: string | null
          location: string | null
          mobile_number: string | null
          position_title: string | null
          profile_picture_url: string | null
          settings: Json | null
        }
        Insert: {
          biography_description?: string | null
          biography_title?: string | null
          birthday?: string | null
          business_number?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          mobile_number?: string | null
          position_title?: string | null
          profile_picture_url?: string | null
          settings?: Json | null
        }
        Update: {
          biography_description?: string | null
          biography_title?: string | null
          birthday?: string | null
          business_number?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          mobile_number?: string | null
          position_title?: string | null
          profile_picture_url?: string | null
          settings?: Json | null
        }
        Relationships: []
      }
      user_app_roles: {
        Row: {
          app_id: string
          assigned_at: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          notes: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          app_id: string
          assigned_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          app_id?: string
          assigned_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_app_roles_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_app_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "app_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_app_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "system_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_organisation_roles: {
        Row: {
          assigned_at: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          notes: string | null
          organisation_id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          organisation_id: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          organisation_id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_organisation_roles_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_organisation_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "organisation_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_organisation_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "system_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_platform_roles: {
        Row: {
          assigned_at: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          notes: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_platform_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "platform_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_platform_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "system_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
