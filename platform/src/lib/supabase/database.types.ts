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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_media: {
        Row: {
          alt_text_override: string | null
          branch_id: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          media_asset_id: string
          placement: Database["public"]["Enums"]["branch_media_placement"]
          sort_order: number
          starts_at: string | null
          status: Database["public"]["Enums"]["publication_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          alt_text_override?: string | null
          branch_id: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          media_asset_id: string
          placement?: Database["public"]["Enums"]["branch_media_placement"]
          sort_order?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["publication_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          alt_text_override?: string | null
          branch_id?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          media_asset_id?: string
          placement?: Database["public"]["Enums"]["branch_media_placement"]
          sort_order?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["publication_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_media_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "church_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_media_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_media_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_media_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_service_times: {
        Row: {
          branch_id: string
          created_at: string
          day_label: string
          id: string
          note: string | null
          sort_order: number
          time_label: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          day_label: string
          id?: string
          note?: string | null
          sort_order?: number
          time_label: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          day_label?: string
          id?: string
          note?: string | null
          sort_order?: number
          time_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_service_times_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "church_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_staff_assignments: {
        Row: {
          assigned_by: string | null
          branch_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          branch_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          branch_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_staff_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_staff_assignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "church_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_staff_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      church_branches: {
        Row: {
          address_lines: string[]
          archived_at: string | null
          city_label: string
          country: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_public: boolean
          maps_query: string | null
          maps_url: string | null
          name: string
          phone_display: string | null
          phone_evidence_note: string | null
          phone_tel: string | null
          phones: Json
          published_at: string | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["publication_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address_lines?: string[]
          archived_at?: string | null
          city_label?: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_public?: boolean
          maps_query?: string | null
          maps_url?: string | null
          name: string
          phone_display?: string | null
          phone_evidence_note?: string | null
          phone_tel?: string | null
          phones?: Json
          published_at?: string | null
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["publication_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address_lines?: string[]
          archived_at?: string | null
          city_label?: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_public?: boolean
          maps_query?: string | null
          maps_url?: string | null
          name?: string
          phone_display?: string | null
          phone_evidence_note?: string | null
          phone_tel?: string | null
          phones?: Json
          published_at?: string | null
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["publication_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "church_branches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "church_branches_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_revisions: {
        Row: {
          change_summary: string | null
          changed_by: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          revision_number: number
          snapshot: Json
        }
        Insert: {
          change_summary?: string | null
          changed_by?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          revision_number: number
          snapshot: Json
        }
        Update: {
          change_summary?: string | null
          changed_by?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          revision_number?: number
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "content_revisions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          body_text: string
          contact_email: string | null
          contact_phone_display: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          event_kind: Database["public"]["Enums"]["event_kind"]
          featured_media_id: string | null
          id: string
          location_branch_id: string | null
          published_at: string | null
          slug: string
          starts_at: string
          status: Database["public"]["Enums"]["publication_status"]
          summary: string
          theme: string | null
          timezone: string
          title: string
          updated_at: string
          updated_by: string | null
          venue_city: string | null
          venue_country: string | null
          venue_label: string | null
        }
        Insert: {
          body_text?: string
          contact_email?: string | null
          contact_phone_display?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          event_kind?: Database["public"]["Enums"]["event_kind"]
          featured_media_id?: string | null
          id?: string
          location_branch_id?: string | null
          published_at?: string | null
          slug: string
          starts_at: string
          status?: Database["public"]["Enums"]["publication_status"]
          summary?: string
          theme?: string | null
          timezone?: string
          title: string
          updated_at?: string
          updated_by?: string | null
          venue_city?: string | null
          venue_country?: string | null
          venue_label?: string | null
        }
        Update: {
          body_text?: string
          contact_email?: string | null
          contact_phone_display?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          event_kind?: Database["public"]["Enums"]["event_kind"]
          featured_media_id?: string | null
          id?: string
          location_branch_id?: string | null
          published_at?: string | null
          slug?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["publication_status"]
          summary?: string
          theme?: string | null
          timezone?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          venue_city?: string | null
          venue_country?: string | null
          venue_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_featured_media_id_fkey"
            columns: ["featured_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_location_branch_id_fkey"
            columns: ["location_branch_id"]
            isOneToOne: false
            referencedRelation: "church_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      website_documents: {
        Row: {
          created_at: string
          document_key: string
          id: string
          payload: Json
          published_at: string | null
          status: Database["public"]["Enums"]["publication_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          document_key: string
          id?: string
          payload?: Json
          published_at?: string | null
          status?: Database["public"]["Enums"]["publication_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          document_key?: string
          id?: string
          payload?: Json
          published_at?: string | null
          status?: Database["public"]["Enums"]["publication_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "website_documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      livestream_settings: {
        Row: {
          created_at: string
          facebook_url: string | null
          id: string
          is_live: boolean
          singleton_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          facebook_url?: string | null
          id?: string
          is_live?: boolean
          singleton_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          facebook_url?: string | null
          id?: string
          is_live?: boolean
          singleton_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "livestream_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          alt_text: string
          archived_at: string | null
          byte_size: number
          caption: string | null
          content_type: string
          created_at: string
          height_px: number | null
          id: string
          original_filename: string | null
          public_url: string
          storage_bucket: string
          storage_path: string
          updated_at: string
          uploaded_by: string | null
          width_px: number | null
        }
        Insert: {
          alt_text?: string
          archived_at?: string | null
          byte_size: number
          caption?: string | null
          content_type: string
          created_at?: string
          height_px?: number | null
          id?: string
          original_filename?: string | null
          public_url: string
          storage_bucket?: string
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
          width_px?: number | null
        }
        Update: {
          alt_text?: string
          archived_at?: string | null
          byte_size?: number
          caption?: string | null
          content_type?: string
          created_at?: string
          height_px?: number | null
          id?: string
          original_filename?: string | null
          public_url?: string
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
          width_px?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      program_sessions: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          label: string | null
          program_id: string
          session_date: string
          sort_order: number
          start_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          label?: string | null
          program_id: string
          session_date: string
          sort_order?: number
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          label?: string | null
          program_id?: string
          session_date?: string
          sort_order?: number
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          action_kind: Database["public"]["Enums"]["program_action_kind"]
          archived_at: string | null
          body_text: string
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_url: string | null
          ends_at: string | null
          featured_media_id: string | null
          id: string
          location_branch_id: string | null
          location_kind: Database["public"]["Enums"]["program_location_kind"] | null
          location_label: string | null
          placement: Database["public"]["Enums"]["program_placement"]
          published_at: string | null
          published_by: string | null
          short_description: string
          slug: string
          starts_at: string | null
          status: Database["public"]["Enums"]["publication_status"]
          timezone: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          action_kind?: Database["public"]["Enums"]["program_action_kind"]
          archived_at?: string | null
          body_text?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          featured_media_id?: string | null
          id?: string
          location_branch_id?: string | null
          location_kind?: Database["public"]["Enums"]["program_location_kind"] | null
          location_label?: string | null
          placement?: Database["public"]["Enums"]["program_placement"]
          published_at?: string | null
          published_by?: string | null
          short_description?: string
          slug: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["publication_status"]
          timezone?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          action_kind?: Database["public"]["Enums"]["program_action_kind"]
          archived_at?: string | null
          body_text?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          featured_media_id?: string | null
          id?: string
          location_branch_id?: string | null
          location_kind?: Database["public"]["Enums"]["program_location_kind"] | null
          location_label?: string | null
          placement?: Database["public"]["Enums"]["program_placement"]
          published_at?: string | null
          published_by?: string | null
          short_description?: string
          slug?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["publication_status"]
          timezone?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_featured_media_id_fkey"
            columns: ["featured_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_location_branch_id_fkey"
            columns: ["location_branch_id"]
            isOneToOne: false
            referencedRelation: "church_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      sermons: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          id: string
          published_at: string | null
          published_by: string | null
          scripture_reference: string | null
          sermon_date: string | null
          speaker: string | null
          status: Database["public"]["Enums"]["publication_status"]
          summary: string | null
          thumbnail_media_id: string | null
          title: string
          updated_at: string
          updated_by: string | null
          youtube_url: string | null
          home_featured: boolean
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          published_by?: string | null
          scripture_reference?: string | null
          sermon_date?: string | null
          speaker?: string | null
          status?: Database["public"]["Enums"]["publication_status"]
          summary?: string | null
          thumbnail_media_id?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          youtube_url?: string | null
          home_featured?: boolean
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          published_by?: string | null
          scripture_reference?: string | null
          sermon_date?: string | null
          speaker?: string | null
          status?: Database["public"]["Enums"]["publication_status"]
          summary?: string | null
          thumbnail_media_id?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          youtube_url?: string | null
          home_featured?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sermons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sermons_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sermons_thumbnail_media_id_fkey"
            columns: ["thumbnail_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sermons_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role_id?: string
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
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_branch: { Args: { p_branch_id: string }; Returns: boolean }
      has_permission: { Args: { permission_name: string }; Returns: boolean }
      has_role: { Args: { role_name: string }; Returns: boolean }
      search_public_content: {
        Args: {
          p_query: string
          p_type?: string | null
          p_limit?: number
        }
        Returns: {
          result_type: string
          title: string
          summary: string | null
          url: string
          context: string | null
          image_url: string | null
          rank_score: number
        }[]
      }
    }
    Enums: {
      branch_media_placement:
        | "hero"
        | "gallery"
        | "featured"
        | "announcement"
        | "general"
      event_kind:
        | "camp"
        | "conference"
        | "convention"
        | "retreat"
        | "special_service"
        | "other"
      program_action_kind:
        | "none"
        | "registration"
        | "youtube"
        | "facebook"
        | "other"
      program_location_kind: "branch" | "venue" | "online" | "hybrid"
      program_placement: "none" | "featured" | "banner" | "card"
      publication_status: "draft" | "preview" | "published" | "archived"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      branch_media_placement: [
        "hero",
        "gallery",
        "featured",
        "announcement",
        "general",
      ],
      event_kind: [
        "camp",
        "conference",
        "convention",
        "retreat",
        "special_service",
        "other",
      ],
      program_action_kind: [
        "none",
        "registration",
        "youtube",
        "facebook",
        "other",
      ],
      program_location_kind: ["branch", "venue", "online", "hybrid"],
      program_placement: ["none", "featured", "banner", "card"],
      publication_status: ["draft", "preview", "published", "archived"],
    },
  },
} as const
