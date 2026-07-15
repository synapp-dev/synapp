export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      certifications: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          org_id: string
          updated_at: string
          validity_months: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          org_id: string
          updated_at?: string
          validity_months?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          org_id?: string
          updated_at?: string
          validity_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "certifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["department_kind"]
          name: string
          org_id: string
          station_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["department_kind"]
          name: string
          org_id: string
          station_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["department_kind"]
          name?: string
          org_id?: string
          station_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_certifications: {
        Row: {
          certification_id: string
          created_at: string
          employee_id: string
          expires_on: string | null
          id: string
          issued_on: string
          org_id: string
          updated_at: string
        }
        Insert: {
          certification_id: string
          created_at?: string
          employee_id: string
          expires_on?: string | null
          id?: string
          issued_on: string
          org_id: string
          updated_at?: string
        }
        Update: {
          certification_id?: string
          created_at?: string
          employee_id?: string
          expires_on?: string | null
          id?: string
          issued_on?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_certifications_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_certifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_certifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          department_id: string | null
          email: string | null
          employee_code: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          full_name: string
          id: string
          job_title: string | null
          org_id: string
          phone: string | null
          profile_id: string | null
          started_on: string | null
          station_id: string | null
          status: Database["public"]["Enums"]["employee_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email?: string | null
          employee_code: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          full_name: string
          id?: string
          job_title?: string | null
          org_id: string
          phone?: string | null
          profile_id?: string | null
          started_on?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string | null
          employee_code?: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          full_name?: string
          id?: string
          job_title?: string | null
          org_id?: string
          phone?: string | null
          profile_id?: string | null
          started_on?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          org_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          org_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          org_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      request_approvals: {
        Row: {
          assignee_employee_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision: Database["public"]["Enums"]["approval_decision"]
          id: string
          label: string
          note: string | null
          org_id: string
          request_id: string
          role: Database["public"]["Enums"]["approval_role"]
          signature_name: string | null
          step_order: number
          updated_at: string
        }
        Insert: {
          assignee_employee_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: Database["public"]["Enums"]["approval_decision"]
          id?: string
          label: string
          note?: string | null
          org_id: string
          request_id: string
          role: Database["public"]["Enums"]["approval_role"]
          signature_name?: string | null
          step_order: number
          updated_at?: string
        }
        Update: {
          assignee_employee_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: Database["public"]["Enums"]["approval_decision"]
          id?: string
          label?: string
          note?: string | null
          org_id?: string
          request_id?: string
          role?: Database["public"]["Enums"]["approval_role"]
          signature_name?: string | null
          step_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_approvals_assignee_employee_id_fkey"
            columns: ["assignee_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_approvals_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_approvals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          file_name: string
          id: string
          org_id: string
          request_id: string
          size_bytes: number | null
          storage_path: string | null
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_name: string
          id?: string
          org_id: string
          request_id: string
          size_bytes?: number | null
          storage_path?: string | null
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_name?: string
          id?: string
          org_id?: string
          request_id?: string
          size_bytes?: number | null
          storage_path?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_attachments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      request_events: {
        Row: {
          actor_id: string | null
          created_at: string
          detail: Json
          id: string
          kind: Database["public"]["Enums"]["request_event_kind"]
          org_id: string
          request_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          detail?: Json
          id?: string
          kind: Database["public"]["Enums"]["request_event_kind"]
          org_id: string
          request_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          detail?: Json
          id?: string
          kind?: Database["public"]["Enums"]["request_event_kind"]
          org_id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          created_at: string
          created_by: string | null
          current_step: number
          department_id: string | null
          employee_id: string | null
          id: string
          kind: Database["public"]["Enums"]["request_kind"]
          org_id: string
          payload: Json
          reference: string
          resolution_note: string | null
          resolved_at: string | null
          station_id: string | null
          status: Database["public"]["Enums"]["request_status"]
          submitted_at: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_step?: number
          department_id?: string | null
          employee_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["request_kind"]
          org_id: string
          payload?: Json
          reference: string
          resolution_note?: string | null
          resolved_at?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          submitted_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_step?: number
          department_id?: string | null
          employee_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["request_kind"]
          org_id?: string
          payload?: Json
          reference?: string
          resolution_note?: string | null
          resolved_at?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          submitted_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      roster_periods: {
        Row: {
          created_at: string
          ends_on: string
          id: string
          name: string
          org_id: string
          published_at: string | null
          starts_on: string
          station_id: string
          status: Database["public"]["Enums"]["roster_period_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_on: string
          id?: string
          name: string
          org_id: string
          published_at?: string | null
          starts_on: string
          station_id: string
          status?: Database["public"]["Enums"]["roster_period_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_on?: string
          id?: string
          name?: string
          org_id?: string
          published_at?: string | null
          starts_on?: string
          station_id?: string
          status?: Database["public"]["Enums"]["roster_period_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roster_periods_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_periods_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_assignments: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          note: string | null
          org_id: string
          shift_id: string
          status: Database["public"]["Enums"]["shift_assignment_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          note?: string | null
          org_id: string
          shift_id: string
          status?: Database["public"]["Enums"]["shift_assignment_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          note?: string | null
          org_id?: string
          shift_id?: string
          status?: Database["public"]["Enums"]["shift_assignment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_templates: {
        Row: {
          created_at: string
          department_id: string | null
          end_time: string
          id: string
          name: string
          org_id: string
          required_headcount: number
          start_time: string
          station_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          end_time: string
          id?: string
          name: string
          org_id: string
          required_headcount?: number
          start_time: string
          station_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          end_time?: string
          id?: string
          name?: string
          org_id?: string
          required_headcount?: number
          start_time?: string
          station_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_templates_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_templates_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string
          department_id: string | null
          end_time: string
          id: string
          notes: string | null
          org_id: string
          required_headcount: number
          roster_period_id: string
          shift_date: string
          start_time: string
          station_id: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          end_time: string
          id?: string
          notes?: string | null
          org_id: string
          required_headcount?: number
          roster_period_id: string
          shift_date: string
          start_time: string
          station_id: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          org_id?: string
          required_headcount?: number
          roster_period_id?: string
          shift_date?: string
          start_time?: string
          station_id?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_roster_period_id_fkey"
            columns: ["roster_period_id"]
            isOneToOne: false
            referencedRelation: "roster_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "shift_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      stations: {
        Row: {
          created_at: string
          iata_code: string
          icao_code: string | null
          id: string
          name: string
          org_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          iata_code: string
          icao_code?: string | null
          id?: string
          name: string
          org_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          iata_code?: string
          icao_code?: string | null
          id?: string
          name?: string
          org_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_request: { Args: { target_request: string }; Returns: boolean }
      is_org_manager: { Args: { target_org: string }; Returns: boolean }
      is_org_member: { Args: { target_org: string }; Returns: boolean }
      is_request_assignee: {
        Args: { target_request: string }
        Returns: boolean
      }
      owns_employee: { Args: { target_employee: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "employee"
      approval_decision: "pending" | "approved" | "declined" | "skipped"
      approval_role:
        | "requestee"
        | "supervisor"
        | "allocator"
        | "manager"
        | "dept_manager"
        | "station_manager"
        | "payroll"
        | "hr"
      department_kind:
        | "ramp"
        | "passenger_services"
        | "cargo"
        | "fueling"
        | "lounge"
        | "maintenance"
        | "admin"
        | "other"
      employee_status: "active" | "inactive" | "onboarding"
      employment_type: "full_time" | "part_time" | "casual"
      request_event_kind:
        | "created"
        | "submitted"
        | "approved"
        | "declined"
        | "commented"
        | "cancelled"
        | "actioned"
      request_kind:
        | "leave_application"
        | "leave_request"
        | "shift_swap"
        | "line_swap"
        | "higher_duty"
        | "leave_cashout"
        | "pay_query"
        | "change_of_details"
        | "uniform_order"
      request_status:
        | "draft"
        | "submitted"
        | "in_review"
        | "approved"
        | "declined"
        | "cancelled"
        | "actioned"
      roster_period_status: "draft" | "published" | "locked"
      shift_assignment_status:
        | "assigned"
        | "confirmed"
        | "declined"
        | "completed"
        | "no_show"
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
    Enums: {
      app_role: ["admin", "manager", "employee"],
      approval_decision: ["pending", "approved", "declined", "skipped"],
      approval_role: [
        "requestee",
        "supervisor",
        "allocator",
        "manager",
        "dept_manager",
        "station_manager",
        "payroll",
        "hr",
      ],
      department_kind: [
        "ramp",
        "passenger_services",
        "cargo",
        "fueling",
        "lounge",
        "maintenance",
        "admin",
        "other",
      ],
      employee_status: ["active", "inactive", "onboarding"],
      employment_type: ["full_time", "part_time", "casual"],
      request_event_kind: [
        "created",
        "submitted",
        "approved",
        "declined",
        "commented",
        "cancelled",
        "actioned",
      ],
      request_kind: [
        "leave_application",
        "leave_request",
        "shift_swap",
        "line_swap",
        "higher_duty",
        "leave_cashout",
        "pay_query",
        "change_of_details",
        "uniform_order",
      ],
      request_status: [
        "draft",
        "submitted",
        "in_review",
        "approved",
        "declined",
        "cancelled",
        "actioned",
      ],
      roster_period_status: ["draft", "published", "locked"],
      shift_assignment_status: [
        "assigned",
        "confirmed",
        "declined",
        "completed",
        "no_show",
      ],
    },
  },
} as const
