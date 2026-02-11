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
      audit_log: {
        Row: {
          action: string
          admin_id: string | null
          admin_nickname: string | null
          after_json: Json | null
          before_json: Json | null
          created_at: string | null
          entity: string
          entity_id: number | null
          entity_type: string | null
          id: number
          moderated_entity_id: number | null
          moderated_entity_type: string | null
          moderation_action_type: string | null
          moderation_reason: string | null
          new_values: Json | null
          occurred_at: string
          old_values: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          admin_nickname?: string | null
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string | null
          entity: string
          entity_id?: number | null
          entity_type?: string | null
          id?: number
          moderated_entity_id?: number | null
          moderated_entity_type?: string | null
          moderation_action_type?: string | null
          moderation_reason?: string | null
          new_values?: Json | null
          occurred_at?: string
          old_values?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          admin_nickname?: string | null
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string | null
          entity?: string
          entity_id?: number | null
          entity_type?: string | null
          id?: number
          moderated_entity_id?: number | null
          moderated_entity_type?: string | null
          moderation_action_type?: string | null
          moderation_reason?: string | null
          new_values?: Json | null
          occurred_at?: string
          old_values?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_definitions: {
        Row: {
          category: string
          created_at: string
          description_es: string
          display_name_es: string
          icon_name: string
          id: string
          sort_order: number
          threshold: number
          tier: string
        }
        Insert: {
          category: string
          created_at?: string
          description_es: string
          display_name_es: string
          icon_name: string
          id: string
          sort_order: number
          threshold: number
          tier: string
        }
        Update: {
          category?: string
          created_at?: string
          description_es?: string
          display_name_es?: string
          icon_name?: string
          id?: string
          sort_order?: number
          threshold?: number
          tier?: string
        }
        Relationships: []
      }
      collection_templates: {
        Row: {
          author_id: string
          copies_count: number | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_type: string | null
          description: string | null
          id: number
          image_url: string | null
          is_public: boolean | null
          item_schema: Json | null
          rating_avg: number | null
          rating_count: number | null
          status: string | null
          suspended_at: string | null
          suspension_reason: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          copies_count?: number | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_type?: string | null
          description?: string | null
          id?: number
          image_url?: string | null
          is_public?: boolean | null
          item_schema?: Json | null
          rating_avg?: number | null
          rating_count?: number | null
          status?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          copies_count?: number | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_type?: string | null
          description?: string | null
          id?: number
          image_url?: string | null
          is_public?: boolean | null
          item_schema?: Json | null
          rating_avg?: number | null
          rating_count?: number | null
          status?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_templates_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "collection_templates_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_templates_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "collection_templates_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_forwarding_addresses: {
        Row: {
          added_at: string
          added_by: string | null
          email: string
          id: number
          is_active: boolean
          last_used_at: string | null
          summary_email_frequency: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          email: string
          id?: number
          is_active?: boolean
          last_used_at?: string | null
          summary_email_frequency?: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          email?: string
          id?: number
          is_active?: boolean
          last_used_at?: string | null
          summary_email_frequency?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_forwarding_addresses_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "email_forwarding_addresses_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favourites: {
        Row: {
          created_at: string | null
          id: number
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favourites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "favourites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ignored_users: {
        Row: {
          created_at: string
          id: number
          ignored_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          ignored_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          ignored_user_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ignored_users_ignored_user_id_fkey"
            columns: ["ignored_user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ignored_users_ignored_user_id_fkey"
            columns: ["ignored_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ignored_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ignored_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_email_log: {
        Row: {
          error_details: Json | null
          forwarded_to: string[] | null
          forwarding_status: string
          from_address: string
          id: number
          received_at: string
          resend_email_id: string | null
          subject: string | null
          to_addresses: string[]
        }
        Insert: {
          error_details?: Json | null
          forwarded_to?: string[] | null
          forwarding_status: string
          from_address: string
          id?: number
          received_at?: string
          resend_email_id?: string | null
          subject?: string | null
          to_addresses: string[]
        }
        Update: {
          error_details?: Json | null
          forwarded_to?: string[] | null
          forwarding_status?: string
          from_address?: string
          id?: number
          received_at?: string
          resend_email_id?: string | null
          subject?: string | null
          to_addresses?: string[]
        }
        Relationships: []
      }
      listing_transactions: {
        Row: {
          buyer_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          id: number
          listing_id: number
          reserved_at: string
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: number
          listing_id: number
          reserved_at?: string
          seller_id: string
          status: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: number
          listing_id?: number
          reserved_at?: string
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "listing_transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_template_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "trade_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "listing_transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: number
          kind: string
          listing_id: number | null
          payload: Json
          rating_id: number | null
          read_at: string | null
          template_id: number | null
          trade_id: number | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: number
          kind: string
          listing_id?: number | null
          payload?: Json
          rating_id?: number | null
          read_at?: string | null
          template_id?: number | null
          trade_id?: number | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: number
          kind?: string
          listing_id?: number | null
          payload?: Json
          rating_id?: number | null
          read_at?: string | null
          template_id?: number | null
          trade_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_template_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "trade_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "collection_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trade_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_emails: {
        Row: {
          attempts: number | null
          created_at: string | null
          failed_at: string | null
          failure_reason: string | null
          id: number
          recipient_email: string
          scheduled_for: string | null
          sent_at: string | null
          template_data: Json
          template_name: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: number
          recipient_email: string
          scheduled_for?: string | null
          sent_at?: string | null
          template_data?: Json
          template_name: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: number
          recipient_email?: string
          scheduled_for?: string | null
          sent_at?: string | null
          template_data?: Json
          template_name?: string
        }
        Relationships: []
      }
      postal_codes: {
        Row: {
          country: string
          lat: number
          lon: number
          postcode: string
        }
        Insert: {
          country: string
          lat: number
          lon: number
          postcode: string
        }
        Update: {
          country?: string
          lat?: number
          lon?: number
          postcode?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          deleted_at: string | null
          deletion_reason: string | null
          id: string
          is_admin: boolean | null
          is_suspended: boolean | null
          last_login_date: string | null
          level: number | null
          login_streak_days: number | null
          longest_login_streak: number | null
          nickname: string | null
          notification_preferences: Json | null
          onesignal_player_id: string[] | null
          postcode: string | null
          rating_avg: number | null
          rating_count: number | null
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          updated_at: string | null
          xp_current: number | null
          xp_total: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deletion_reason?: string | null
          id: string
          is_admin?: boolean | null
          is_suspended?: boolean | null
          last_login_date?: string | null
          level?: number | null
          login_streak_days?: number | null
          longest_login_streak?: number | null
          nickname?: string | null
          notification_preferences?: Json | null
          onesignal_player_id?: string[] | null
          postcode?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
          xp_current?: number | null
          xp_total?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deletion_reason?: string | null
          id?: string
          is_admin?: boolean | null
          is_suspended?: boolean | null
          last_login_date?: string | null
          level?: number | null
          login_streak_days?: number | null
          longest_login_streak?: number | null
          nickname?: string | null
          notification_preferences?: Json | null
          onesignal_player_id?: string[] | null
          postcode?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
          xp_current?: number | null
          xp_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_suspended_by_fkey"
            columns: ["suspended_by"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profiles_suspended_by_fkey"
            columns: ["suspended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_id: string | null
          admin_notes: string | null
          created_at: string | null
          description: string | null
          id: number
          reason: string
          reporter_id: string
          status: string | null
          target_id: string
          target_type: string
          updated_at: string | null
        }
        Insert: {
          admin_id?: string | null
          admin_notes?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          reason: string
          reporter_id: string
          status?: string | null
          target_id: string
          target_type: string
          updated_at?: string | null
        }
        Update: {
          admin_id?: string | null
          admin_notes?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          reason?: string
          reporter_id?: string
          status?: string | null
          target_id?: string
          target_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      retention_schedule: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: number
          initiated_by: string | null
          initiated_by_type: string | null
          legal_hold_until: string | null
          processed_at: string | null
          reason: string
          scheduled_for: string
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: number
          initiated_by?: string | null
          initiated_by_type?: string | null
          legal_hold_until?: string | null
          processed_at?: string | null
          reason: string
          scheduled_for: string
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: number
          initiated_by?: string | null
          initiated_by_type?: string | null
          legal_hold_until?: string | null
          processed_at?: string | null
          reason?: string
          scheduled_for?: string
        }
        Relationships: [
          {
            foreignKeyName: "retention_schedule_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "retention_schedule_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      template_pages: {
        Row: {
          created_at: string | null
          id: number
          page_number: number
          slots_count: number
          template_id: number
          title: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          page_number: number
          slots_count: number
          template_id: number
          title: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          page_number?: number
          slots_count?: number
          template_id?: number
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_pages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "collection_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_ratings: {
        Row: {
          comment: string | null
          created_at: string | null
          id: number
          rating: number
          template_id: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: number
          rating: number
          template_id: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: number
          rating?: number
          template_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_ratings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "collection_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "template_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      template_slots: {
        Row: {
          created_at: string | null
          data: Json | null
          global_number: number | null
          id: number
          is_special: boolean | null
          label: string | null
          page_id: number
          slot_number: number
          slot_variant: string | null
          template_id: number
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          global_number?: number | null
          id?: number
          is_special?: boolean | null
          label?: string | null
          page_id: number
          slot_number: number
          slot_variant?: string | null
          template_id: number
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          global_number?: number | null
          id?: number
          is_special?: boolean | null
          label?: string | null
          page_id?: number
          slot_number?: number
          slot_variant?: string | null
          template_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_template_slots_template"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "collection_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_slots_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "template_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_chats: {
        Row: {
          created_at: string
          id: number
          is_read: boolean
          is_system: boolean
          listing_id: number | null
          message: string
          receiver_id: string | null
          sender_id: string | null
          trade_id: number | null
          visible_to_user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          is_read?: boolean
          is_system?: boolean
          listing_id?: number | null
          message: string
          receiver_id?: string | null
          sender_id?: string | null
          trade_id?: number | null
          visible_to_user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          is_read?: boolean
          is_system?: boolean
          listing_id?: number | null
          message?: string
          receiver_id?: string | null
          sender_id?: string | null
          trade_id?: number | null
          visible_to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_chats_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_template_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_chats_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "trade_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_chats_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trade_chats_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_chats_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trade_chats_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_chats_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trade_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_chats_visible_to_user_id_fkey"
            columns: ["visible_to_user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trade_chats_visible_to_user_id_fkey"
            columns: ["visible_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_finalizations: {
        Row: {
          finalized_at: string
          rejected_at: string | null
          status: string
          trade_id: number
          user_id: string
        }
        Insert: {
          finalized_at?: string
          rejected_at?: string | null
          status?: string
          trade_id: number
          user_id: string
        }
        Update: {
          finalized_at?: string
          rejected_at?: string | null
          status?: string
          trade_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_finalizations_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trade_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_finalizations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trade_finalizations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_listings: {
        Row: {
          collection_name: string | null
          copy_id: number | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_type: string | null
          description: string | null
          global_number: number | null
          group_count: number | null
          id: number
          image_url: string | null
          is_group: boolean | null
          page_number: number | null
          page_title: string | null
          slot_id: number | null
          slot_variant: string | null
          status: string | null
          sticker_number: string | null
          suspended_at: string | null
          suspension_reason: string | null
          title: string
          updated_at: string | null
          user_id: string
          views_count: number | null
        }
        Insert: {
          collection_name?: string | null
          copy_id?: number | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_type?: string | null
          description?: string | null
          global_number?: number | null
          group_count?: number | null
          id?: number
          image_url?: string | null
          is_group?: boolean | null
          page_number?: number | null
          page_title?: string | null
          slot_id?: number | null
          slot_variant?: string | null
          status?: string | null
          sticker_number?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          views_count?: number | null
        }
        Update: {
          collection_name?: string | null
          copy_id?: number | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_type?: string | null
          description?: string | null
          global_number?: number | null
          group_count?: number | null
          id?: number
          image_url?: string | null
          is_group?: boolean | null
          page_number?: number | null
          page_title?: string | null
          slot_id?: number | null
          slot_variant?: string | null
          status?: string | null
          sticker_number?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_listings_copy_id_fkey"
            columns: ["copy_id"]
            isOneToOne: false
            referencedRelation: "listings_with_template_info"
            referencedColumns: ["copy_id"]
          },
          {
            foreignKeyName: "trade_listings_copy_id_fkey"
            columns: ["copy_id"]
            isOneToOne: false
            referencedRelation: "user_template_copies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_listings_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trade_listings_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_listings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "template_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trade_listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_proposal_items: {
        Row: {
          direction: string
          id: number
          proposal_id: number
          quantity: number
          sticker_id: number
        }
        Insert: {
          direction: string
          id?: number
          proposal_id: number
          quantity: number
          sticker_id: number
        }
        Update: {
          direction?: string
          id?: number
          proposal_id?: number
          quantity?: number
          sticker_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "trade_proposal_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "trade_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_proposals: {
        Row: {
          collection_id: number
          created_at: string
          from_user: string
          id: number
          message: string | null
          status: string
          to_user: string
          updated_at: string
        }
        Insert: {
          collection_id: number
          created_at?: string
          from_user: string
          id?: number
          message?: string | null
          status?: string
          to_user: string
          updated_at?: string
        }
        Update: {
          collection_id?: number
          created_at?: string
          from_user?: string
          id?: number
          message?: string | null
          status?: string
          to_user?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_proposals_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trade_proposals_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_proposals_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trade_proposals_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_reads: {
        Row: {
          last_read_at: string
          trade_id: number
          user_id: string
        }
        Insert: {
          last_read_at?: string
          trade_id: number
          user_id: string
        }
        Update: {
          last_read_at?: string
          trade_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_reads_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trade_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trade_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trades_history: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          metadata: Json
          status: string
          trade_id: number
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          metadata?: Json
          status: string
          trade_id: number
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          metadata?: Json
          status?: string
          trade_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "trades_history_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: true
            referencedRelation: "trade_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badge_progress: {
        Row: {
          badge_category: string
          current_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          badge_category: string
          current_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          badge_category?: string
          current_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badge_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_badge_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          awarded_at: string
          badge_code: string | null
          badge_id: string | null
          earned_at: string
          id: number
          progress: number | null
          progress_snapshot: number | null
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_code?: string | null
          badge_id?: string | null
          earned_at?: string
          id?: number
          progress?: number | null
          progress_snapshot?: number | null
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_code?: string | null
          badge_id?: string | null
          earned_at?: string
          id?: number
          progress?: number | null
          progress_snapshot?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ratings: {
        Row: {
          comment: string | null
          context_id: number
          context_type: string
          created_at: string | null
          id: number
          rated_id: string
          rater_id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          context_id: number
          context_type: string
          created_at?: string | null
          id?: number
          rated_id: string
          rater_id: string
          rating: number
        }
        Update: {
          comment?: string | null
          context_id?: number
          context_type?: string
          created_at?: string | null
          id?: number
          rated_id?: string
          rater_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_ratings_rated_id_fkey"
            columns: ["rated_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_ratings_rated_id_fkey"
            columns: ["rated_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_template_copies: {
        Row: {
          copied_at: string | null
          id: number
          is_active: boolean | null
          is_orphaned: boolean | null
          template_id: number | null
          title: string
          user_id: string
        }
        Insert: {
          copied_at?: string | null
          id?: number
          is_active?: boolean | null
          is_orphaned?: boolean | null
          template_id?: number | null
          title: string
          user_id: string
        }
        Update: {
          copied_at?: string | null
          id?: number
          is_active?: boolean | null
          is_orphaned?: boolean | null
          template_id?: number | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_template_copies_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "collection_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_template_copies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_template_copies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_template_progress: {
        Row: {
          copy_id: number
          count: number | null
          data: Json | null
          slot_id: number
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          copy_id: number
          count?: number | null
          data?: Json | null
          slot_id: number
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          copy_id?: number
          count?: number | null
          data?: Json | null
          slot_id?: number
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_template_progress_copy_id_fkey"
            columns: ["copy_id"]
            isOneToOne: false
            referencedRelation: "listings_with_template_info"
            referencedColumns: ["copy_id"]
          },
          {
            foreignKeyName: "user_template_progress_copy_id_fkey"
            columns: ["copy_id"]
            isOneToOne: false
            referencedRelation: "user_template_copies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_template_progress_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "template_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_template_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_template_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_history: {
        Row: {
          action_type: string
          created_at: string | null
          description: string | null
          id: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          action_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          user_id: string
          xp_earned: number
        }
        Update: {
          action_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "xp_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "xp_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      leaderboard_cache: {
        Row: {
          avatar_url: string | null
          badge_count: number | null
          last_updated: string | null
          level: number | null
          nickname: string | null
          rank: number | null
          transaction_count: number | null
          user_id: string | null
          xp_total: number | null
        }
        Relationships: []
      }
      listings_with_template_info: {
        Row: {
          collection_name: string | null
          copy_id: number | null
          copy_title: string | null
          created_at: string | null
          description: string | null
          id: number | null
          image_url: string | null
          page_id: number | null
          page_number: number | null
          slot_count: number | null
          slot_label: string | null
          slot_number: number | null
          slot_status: string | null
          status: string | null
          sticker_number: string | null
          template_author_id: string | null
          template_author_nickname: string | null
          template_title: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          views_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_templates_author_id_fkey"
            columns: ["template_author_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "collection_templates_author_id_fkey"
            columns: ["template_author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_slots_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "template_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trade_listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_audit_logs: {
        Row: {
          action: string | null
          admin_id: string | null
          admin_nickname: string | null
          created_at: string | null
          entity_id: number | null
          entity_type: string | null
          id: number | null
          moderated_entity_id: number | null
          moderated_entity_type: string | null
          moderation_action_type: string | null
          moderation_reason: string | null
          new_values: Json | null
          old_values: Json | null
        }
        Insert: {
          action?: string | null
          admin_id?: string | null
          admin_nickname?: string | null
          created_at?: string | null
          entity_id?: number | null
          entity_type?: string | null
          id?: number | null
          moderated_entity_id?: number | null
          moderated_entity_type?: string | null
          moderation_action_type?: string | null
          moderation_reason?: string | null
          new_values?: Json | null
          old_values?: Json | null
        }
        Update: {
          action?: string | null
          admin_id?: string | null
          admin_nickname?: string | null
          created_at?: string | null
          entity_id?: number | null
          entity_type?: string | null
          id?: number | null
          moderated_entity_id?: number | null
          moderated_entity_type?: string | null
          moderation_action_type?: string | null
          moderation_reason?: string | null
          new_values?: Json | null
          old_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_listing_status_messages: {
        Args: {
          p_listing_id: number
          p_message_type?: string
          p_reserved_buyer_id?: string
        }
        Returns: undefined
      }
      add_system_message_to_listing_chat: {
        Args: {
          p_listing_id: number
          p_message: string
          p_visible_to_user_id?: string
        }
        Returns: number
      }
      add_template_page: {
        Args: {
          p_slots: Json
          p_template_id: number
          p_title: string
          p_type: string
        }
        Returns: number
      }
      add_template_page_v2: {
        Args: {
          p_slots: Json
          p_template_id: number
          p_title: string
          p_type: string
        }
        Returns: number
      }
      admin_add_forwarding_address: {
        Args: { p_email: string }
        Returns: number
      }
      admin_delete_collection: {
        Args: { p_collection_id: number }
        Returns: undefined
      }
      admin_delete_content_v2: {
        Args: {
          p_content_id: number
          p_content_type: string
          p_reason?: string
        }
        Returns: undefined
      }
      admin_delete_listing: {
        Args: { p_listing_id: number; p_reason: string }
        Returns: Json
      }
      admin_delete_page: { Args: { p_page_id: number }; Returns: undefined }
      admin_delete_sticker: {
        Args: { p_sticker_id: number }
        Returns: undefined
      }
      admin_delete_team: { Args: { p_team_id: number }; Returns: undefined }
      admin_delete_template: {
        Args: { p_reason: string; p_template_id: number }
        Returns: Json
      }
      admin_delete_user: { Args: { p_user_id: string }; Returns: Json }
      admin_delete_user_v2: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: undefined
      }
      admin_get_inbound_email_logs: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          error_details: Json
          forwarded_to: string[]
          forwarding_status: string
          from_address: string
          id: number
          received_at: string
          resend_email_id: string
          subject: string
          to_addresses: string[]
        }[]
      }
      admin_get_new_users_summary: {
        Args: { p_days?: number }
        Returns: {
          albums_count: number
          chat_messages_count: number
          created_at: string
          email: string
          listings_count: number
          nickname: string
          user_id: string
        }[]
      }
      admin_get_pending_deletion_listings: {
        Args: never
        Returns: {
          collection_name: string
          days_remaining: number
          deleted_at: string
          deletion_reason: string
          deletion_type: string
          legal_hold_until: string
          listing_id: number
          retention_schedule_id: number
          scheduled_for: string
          seller_id: string
          seller_nickname: string
          title: string
        }[]
      }
      admin_get_pending_deletion_templates: {
        Args: never
        Returns: {
          author_id: string
          author_nickname: string
          days_remaining: number
          deleted_at: string
          deletion_reason: string
          deletion_type: string
          legal_hold_until: string
          rating_avg: number
          rating_count: number
          retention_schedule_id: number
          scheduled_for: string
          template_id: number
          title: string
        }[]
      }
      admin_get_pending_deletion_users: {
        Args: never
        Returns: {
          avatar_url: string
          days_remaining: number
          deleted_at: string
          deletion_reason: string
          email: string
          initiated_by_type: string
          legal_hold_until: string
          nickname: string
          retention_schedule_id: number
          scheduled_for: string
          user_id: string
        }[]
      }
      admin_get_retention_stats: { Args: never; Returns: Json }
      admin_get_summary_recipients: {
        Args: { p_frequency: string }
        Returns: {
          email: string
          id: number
        }[]
      }
      admin_get_suspended_users: {
        Args: never
        Returns: {
          avatar_url: string
          days_until_deletion: number
          email: string
          is_pending_deletion: boolean
          nickname: string
          scheduled_deletion_date: string
          suspended_at: string
          suspended_by: string
          suspended_by_nickname: string
          suspension_reason: string
          user_id: string
        }[]
      }
      admin_list_forwarding_addresses: {
        Args: never
        Returns: {
          added_at: string
          added_by: string
          added_by_username: string
          email: string
          id: number
          is_active: boolean
          last_used_at: string
          summary_email_frequency: string
        }[]
      }
      admin_list_marketplace_listings: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_query?: string
          p_status?: string
        }
        Returns: {
          collection_name: string
          created_at: string
          deleted_at: string
          id: number
          seller_id: string
          seller_nickname: string
          status: string
          title: string
          transaction_count: number
          views_count: number
        }[]
      }
      admin_list_templates: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_query?: string
          p_status?: string
        }
        Returns: {
          author_id: string
          author_nickname: string
          copies_count: number
          created_at: string
          deleted_at: string
          id: number
          is_public: boolean
          rating_avg: number
          rating_count: number
          status: string
          title: string
        }[]
      }
      admin_list_users: {
        Args: {
          p_filter?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
        }
        Returns: {
          created_at: string
          email: string
          is_admin: boolean
          is_suspended: boolean
          last_sign_in_at: string
          nickname: string
          sticker_count: number
          trade_count: number
          user_id: string
        }[]
      }
      admin_move_to_deletion: { Args: { p_user_id: string }; Returns: Json }
      admin_permanently_delete_listing: {
        Args: { p_listing_id: number }
        Returns: Json
      }
      admin_permanently_delete_template: {
        Args: { p_template_id: number }
        Returns: Json
      }
      admin_permanently_delete_user: {
        Args: { p_user_id: string }
        Returns: Json
      }
      admin_purge_user:
      | { Args: { p_user_id: string }; Returns: undefined }
      | {
        Args: { p_admin_id?: string; p_user_id: string }
        Returns: undefined
      }
      admin_remove_forwarding_address: {
        Args: { p_id: number }
        Returns: boolean
      }
      admin_remove_sticker_image: {
        Args: { p_sticker_id: number; p_type: string }
        Returns: undefined
      }
      admin_reset_user_for_testing: {
        Args: { p_user_id: string }
        Returns: Json
      }
      admin_suspend_account: {
        Args: { p_reason: string; p_user_id: string }
        Returns: Json
      }
      admin_suspend_user: {
        Args: { p_is_suspended: boolean; p_user_id: string }
        Returns: Json
      }
      admin_suspend_user_v2: {
        Args: { p_is_suspended: boolean; p_reason?: string; p_user_id: string }
        Returns: undefined
      }
      admin_toggle_forwarding_address: {
        Args: { p_id: number; p_is_active: boolean }
        Returns: boolean
      }
      admin_unsuspend_account: { Args: { p_user_id: string }; Returns: Json }
      admin_update_listing_status: {
        Args: { p_listing_id: number; p_reason?: string; p_status: string }
        Returns: undefined
      }
      admin_update_summary_frequency: {
        Args: { p_frequency: string; p_id: number }
        Returns: boolean
      }
      admin_update_template_status: {
        Args: { p_reason?: string; p_status: string; p_template_id: number }
        Returns: undefined
      }
      admin_update_user_role: {
        Args: { p_is_admin: boolean; p_user_id: string }
        Returns: Json
      }
      admin_update_user_role_v2: {
        Args: { p_is_admin: boolean; p_reason?: string; p_user_id: string }
        Returns: undefined
      }
      admin_upsert_collection: { Args: { p_collection: Json }; Returns: Json }
      admin_upsert_page: { Args: { p_page: Json }; Returns: Json }
      admin_upsert_sticker: { Args: { p_sticker: Json }; Returns: number }
      admin_upsert_team: { Args: { p_team: Json }; Returns: number }
      award_xp: {
        Args: {
          p_action_type: string
          p_description?: string
          p_user_id: string
          p_xp_amount: number
        }
        Returns: undefined
      }
      bulk_delete_content: {
        Args: {
          p_content_ids: number[]
          p_content_type: string
          p_reason?: string
        }
        Returns: {
          content_id: number
          error_message: string
          success: boolean
        }[]
      }
      bulk_suspend_users: {
        Args: {
          p_is_suspended: boolean
          p_reason?: string
          p_user_ids: string[]
        }
        Returns: {
          error_message: string
          success: boolean
          user_id: string
        }[]
      }
      bulk_update_report_status: {
        Args: {
          p_admin_notes?: string
          p_report_ids: number[]
          p_status: string
        }
        Returns: {
          error_message: string
          report_id: number
          success: boolean
        }[]
      }
      calculate_level_from_xp: { Args: { total_xp: number }; Returns: number }
      cancel_account_deletion: { Args: never; Returns: Json }
      cancel_listing_transaction: {
        Args: { p_reason: string; p_transaction_id: number }
        Returns: boolean
      }
      cancel_trade: { Args: { p_trade_id: number }; Returns: undefined }
      check_and_award_badge: {
        Args: { p_category: string; p_user_id: string }
        Returns: undefined
      }
      check_entity_reported: {
        Args: { p_target_id: string; p_target_type: string }
        Returns: boolean
      }
      check_user_visibility: { Args: { p_user_id: string }; Returns: boolean }
      complete_listing_transaction: {
        Args: { p_transaction_id: number }
        Returns: boolean
      }
      complete_trade: { Args: { p_trade_id: number }; Returns: undefined }
      copy_template: {
        Args: { p_custom_title?: string; p_template_id: number }
        Returns: number
      }
      create_report: {
        Args: {
          p_description?: string
          p_reason: string
          p_target_id: string
          p_target_type: string
        }
        Returns: number
      }
      create_template: {
        Args: {
          p_description?: string
          p_image_url?: string
          p_is_public?: boolean
          p_title: string
        }
        Returns: number
      }
      create_template_rating: {
        Args: { p_comment?: string; p_rating: number; p_template_id: number }
        Returns: number
      }
      create_trade_listing: {
        Args: {
          p_collection_name: string
          p_copy_id?: number
          p_description: string
          p_global_number?: number
          p_group_count?: number
          p_image_url: string
          p_is_group?: boolean
          p_page_number?: number
          p_page_title?: string
          p_slot_id?: number
          p_slot_variant?: string
          p_sticker_number: string
          p_title: string
        }
        Returns: number
      }
      create_trade_proposal: {
        Args: {
          p_collection_id: number
          p_message?: string
          p_offer_items: Database["public"]["CompositeTypes"]["proposal_item"][]
          p_request_items: Database["public"]["CompositeTypes"]["proposal_item"][]
          p_to_user: string
        }
        Returns: number
      }
      create_user_rating: {
        Args: {
          p_comment?: string
          p_context_id?: number
          p_context_type?: string
          p_rated_id: string
          p_rating: number
        }
        Returns: number
      }
      delete_account: { Args: never; Returns: Json }
      delete_listing: { Args: { p_listing_id: number }; Returns: Json }
      delete_template: {
        Args: { p_reason?: string; p_template_id: number }
        Returns: undefined
      }
      delete_template_copy: { Args: { p_copy_id: number }; Returns: undefined }
      delete_template_page: { Args: { p_page_id: number }; Returns: undefined }
      delete_template_rating: {
        Args: { p_rating_id: number }
        Returns: undefined
      }
      delete_template_slot: { Args: { p_slot_id: number }; Returns: undefined }
      delete_user_rating: { Args: { p_rating_id: number }; Returns: undefined }
      escalate_report: {
        Args: {
          p_priority_level?: number
          p_reason?: string
          p_report_id: number
        }
        Returns: undefined
      }
      find_mutual_traders: {
        Args: {
          p_collection_id: number
          p_lat?: number
          p_limit?: number
          p_lon?: number
          p_min_overlap?: number
          p_offset?: number
          p_query?: string
          p_radius_km?: number
          p_rarity?: string
          p_sort?: string
          p_team?: string
          p_user_id: string
        }
        Returns: {
          distance_km: number
          match_user_id: string
          nickname: string
          overlap_from_me_to_them: number
          overlap_from_them_to_me: number
          postcode: string
          score: number
          total_mutual_overlap: number
        }[]
      }
      get_admin_dashboard_stats: {
        Args: never
        Returns: {
          active_listings: number
          pending_reports: number
          public_templates: number
          suspended_users: number
          total_listings: number
          total_reports: number
          total_templates: number
          total_users: number
        }[]
      }
      get_admin_performance_metrics: {
        Args: { p_days_back?: number }
        Returns: {
          actions_taken: number
          admin_id: string
          admin_nickname: string
          avg_resolution_hours: number
          content_deleted: number
          reports_resolved: number
          users_suspended: number
        }[]
      }
      get_audit_log: {
        Args: {
          p_action?: string
          p_entity?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          action: string
          admin_nickname: string
          after_json: Json
          before_json: Json
          entity: string
          entity_id: number
          id: number
          occurred_at: string
          user_id: string
        }[]
      }
      get_badge_progress: {
        Args: { p_user_id: string }
        Returns: {
          badge_id: string
          category: string
          current_progress: number
          description_es: string
          display_name_es: string
          earned_at: string
          icon_name: string
          is_earned: boolean
          sort_order: number
          threshold: number
          tier: string
        }[]
      }
      get_default_notification_preferences: { Args: never; Returns: Json }
      get_entity_moderation_history: {
        Args: { p_entity_id: number; p_entity_type: string }
        Returns: {
          admin_id: string
          admin_nickname: string
          created_at: string
          id: number
          moderation_action_type: string
          moderation_reason: string
          new_values: Json
          old_values: Json
        }[]
      }
      get_favourite_count: {
        Args: { p_target_id: string; p_target_type: string }
        Returns: number
      }
      get_ignored_users: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          avatar_url: string
          created_at: string
          ignored_user_id: string
          nickname: string
        }[]
      }
      get_ignored_users_count: { Args: never; Returns: number }
      get_listing_chat_participants: {
        Args: { p_listing_id: number }
        Returns: {
          avatar_url: string
          is_owner: boolean
          last_message: string
          last_message_at: string
          nickname: string
          unread_count: number
          user_id: string
        }[]
      }
      get_listing_chats: {
        Args: { p_listing_id: number; p_participant_id?: string }
        Returns: {
          created_at: string
          id: number
          is_read: boolean
          is_system: boolean
          message: string
          receiver_id: string
          sender_id: string
          sender_nickname: string
        }[]
      }
      get_listing_transaction: {
        Args: { p_listing_id: number }
        Returns: {
          buyer_id: string
          buyer_nickname: string
          cancelled_at: string
          completed_at: string
          id: number
          listing_id: number
          reserved_at: string
          seller_id: string
          seller_nickname: string
          status: string
        }[]
      }
      get_moderation_activity: {
        Args: { p_limit?: number }
        Returns: {
          admin_id: string
          admin_nickname: string
          created_at: string
          entity_title: string
          entity_user_nickname: string
          id: number
          moderated_entity_id: number
          moderated_entity_type: string
          moderation_action_type: string
          moderation_reason: string
        }[]
      }
      get_moderation_audit_logs: {
        Args: {
          p_admin_id?: string
          p_limit?: number
          p_moderated_entity_type?: string
          p_moderation_action_type?: string
          p_offset?: number
        }
        Returns: {
          admin_id: string
          admin_nickname: string
          created_at: string
          id: number
          moderated_entity_id: number
          moderated_entity_type: string
          moderation_action_type: string
          moderation_reason: string
          new_values: Json
          old_values: Json
        }[]
      }
      get_multiple_user_collection_stats: {
        Args: { p_collection_ids: number[]; p_user_id: string }
        Returns: {
          collection_id: number
          completion_percentage: number
          duplicates: number
          missing: number
          owned_stickers: number
          total_stickers: number
        }[]
      }
      get_my_listings_with_progress: {
        Args: { p_status?: string }
        Returns: {
          collection_name: string
          copy_id: number
          copy_title: string
          created_at: string
          current_count: number
          current_status: string
          deleted_at: string
          description: string
          global_number: number
          id: number
          image_url: string
          page_number: number
          page_title: string
          scheduled_for: string
          slot_label: string
          slot_number: number
          slot_variant: string
          status: string
          sticker_number: string
          sync_status: string
          template_title: string
          title: string
          views_count: number
        }[]
      }
      get_my_template_copies: {
        Args: never
        Returns: {
          completed_slots: number
          completion_percentage: number
          copied_at: string
          copy_id: number
          image_url: string
          is_active: boolean
          original_author_id: string
          original_author_nickname: string
          template_id: number
          title: string
          total_slots: number
        }[]
      }
      get_my_template_copies_basic: {
        Args: never
        Returns: {
          copied_at: string
          copy_id: number
          is_active: boolean
          original_author_id: string
          original_author_nickname: string
          template_id: number
          title: string
        }[]
      }
      get_notification_count: { Args: never; Returns: number }
      get_notification_preferences: { Args: never; Returns: Json }
      get_notifications: {
        Args: never
        Returns: {
          actor_avatar_url: string
          actor_id: string
          actor_nickname: string
          created_at: string
          from_user_nickname: string
          id: number
          kind: string
          listing_id: number
          listing_status: string
          listing_title: string
          payload: Json
          proposal_from_user: string
          proposal_status: string
          proposal_to_user: string
          rating_id: number
          read_at: string
          template_id: number
          template_name: string
          template_status: string
          to_user_nickname: string
          trade_id: number
          user_id: string
        }[]
      }
      get_recent_reports: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          description: string
          id: number
          reason: string
          reporter_id: string
          reporter_nickname: string
          status: string
          target_id: string
          target_title: string
          target_type: string
          target_user_avatar_url: string
          target_user_nickname: string
        }[]
      }
      get_report_details_with_context: {
        Args: { p_report_id: number }
        Returns: {
          report: Json
          reported_content: Json
          reported_user_history: Json
        }[]
      }
      get_report_statistics: {
        Args: never
        Returns: {
          count: number
          reason: string
          status: string
          target_type: string
        }[]
      }
      get_reports: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_status?: string
          p_target_type?: string
        }
        Returns: {
          admin_id: string
          admin_nickname: string
          admin_notes: string
          created_at: string
          description: string
          id: number
          reason: string
          reporter_id: string
          reporter_nickname: string
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }[]
      }
      get_template_copy_slots: {
        Args: { p_copy_id: number }
        Returns: {
          count: number
          data: Json
          page_id: number
          page_number: number
          page_title: string
          page_type: string
          slot_id: number
          slot_number: number
          status: string
        }[]
      }
      get_template_details: { Args: { p_template_id: number }; Returns: Json }
      get_template_progress: {
        Args: { p_copy_id: number }
        Returns: {
          count: number
          data: Json
          global_number: number
          is_special: boolean
          label: string
          page_id: number
          page_number: number
          page_title: string
          slot_id: number
          slot_number: number
          slot_variant: string
          status: string
        }[]
      }
      get_template_rating_summary: {
        Args: { p_template_id: number }
        Returns: {
          average_rating: number
          template_id: number
          total_ratings: number
        }[]
      }
      get_template_ratings: {
        Args: { p_limit?: number; p_offset?: number; p_template_id: number }
        Returns: {
          comment: string
          created_at: string
          id: number
          rating: number
          user_avatar_url: string
          user_id: string
          user_nickname: string
        }[]
      }
      get_trade_proposal_detail: {
        Args: { p_proposal_id: number }
        Returns: Json
      }
      get_unread_counts: {
        Args: { p_box: string; p_trade_ids?: number[] }
        Returns: {
          trade_id: number
          unread_count: number
        }[]
      }
      get_user_badges_with_details: {
        Args: { p_user_id: string }
        Returns: {
          badge_id: string
          category: string
          description_es: string
          display_name_es: string
          earned_at: string
          icon_name: string
          progress_snapshot: number
          sort_order: number
          threshold: number
          tier: string
        }[]
      }
      get_user_collections: {
        Args: { p_user_id?: string }
        Returns: {
          copied_at: string
          copy_id: number
          is_active: boolean
          template_id: number
          title: string
        }[]
      }
      get_user_conversations: {
        Args: never
        Returns: {
          counterparty_avatar_url: string
          counterparty_id: string
          counterparty_nickname: string
          is_seller: boolean
          last_message: string
          last_message_at: string
          listing_id: number
          listing_image_url: string
          listing_status: string
          listing_title: string
          unread_count: number
        }[]
      }
      get_user_favourites: {
        Args: { p_limit?: number; p_offset?: number; p_target_type?: string }
        Returns: {
          created_at: string
          id: number
          listing_image_url: string
          listing_title: string
          target_id: number
          target_type: string
          template_image_url: string
          template_title: string
          user_avatar_url: string
          user_nickname: string
        }[]
      }
      get_user_listings: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          author_avatar_url: string
          author_nickname: string
          collection_name: string
          created_at: string
          description: string
          id: number
          image_url: string
          status: string
          sticker_number: string
          title: string
          user_id: string
          views_count: number
        }[]
      }
      get_user_notification_settings: {
        Args: { p_user_id: string }
        Returns: {
          email: string
          onesignal_player_ids: string[]
          preferences: Json
          user_id: string
        }[]
      }
      get_user_rating_summary: {
        Args: { p_user_id: string }
        Returns: {
          rating_avg: number
          rating_count: number
          rating_distribution: Json
        }[]
      }
      get_user_ratings: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          comment: string
          context_id: number
          context_type: string
          created_at: string
          id: number
          rater_avatar_url: string
          rater_id: string
          rater_nickname: string
          rating: number
        }[]
      }
      get_user_reports: {
        Args: { p_limit?: number; p_offset?: number; p_status?: string }
        Returns: {
          admin_notes: string
          created_at: string
          description: string
          id: number
          reason: string
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }[]
      }
      hard_delete_listing: {
        Args: { p_listing_id: number }
        Returns: {
          deleted_chat_count: number
          deleted_transaction_count: number
          media_files_deleted: number
          message: string
          success: boolean
        }[]
      }
      haversine_distance: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      ignore_user: { Args: { p_ignored_user_id: string }; Returns: boolean }
      increment_badge_progress: {
        Args: { p_category: string; p_user_id: string }
        Returns: undefined
      }
      is_admin:
      | { Args: never; Returns: boolean }
      | { Args: { user_uuid: string }; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      is_favourited: {
        Args: { p_target_id: string; p_target_type: string }
        Returns: boolean
      }
      is_user_ignored: {
        Args: { p_target_user_id: string; p_user_id: string }
        Returns: boolean
      }
      is_user_suspended: { Args: { user_uuid: string }; Returns: boolean }
      list_my_favorite_listings: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          author_avatar_url: string
          author_id: string
          author_nickname: string
          collection_name: string
          created_at: string
          favorited_at: string
          image_url: string
          is_group: boolean
          listing_id: string
          status: string
          title: string
        }[]
      }
      list_my_favourites: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          active_listings_count: number
          avatar_url: string
          created_at: string
          favorite_user_id: string
          nickname: string
          rating_avg: number
        }[]
      }
      list_pending_reports: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          description: string
          entity_id: string
          entity_title: string
          entity_type: string
          reason: string
          report_id: number
          reporter_nickname: string
        }[]
      }
      list_public_templates: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_sort_by?: string
        }
        Returns: {
          author_id: string
          author_nickname: string
          copies_count: number
          created_at: string
          deleted_at: string
          description: string
          id: number
          image_url: string
          pages_count: number
          rating_avg: number
          rating_count: number
          title: string
        }[]
      }
      list_trade_listings:
      | {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: {
          author_nickname: string
          collection_name: string
          copy_id: number
          created_at: string
          description: string
          id: number
          image_url: string
          slot_id: number
          status: string
          sticker_number: string
          title: string
          updated_at: string
          user_id: string
          views_count: number
        }[]
      }
      | {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_sort_by_distance?: boolean
          p_viewer_postcode?: string
        }
        Returns: {
          author_nickname: string
          collection_name: string
          copy_id: number
          created_at: string
          description: string
          distance_km: number
          id: number
          image_url: string
          slot_id: number
          status: string
          sticker_number: string
          title: string
          updated_at: string
          user_id: string
          views_count: number
        }[]
      }
      list_trade_listings_filtered: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: {
          author_avatar_url: string
          author_nickname: string
          author_postcode: string
          collection_name: string
          copy_id: number
          created_at: string
          description: string
          id: number
          image_url: string
          slot_id: number
          status: string
          sticker_number: string
          title: string
          updated_at: string
          user_id: string
          views_count: number
        }[]
      }
      list_trade_listings_filtered_with_distance: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_sort_by_distance?: boolean
          p_viewer_postcode?: string
        }
        Returns: {
          author_avatar_url: string
          author_nickname: string
          author_postcode: string
          collection_name: string
          copy_id: number
          created_at: string
          description: string
          distance_km: number
          group_count: number
          id: number
          image_url: string
          is_group: boolean
          slot_id: number
          status: string
          sticker_number: string
          title: string
          user_id: string
          views_count: number
        }[]
      }
      list_trade_listings_with_collection_filter: {
        Args: {
          p_collection_ids?: number[]
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_sort_by_distance?: boolean
          p_viewer_postcode?: string
        }
        Returns: {
          author_avatar_url: string
          author_nickname: string
          author_postcode: string
          collection_name: string
          copy_id: number
          created_at: string
          description: string
          distance_km: number
          id: number
          image_url: string
          match_score: number
          slot_id: number
          status: string
          sticker_number: string
          title: string
          user_id: string
          views_count: number
        }[]
      }
      list_trade_proposals: {
        Args: {
          p_box: string
          p_limit: number
          p_offset: number
          p_user_id: string
        }
        Returns: {
          collection_id: number
          created_at: string
          from_user_id: string
          from_user_nickname: string
          id: number
          message: string
          offer_item_count: number
          request_item_count: number
          status: string
          to_user_id: string
          to_user_nickname: string
          updated_at: string
        }[]
      }
      log_inbound_email: {
        Args: {
          p_error_details?: Json
          p_forwarded_to: string[]
          p_forwarding_status: string
          p_from_address: string
          p_resend_email_id: string
          p_subject: string
          p_to_addresses: string[]
        }
        Returns: number
      }
      log_moderation_action: {
        Args: {
          p_moderated_entity_id?: number
          p_moderated_entity_type: string
          p_moderation_action_type: string
          p_moderation_reason?: string
          p_new_values?: Json
          p_old_values?: Json
        }
        Returns: number
      }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_listing_chat_notifications_read: {
        Args: { p_listing_id: number; p_participant_id: string }
        Returns: undefined
      }
      mark_listing_messages_read: {
        Args: { p_listing_id: number; p_sender_id: string }
        Returns: number
      }
      mark_listing_sold_and_decrement: {
        Args: { p_listing_id: number }
        Returns: undefined
      }
      mark_notification_read: {
        Args: { p_notification_id: number }
        Returns: undefined
      }
      mark_trade_read: { Args: { p_trade_id: number }; Returns: undefined }
      notify_listing_event: {
        Args: {
          p_actor_id: string
          p_kind: string
          p_listing_id: number
          p_payload?: Json
          p_recipient_id: string
        }
        Returns: undefined
      }
      process_retention_schedule: { Args: never; Returns: Json }
      publish_duplicate_to_marketplace: {
        Args: {
          p_copy_id: number
          p_description?: string
          p_image_url?: string
          p_slot_id: number
          p_title: string
        }
        Returns: number
      }
      publish_template: {
        Args: { p_is_public: boolean; p_template_id: number }
        Returns: undefined
      }
      refresh_leaderboard: { Args: never; Returns: undefined }
      reject_trade_finalization: { Args: { p_trade_id: number }; Returns: Json }
      request_account_deletion: { Args: never; Returns: undefined }
      request_trade_finalization: {
        Args: { p_trade_id: number }
        Returns: Json
      }
      require_admin: { Args: never; Returns: undefined }
      reserve_listing: {
        Args: { p_buyer_id: string; p_listing_id: number; p_note?: string }
        Returns: number
      }
      resolve_report: {
        Args: { p_action: string; p_admin_notes?: string; p_report_id: number }
        Returns: undefined
      }
      respond_to_trade_proposal: {
        Args: { p_action: string; p_proposal_id: number }
        Returns: string
      }
      restore_listing: {
        Args: { p_listing_id: number }
        Returns: {
          message: string
          new_status: string
          previous_status: string
          success: boolean
        }[]
      }
      restore_template: {
        Args: { p_template_id: number }
        Returns: {
          message: string
          new_status: string
          previous_status: string
          success: boolean
        }[]
      }
      schedule_email: {
        Args: {
          p_recipient_email: string
          p_send_at?: string
          p_template_data: Json
          p_template_name: string
        }
        Returns: number
      }
      search_users_admin: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_query?: string
          p_status?: string
        }
        Returns: {
          active_listings_count: number
          avatar_url: string
          created_at: string
          deletion_scheduled_for: string
          email: string
          is_admin: boolean
          is_pending_deletion: boolean
          is_suspended: boolean
          nickname: string
          rating_avg: number
          rating_count: number
          reports_received_count: number
          user_id: string
        }[]
      }
      send_deletion_warnings: { Args: never; Returns: Json }
      send_listing_message: {
        Args: { p_listing_id: number; p_message: string; p_receiver_id: string }
        Returns: number
      }
      should_send_notification: {
        Args: { p_channel: string; p_kind: string; p_user_id: string }
        Returns: boolean
      }
      soft_delete_listing: {
        Args: { p_listing_id: number }
        Returns: {
          message: string
          new_status: string
          previous_status: string
          success: boolean
        }[]
      }
      test_get_my_template_copies: {
        Args: never
        Returns: {
          copied_at: string
          copy_id: number
          is_active: boolean
          original_author_nickname: string
          template_id: number
          title: string
        }[]
      }
      toggle_favourite: {
        Args: { p_target_id: string; p_target_type: string }
        Returns: boolean
      }
      unignore_user: { Args: { p_ignored_user_id: string }; Returns: boolean }
      unreserve_listing: { Args: { p_listing_id: number }; Returns: boolean }
      unsuspend_user: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: undefined
      }
      update_listing_status: {
        Args: { p_listing_id: number; p_new_status: string }
        Returns: undefined
      }
      update_login_streak: { Args: { p_user_id: string }; Returns: undefined }
      update_notification_preferences: {
        Args: { p_preferences: Json }
        Returns: undefined
      }
      update_onesignal_player_id: {
        Args: { p_player_id: string }
        Returns: undefined
      }
      update_report_status: {
        Args: { p_admin_notes?: string; p_report_id: number; p_status: string }
        Returns: undefined
      }
      update_report_status_v2: {
        Args: { p_admin_notes?: string; p_report_id: number; p_status: string }
        Returns: undefined
      }
      update_template_metadata: {
        Args: {
          p_description?: string
          p_image_url?: string
          p_is_public?: boolean
          p_template_id: number
          p_title?: string
        }
        Returns: undefined
      }
      update_template_page: {
        Args: {
          p_page_id: number
          p_page_number?: number
          p_title?: string
          p_type?: string
        }
        Returns: undefined
      }
      update_template_progress: {
        Args: {
          p_copy_id: number
          p_count?: number
          p_slot_id: number
          p_status: string
        }
        Returns: undefined
      }
      update_template_rating: {
        Args: { p_comment?: string; p_rating: number; p_rating_id: number }
        Returns: undefined
      }
      update_template_slot: {
        Args: { p_is_special?: boolean; p_label?: string; p_slot_id: number }
        Returns: undefined
      }
      update_trade_listing: {
        Args: {
          p_collection_name?: string
          p_description?: string
          p_image_url?: string
          p_listing_id: number
          p_sticker_number?: string
          p_title: string
        }
        Returns: undefined
      }
      update_user_rating: {
        Args: { p_comment?: string; p_rating: number; p_rating_id: number }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      proposal_item: {
        sticker_id: number | null
        quantity: number | null
      }
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
