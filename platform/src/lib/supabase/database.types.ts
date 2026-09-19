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
      giving_account_numbers: {
        Row: {
          account_number: string
          created_at: string
          currency: string
          display_order: number
          giving_account_id: string
          id: string
          updated_at: string
        }
        Insert: {
          account_number: string
          created_at?: string
          currency: string
          display_order?: number
          giving_account_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          account_number?: string
          created_at?: string
          currency?: string
          display_order?: number
          giving_account_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "giving_account_numbers_giving_account_id_fkey"
            columns: ["giving_account_id"]
            isOneToOne: false
            referencedRelation: "giving_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      giving_accounts: {
        Row: {
          account_name: string
          bank_name: string
          country: string | null
          created_at: string
          created_by: string | null
          description: string
          display_order: number
          external_url: string | null
          id: string
          label: string
          stable_key: string
          status: Database["public"]["Enums"]["giving_account_status"]
          swift_bic: string | null
          updated_at: string
          updated_by: string | null
          version: number
          visitor_note: string | null
        }
        Insert: {
          account_name: string
          bank_name: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          display_order?: number
          external_url?: string | null
          id?: string
          label: string
          stable_key: string
          status?: Database["public"]["Enums"]["giving_account_status"]
          swift_bic?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          visitor_note?: string | null
        }
        Update: {
          account_name?: string
          bank_name?: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          display_order?: number
          external_url?: string | null
          id?: string
          label?: string
          stable_key?: string
          status?: Database["public"]["Enums"]["giving_account_status"]
          swift_bic?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          visitor_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "giving_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "giving_accounts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      giving_change_proposals: {
        Row: {
          applied_at: string | null
          base_snapshot: Json | null
          base_version: number | null
          created_at: string
          id: string
          proposal_type: Database["public"]["Enums"]["giving_proposal_type"]
          proposed_snapshot: Json
          proposer_id: string
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["giving_proposal_status"]
          submitted_at: string | null
          target_account_id: string | null
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          base_snapshot?: Json | null
          base_version?: number | null
          created_at?: string
          id?: string
          proposal_type: Database["public"]["Enums"]["giving_proposal_type"]
          proposed_snapshot: Json
          proposer_id: string
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["giving_proposal_status"]
          submitted_at?: string | null
          target_account_id?: string | null
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          base_snapshot?: Json | null
          base_version?: number | null
          created_at?: string
          id?: string
          proposal_type?: Database["public"]["Enums"]["giving_proposal_type"]
          proposed_snapshot?: Json
          proposer_id?: string
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["giving_proposal_status"]
          submitted_at?: string | null
          target_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "giving_change_proposals_proposer_id_fkey"
            columns: ["proposer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "giving_change_proposals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "giving_change_proposals_target_account_id_fkey"
            columns: ["target_account_id"]
            isOneToOne: false
            referencedRelation: "giving_accounts"
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
          auto_end_at: string | null
          created_at: string
          facebook_url: string | null
          id: string
          is_live: boolean
          singleton_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_end_at?: string | null
          created_at?: string
          facebook_url?: string | null
          id?: string
          is_live?: boolean
          singleton_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_end_at?: string | null
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
      pastoral_case_notes: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          request_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          request_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          request_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pastoral_case_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pastoral_case_notes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "pastoral_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      pastoral_requests: {
        Row: {
          assigned_to: string | null
          branch_id: string | null
          closed_at: string | null
          contact_requested: boolean
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          narrative: string
          phone: string | null
          preferred_contact_method: Database["public"]["Enums"]["care_contact_method"] | null
          preferred_contact_timing: string | null
          reference_code: string
          request_category: string | null
          service_type: Database["public"]["Enums"]["care_service_type"]
          status: Database["public"]["Enums"]["care_request_status"]
          submitted_at: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          branch_id?: string | null
          closed_at?: string | null
          contact_requested?: boolean
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          narrative: string
          phone?: string | null
          preferred_contact_method?: Database["public"]["Enums"]["care_contact_method"] | null
          preferred_contact_timing?: string | null
          reference_code?: string
          request_category?: string | null
          service_type: Database["public"]["Enums"]["care_service_type"]
          status?: Database["public"]["Enums"]["care_request_status"]
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          branch_id?: string | null
          closed_at?: string | null
          contact_requested?: boolean
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          narrative?: string
          phone?: string | null
          preferred_contact_method?: Database["public"]["Enums"]["care_contact_method"] | null
          preferred_contact_timing?: string | null
          reference_code?: string
          request_category?: string | null
          service_type?: Database["public"]["Enums"]["care_service_type"]
          status?: Database["public"]["Enums"]["care_request_status"]
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pastoral_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pastoral_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "church_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      care_intake_rate_limits: {
        Row: {
          attempt_count: number
          requester_key: string
          service_type: Database["public"]["Enums"]["care_service_type"]
          updated_at: string
          window_started_at: string
        }
        Insert: {
          attempt_count?: number
          requester_key: string
          service_type: Database["public"]["Enums"]["care_service_type"]
          updated_at?: string
          window_started_at: string
        }
        Update: {
          attempt_count?: number
          requester_key?: string
          service_type?: Database["public"]["Enums"]["care_service_type"]
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_giving_change_proposal: {
        Args: { p_proposal_id: string; p_review_reason?: string | null }
        Returns: Database["public"]["Tables"]["giving_change_proposals"]["Row"]
      }
      can_assign_pastoral_request: {
        Args: { p_service: Database["public"]["Enums"]["care_service_type"] }
        Returns: boolean
      }
      can_manage_branch: { Args: { p_branch_id: string }; Returns: boolean }
      can_select_pastoral_request: {
        Args: {
          p_service: Database["public"]["Enums"]["care_service_type"]
          p_assigned_to: string | null
        }
        Returns: boolean
      }
      can_view_giving_admin: { Args: never; Returns: boolean }
      care_assign_permission_for: {
        Args: { p_service: Database["public"]["Enums"]["care_service_type"] }
        Returns: string
      }
      care_assignable_staff: {
        Args: never
        Returns: {
          display_name: string | null
          email: string | null
          id: string
        }
      }
      care_generate_reference_code: { Args: never; Returns: string }
      care_intake_rate_limit_consume: {
        Args: {
          p_requester_key: string
          p_service: Database["public"]["Enums"]["care_service_type"]
          p_limit?: number
          p_window_seconds?: number
        }
        Returns: Json
      }
      care_read_permission_for: {
        Args: { p_service: Database["public"]["Enums"]["care_service_type"] }
        Returns: string
      }
      giving_snapshot_account: { Args: { p_account_id: string }; Returns: Json }
      giving_validate_snapshot: { Args: { p_snapshot: Json }; Returns: string }
      has_permission: { Args: { permission_name: string }; Returns: boolean }
      has_role: { Args: { role_name: string }; Returns: boolean }
      reject_giving_change_proposal: {
        Args: { p_proposal_id: string; p_review_reason: string }
        Returns: Database["public"]["Tables"]["giving_change_proposals"]["Row"]
      }
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
      submit_giving_change_proposal: {
        Args: { p_proposal_id: string }
        Returns: Database["public"]["Tables"]["giving_change_proposals"]["Row"]
      }
      withdraw_giving_change_proposal: {
        Args: { p_proposal_id: string }
        Returns: Database["public"]["Tables"]["giving_change_proposals"]["Row"]
      }
    }
    Enums: {
      branch_media_placement:
        | "hero"
        | "gallery"
        | "featured"
        | "announcement"
        | "general"
      care_contact_method: "email" | "phone" | "either" | "in_person"
      care_request_status: "new" | "in_progress" | "closed"
      care_service_type: "prayer" | "pastoral" | "welfare"
      event_kind:
        | "camp"
        | "conference"
        | "convention"
        | "retreat"
        | "special_service"
        | "other"
      giving_account_status: "draft" | "published" | "disabled"
      giving_proposal_status:
        | "draft"
        | "pending"
        | "approved"
        | "rejected"
        | "superseded"
      giving_proposal_type: "create" | "update" | "disable" | "enable"
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
      care_contact_method: ["email", "phone", "either", "in_person"],
      care_request_status: ["new", "in_progress", "closed"],
      care_service_type: ["prayer", "pastoral", "welfare"],
      event_kind: [
        "camp",
        "conference",
        "convention",
        "retreat",
        "special_service",
        "other",
      ],
      giving_account_status: ["draft", "published", "disabled"],
      giving_proposal_status: [
        "draft",
        "pending",
        "approved",
        "rejected",
        "superseded",
      ],
      giving_proposal_type: ["create", "update", "disable", "enable"],
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
