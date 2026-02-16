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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      class_years: {
        Row: {
          class_id: string
          school_year_id: string
        }
        Insert: {
          class_id: string
          school_year_id: string
        }
        Update: {
          class_id?: string
          school_year_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_years_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_years_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_years_school_year_id_fkey"
            columns: ["school_year_id"]
            isOneToOne: false
            referencedRelation: "school_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_years_school_year_id_fkey"
            columns: ["school_year_id"]
            isOneToOne: false
            referencedRelation: "v_school_years"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          active: boolean
          code: string | null
          created_at: string
          id: string
          name: string
          room: string | null
          school_id: string
          stream: string | null
          student_cap: number | null
        }
        Insert: {
          active?: boolean
          code?: string | null
          created_at?: string
          id?: string
          name: string
          room?: string | null
          school_id: string
          stream?: string | null
          student_cap?: number | null
        }
        Update: {
          active?: boolean
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          room?: string | null
          school_id?: string
          stream?: string | null
          student_cap?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_level_badge"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "v_schools_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "v_schools_readable"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_stages: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          sort_index: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          sort_index: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          sort_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      lesson_classes: {
        Row: {
          class_id: string
          lesson_id: string
        }
        Insert: {
          class_id: string
          lesson_id: string
        }
        Update: {
          class_id?: string
          lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_classes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_classes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "v_lesson_allowed_slides"
            referencedColumns: ["lesson_id"]
          },
          {
            foreignKeyName: "lesson_classes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "v_lesson_slides_effective"
            referencedColumns: ["lesson_id"]
          },
        ]
      }
      lesson_events: {
        Row: {
          actor_user_id: string
          created_at: string
          from_slide_id: string | null
          id: number
          kind: string
          lesson_id: string
          session_id: string
          to_index: number | null
          to_slide_id: string | null
        }
        Insert: {
          actor_user_id: string
          created_at?: string
          from_slide_id?: string | null
          id?: number
          kind: string
          lesson_id: string
          session_id: string
          to_index?: number | null
          to_slide_id?: string | null
        }
        Update: {
          actor_user_id?: string
          created_at?: string
          from_slide_id?: string | null
          id?: number
          kind?: string
          lesson_id?: string
          session_id?: string
          to_index?: number | null
          to_slide_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_events_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_events_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "v_lesson_allowed_slides"
            referencedColumns: ["lesson_id"]
          },
          {
            foreignKeyName: "lesson_events_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "v_lesson_slides_effective"
            referencedColumns: ["lesson_id"]
          },
          {
            foreignKeyName: "lesson_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lesson_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_live_state: {
        Row: {
          current_index: number
          current_slide_id: string
          is_paused: boolean
          lesson_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          current_index: number
          current_slide_id: string
          is_paused?: boolean
          lesson_id: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          current_index?: number
          current_slide_id?: string
          is_paused?: boolean
          lesson_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_live_state_current_slide_id_fkey"
            columns: ["current_slide_id"]
            isOneToOne: false
            referencedRelation: "topic_slides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_live_state_current_slide_id_fkey"
            columns: ["current_slide_id"]
            isOneToOne: false
            referencedRelation: "v_lesson_allowed_slides"
            referencedColumns: ["topic_slide_id"]
          },
          {
            foreignKeyName: "lesson_live_state_current_slide_id_fkey"
            columns: ["current_slide_id"]
            isOneToOne: false
            referencedRelation: "v_lesson_slides_effective"
            referencedColumns: ["topic_slide_id"]
          },
          {
            foreignKeyName: "lesson_live_state_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_live_state_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "v_lesson_allowed_slides"
            referencedColumns: ["lesson_id"]
          },
          {
            foreignKeyName: "lesson_live_state_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "v_lesson_slides_effective"
            referencedColumns: ["lesson_id"]
          },
        ]
      }
      lesson_sessions: {
        Row: {
          ended_at: string | null
          id: string
          lesson_id: string
          started_at: string
          started_by: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          lesson_id: string
          started_at?: string
          started_by: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          lesson_id?: string
          started_at?: string
          started_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_sessions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_sessions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "v_lesson_allowed_slides"
            referencedColumns: ["lesson_id"]
          },
          {
            foreignKeyName: "lesson_sessions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "v_lesson_slides_effective"
            referencedColumns: ["lesson_id"]
          },
        ]
      }
      lesson_slide_notes: {
        Row: {
          lesson_id: string
          notes_richtext: string | null
          topic_slide_id: string
          updated_at: string
        }
        Insert: {
          lesson_id: string
          notes_richtext?: string | null
          topic_slide_id: string
          updated_at?: string
        }
        Update: {
          lesson_id?: string
          notes_richtext?: string | null
          topic_slide_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_slide_notes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_slide_notes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "v_lesson_allowed_slides"
            referencedColumns: ["lesson_id"]
          },
          {
            foreignKeyName: "lesson_slide_notes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "v_lesson_slides_effective"
            referencedColumns: ["lesson_id"]
          },
          {
            foreignKeyName: "lesson_slide_notes_topic_slide_id_fkey"
            columns: ["topic_slide_id"]
            isOneToOne: false
            referencedRelation: "topic_slides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_slide_notes_topic_slide_id_fkey"
            columns: ["topic_slide_id"]
            isOneToOne: false
            referencedRelation: "v_lesson_allowed_slides"
            referencedColumns: ["topic_slide_id"]
          },
          {
            foreignKeyName: "lesson_slide_notes_topic_slide_id_fkey"
            columns: ["topic_slide_id"]
            isOneToOne: false
            referencedRelation: "v_lesson_slides_effective"
            referencedColumns: ["topic_slide_id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          id: string
          scheduled_for: string | null
          school_id: string
          status: string
          topic_id: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          scheduled_for?: string | null
          school_id: string
          status?: string
          topic_id: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          scheduled_for?: string | null
          school_id?: string
          status?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_level_badge"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "lessons_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "v_schools_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "v_schools_readable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          description: string | null
          id: string
          key: string | null
          name: string
          scope_id: string
        }
        Insert: {
          description?: string | null
          id?: string
          key?: string | null
          name: string
          scope_id: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string | null
          name?: string
          scope_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_scope_id_fkey"
            columns: ["scope_id"]
            isOneToOne: false
            referencedRelation: "scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      school_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          created_by: string | null
          email: string
          id: string
          role_key: string
          school_id: string
          sent_at: string
          status: Database["public"]["Enums"]["invite_status"]
          token: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          role_key: string
          school_id: string
          sent_at?: string
          status?: Database["public"]["Enums"]["invite_status"]
          token: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          role_key?: string
          school_id?: string
          sent_at?: string
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_invites_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_level_badge"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "school_invites_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_invites_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "v_schools_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_invites_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "v_schools_readable"
            referencedColumns: ["id"]
          },
        ]
      }
      school_level_assignments: {
        Row: {
          level_id: string
          school_id: string
        }
        Insert: {
          level_id: string
          school_id: string
        }
        Update: {
          level_id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_level_assignments_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "school_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_level_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_level_badge"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "school_level_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_level_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "v_schools_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_level_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "v_schools_readable"
            referencedColumns: ["id"]
          },
        ]
      }
      school_levels: {
        Row: {
          id: string
          key: string
          name: string
        }
        Insert: {
          id?: string
          key: string
          name: string
        }
        Update: {
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      school_licences: {
        Row: {
          auto_renew: boolean
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          plan: string
          school_id: string
          starts_at: string
          status: Database["public"]["Enums"]["licence_status"]
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          plan?: string
          school_id: string
          starts_at?: string
          status?: Database["public"]["Enums"]["licence_status"]
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          plan?: string
          school_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["licence_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_licences_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_level_badge"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "school_licences_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_licences_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "v_schools_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_licences_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "v_schools_readable"
            referencedColumns: ["id"]
          },
        ]
      }
      school_sectors: {
        Row: {
          id: string
          key: string
          name: string
        }
        Insert: {
          id?: string
          key: string
          name: string
        }
        Update: {
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      school_years: {
        Row: {
          code: string
          display_name: string
          id: string
          level_id: string
          sort_index: number
        }
        Insert: {
          code: string
          display_name: string
          id?: string
          level_id: string
          sort_index: number
        }
        Update: {
          code?: string
          display_name?: string
          id?: string
          level_id?: string
          sort_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "school_years_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "school_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          avatar_url: string | null
          banner_url: string | null
          code: string | null
          created_at: string | null
          email_domain: string | null
          id: string
          joined_at: string | null
          name: string
          sector_id: string | null
          slug: string | null
          state_id: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          code?: string | null
          created_at?: string | null
          email_domain?: string | null
          id?: string
          joined_at?: string | null
          name: string
          sector_id?: string | null
          slug?: string | null
          state_id?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          code?: string | null
          created_at?: string | null
          email_domain?: string | null
          id?: string
          joined_at?: string | null
          name?: string
          sector_id?: string | null
          slug?: string | null
          state_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "school_sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schools_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      scopes: {
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
      stage_year_links: {
        Row: {
          school_year_id: string
          stage_id: string
        }
        Insert: {
          school_year_id: string
          stage_id: string
        }
        Update: {
          school_year_id?: string
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_year_links_school_year_id_fkey"
            columns: ["school_year_id"]
            isOneToOne: false
            referencedRelation: "school_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_year_links_school_year_id_fkey"
            columns: ["school_year_id"]
            isOneToOne: false
            referencedRelation: "v_school_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_year_links_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "curriculum_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_year_links_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "v_curriculum_stages_years"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "stage_year_links_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "v_stage_thresholds"
            referencedColumns: ["stage_id"]
          },
        ]
      }
      states: {
        Row: {
          code: string
          id: string
          name: string
        }
        Insert: {
          code: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      teacher_slide_notes: {
        Row: {
          notes_richtext: string | null
          teacher_user_id: string
          topic_slide_id: string
          updated_at: string
        }
        Insert: {
          notes_richtext?: string | null
          teacher_user_id: string
          topic_slide_id: string
          updated_at?: string
        }
        Update: {
          notes_richtext?: string | null
          teacher_user_id?: string
          topic_slide_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_slide_notes_topic_slide_id_fkey"
            columns: ["topic_slide_id"]
            isOneToOne: false
            referencedRelation: "topic_slides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_slide_notes_topic_slide_id_fkey"
            columns: ["topic_slide_id"]
            isOneToOne: false
            referencedRelation: "v_lesson_allowed_slides"
            referencedColumns: ["topic_slide_id"]
          },
          {
            foreignKeyName: "teacher_slide_notes_topic_slide_id_fkey"
            columns: ["topic_slide_id"]
            isOneToOne: false
            referencedRelation: "v_lesson_slides_effective"
            referencedColumns: ["topic_slide_id"]
          },
        ]
      }
      topic_slides: {
        Row: {
          created_at: string
          duration_sec: number | null
          id: string
          image_url: string | null
          kind: string
          official_notes: string | null
          order_index: number
          text_html: string | null
          topic_id: string
          updated_at: string
          video_end_s: number | null
          video_start_s: number | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          duration_sec?: number | null
          id?: string
          image_url?: string | null
          kind: string
          official_notes?: string | null
          order_index: number
          text_html?: string | null
          topic_id: string
          updated_at?: string
          video_end_s?: number | null
          video_start_s?: number | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          duration_sec?: number | null
          id?: string
          image_url?: string | null
          kind?: string
          official_notes?: string | null
          order_index?: number
          text_html?: string | null
          topic_id?: string
          updated_at?: string
          video_end_s?: number | null
          video_start_s?: number | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topic_slides_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          id: string
          official_notes: string | null
          stage_id: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          official_notes?: string | null
          stage_id: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          official_notes?: string | null
          stage_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "curriculum_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "v_curriculum_stages_years"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "topics_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "v_stage_thresholds"
            referencedColumns: ["stage_id"]
          },
        ]
      }
      user_profile: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          metadata: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          id: string
          role_id: string
          role_scope: string | null
          school_id: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          role_id: string
          role_scope?: string | null
          school_id?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          role_id?: string
          role_scope?: string | null
          school_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_level_badge"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "user_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "v_schools_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "v_schools_readable"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      school_level_badge: {
        Row: {
          level_badge: string | null
          school_id: string | null
        }
        Relationships: []
      }
      v_classes_years: {
        Row: {
          id: string | null
          level_key: string | null
          level_name: string | null
          name: string | null
          school_id: string | null
          year_code_range: string | null
          year_codes: string[] | null
          year_name_range: string | null
          year_names: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_level_badge"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "v_schools_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "v_schools_readable"
            referencedColumns: ["id"]
          },
        ]
      }
      v_curriculum_stages_years: {
        Row: {
          max_sort_index: number | null
          min_sort_index: number | null
          stage_code: string | null
          stage_id: string | null
          stage_name: string | null
          year_code_range: string | null
          year_codes: string[] | null
          year_name_range: string | null
          year_names: string[] | null
        }
        Relationships: []
      }
      v_lesson_allowed_slides: {
        Row: {
          lesson_id: string | null
          order_index: number | null
          topic_slide_id: string | null
        }
        Relationships: []
      }
      v_lesson_slides_effective: {
        Row: {
          effective_notes: string | null
          image_url: string | null
          kind: string | null
          lesson_id: string | null
          order_index: number | null
          teacher_user_id: string | null
          text_html: string | null
          topic_id: string | null
          topic_slide_id: string | null
          video_end_s: number | null
          video_start_s: number | null
          video_url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      v_school_years: {
        Row: {
          code: string | null
          display_name: string | null
          id: string | null
          level_id: string | null
          level_key: string | null
          level_name: string | null
          sort_index: number | null
        }
        Relationships: [
          {
            foreignKeyName: "school_years_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "school_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      v_schools_enriched: {
        Row: {
          address: string | null
          code: string | null
          created_at: string | null
          email_domain: string | null
          id: string | null
          joined_at: string | null
          levels: Json | null
          name: string | null
          sector: Json | null
          slug: string | null
          state: Json | null
        }
        Relationships: []
      }
      v_schools_readable: {
        Row: {
          address: string | null
          avatar_url: string | null
          banner_url: string | null
          code: string | null
          created_at: string | null
          email_domain: string | null
          id: string | null
          joined_at: string | null
          levels: string[] | null
          name: string | null
          sector: string | null
          sector_id: string | null
          slug: string | null
          state: string | null
          state_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "school_sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schools_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      v_stage_thresholds: {
        Row: {
          max_sort_index: number | null
          min_sort_index: number | null
          stage_id: string | null
        }
        Relationships: []
      }
      v_user_profile_expanded: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string | null
          last_name: string | null
          metadata: Json | null
          platform_roles: string[] | null
          school_roles: Json | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      advance_slide: {
        Args: {
          p_direction: number
          p_lesson: string
          p_prev_updated_at?: string
        }
        Returns: {
          current_index: number
          current_kind: string
          current_slide_id: string
          lesson_id: string
          moved: boolean
          updated_at: string
        }[]
      }
      has_any_role: {
        Args: { role_keys: string[]; school?: string }
        Returns: boolean
      }
      has_role: {
        Args: { role_key: string } | { role_key: string; school?: string }
        Returns: boolean
      }
      jump_to_slide: {
        Args: {
          p_lesson: string
          p_prev_updated_at?: string
          p_to_index: number
        }
        Returns: {
          current_index: number
          current_kind: string
          current_slide_id: string
          lesson_id: string
          moved: boolean
          updated_at: string
        }[]
      }
      make_school_slug_base: {
        Args: { p_name: string; p_state_id: string }
        Returns: string
      }
      pick_school_slug: {
        Args: { p_id: string; p_name: string; p_state_id: string }
        Returns: string
      }
      slugify_text: {
        Args: { p_text: string }
        Returns: string
      }
      unaccent: {
        Args: { "": string }
        Returns: string
      }
      unaccent_init: {
        Args: { "": unknown }
        Returns: unknown
      }
      update_my_last_seen: {
        Args: Record<string, never>
        Returns: undefined
      }
    }
    Enums: {
      invite_status: "PENDING" | "ACCEPTED" | "CANCELLED" | "EXPIRED"
      licence_status:
        | "DRAFT"
        | "PENDING"
        | "ACTIVE"
        | "SUSPENDED"
        | "EXPIRED"
        | "CANCELLED"
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
      invite_status: ["PENDING", "ACCEPTED", "CANCELLED", "EXPIRED"],
      licence_status: [
        "DRAFT",
        "PENDING",
        "ACTIVE",
        "SUSPENDED",
        "EXPIRED",
        "CANCELLED",
      ],
    },
  },
} as const
