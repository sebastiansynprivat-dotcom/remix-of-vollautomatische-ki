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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      conversation_reads: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          last_read_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          last_read_at?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          last_read_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_reads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          autopilot_enabled: boolean
          created_at: string
          fan_id: string
          id: string
          is_autopilot: boolean
          last_message_at: string
          last_message_from_model: boolean
          last_message_preview: string | null
          model_id: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          autopilot_enabled?: boolean
          created_at?: string
          fan_id: string
          id?: string
          is_autopilot?: boolean
          last_message_at?: string
          last_message_from_model?: boolean
          last_message_preview?: string | null
          model_id: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          autopilot_enabled?: boolean
          created_at?: string
          fan_id?: string
          id?: string
          is_autopilot?: boolean
          last_message_at?: string
          last_message_from_model?: boolean
          last_message_preview?: string | null
          model_id?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_fan_id_fkey"
            columns: ["fan_id"]
            isOneToOne: false
            referencedRelation: "fans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "model_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      extension_api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          key_hash: string
          key_prefix: string
          label: string
          last_used_at: string | null
          model_id: string
          revoked_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          label: string
          last_used_at?: string | null
          model_id: string
          revoked_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          label?: string
          last_used_at?: string | null
          model_id?: string
          revoked_at?: string | null
        }
        Relationships: []
      }
      fan_brain: {
        Row: {
          commercial: Json
          confidence: number
          created_at: string
          emotional: Json
          fan_id: string
          identity: Json
          model_id: string
          notes_freeform: string | null
          preferences: Json
          red_flags: Json
          relationship: Json
          signals: Json
          updated_at: string
        }
        Insert: {
          commercial?: Json
          confidence?: number
          created_at?: string
          emotional?: Json
          fan_id: string
          identity?: Json
          model_id: string
          notes_freeform?: string | null
          preferences?: Json
          red_flags?: Json
          relationship?: Json
          signals?: Json
          updated_at?: string
        }
        Update: {
          commercial?: Json
          confidence?: number
          created_at?: string
          emotional?: Json
          fan_id?: string
          identity?: Json
          model_id?: string
          notes_freeform?: string | null
          preferences?: Json
          red_flags?: Json
          relationship?: Json
          signals?: Json
          updated_at?: string
        }
        Relationships: []
      }
      fans: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          external_ref: string | null
          id: string
          is_demo: boolean
          model_id: string
          status: string
          tip_volume_cents: number
          total_spent_cents: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          external_ref?: string | null
          id?: string
          is_demo?: boolean
          model_id: string
          status?: string
          tip_volume_cents?: number
          total_spent_cents?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          external_ref?: string | null
          id?: string
          is_demo?: boolean
          model_id?: string
          status?: string
          tip_volume_cents?: number
          total_spent_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fans_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "model_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          created_at: string
          duration_sec: number | null
          external_url: string | null
          id: string
          is_demo: boolean
          kind: string
          last_sent_at: string | null
          mime: string | null
          model_id: string
          size_bytes: number | null
          status: string
          storage_path: string | null
          tags: string[]
          thumbnail_url: string | null
          times_sent: number
          title: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          duration_sec?: number | null
          external_url?: string | null
          id?: string
          is_demo?: boolean
          kind: string
          last_sent_at?: string | null
          mime?: string | null
          model_id: string
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          times_sent?: number
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          duration_sec?: number | null
          external_url?: string | null
          id?: string
          is_demo?: boolean
          kind?: string
          last_sent_at?: string | null
          mime?: string | null
          model_id?: string
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          times_sent?: number
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "model_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          asset_id: string | null
          content: string | null
          content_type: string
          conversation_id: string
          created_at: string
          id: string
          ppv_is_purchased: boolean | null
          ppv_media_count: number | null
          ppv_media_type: string | null
          ppv_price_cents: number | null
          sender_type: string
          sender_user_id: string | null
          status: string
          tip_amount_cents: number | null
          tip_message: string | null
        }
        Insert: {
          asset_id?: string | null
          content?: string | null
          content_type: string
          conversation_id: string
          created_at?: string
          id?: string
          ppv_is_purchased?: boolean | null
          ppv_media_count?: number | null
          ppv_media_type?: string | null
          ppv_price_cents?: number | null
          sender_type: string
          sender_user_id?: string | null
          status?: string
          tip_amount_cents?: number | null
          tip_message?: string | null
        }
        Update: {
          asset_id?: string | null
          content?: string | null
          content_type?: string
          conversation_id?: string
          created_at?: string
          id?: string
          ppv_is_purchased?: boolean | null
          ppv_media_count?: number | null
          ppv_media_type?: string | null
          ppv_price_cents?: number | null
          sender_type?: string
          sender_user_id?: string | null
          status?: string
          tip_amount_cents?: number | null
          tip_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "model_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      model_assets: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          media_type: string
          model_id: string | null
          note: string | null
          response_count: number
          revenue_total_cents: number
          tags: string[]
          thumbnail_url: string | null
          tier: number
          updated_at: string
          url: string
          use_count: number
          value_cents: number
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          media_type?: string
          model_id?: string | null
          note?: string | null
          response_count?: number
          revenue_total_cents?: number
          tags?: string[]
          thumbnail_url?: string | null
          tier?: number
          updated_at?: string
          url: string
          use_count?: number
          value_cents?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          media_type?: string
          model_id?: string | null
          note?: string | null
          response_count?: number
          revenue_total_cents?: number
          tags?: string[]
          thumbnail_url?: string | null
          tier?: number
          updated_at?: string
          url?: string
          use_count?: number
          value_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "model_assets_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "model_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      model_profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          bio: string | null
          birthday: string | null
          chat_behavior: Json
          created_at: string
          created_by: string | null
          display_name: string
          donts: string[]
          dos: string[]
          emoji_frequency: string
          emojis: string[]
          fun_facts: string | null
          handle: string
          hobbies: string[]
          id: string
          is_flex: boolean
          job: string | null
          languages: string[]
          limits: Json | null
          location: string | null
          openers: string[]
          persona: string | null
          persona_config: Json | null
          relationship_status: string | null
          signature_phrases: string[]
          step_config: Json | null
          subscribers: number
          taboo_words: string[]
          tone_of_voice: string | null
          updated_at: string
          writing_style: string | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          birthday?: string | null
          chat_behavior?: Json
          created_at?: string
          created_by?: string | null
          display_name: string
          donts?: string[]
          dos?: string[]
          emoji_frequency?: string
          emojis?: string[]
          fun_facts?: string | null
          handle: string
          hobbies?: string[]
          id?: string
          is_flex?: boolean
          job?: string | null
          languages?: string[]
          limits?: Json | null
          location?: string | null
          openers?: string[]
          persona?: string | null
          persona_config?: Json | null
          relationship_status?: string | null
          signature_phrases?: string[]
          step_config?: Json | null
          subscribers?: number
          taboo_words?: string[]
          tone_of_voice?: string | null
          updated_at?: string
          writing_style?: string | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          birthday?: string | null
          chat_behavior?: Json
          created_at?: string
          created_by?: string | null
          display_name?: string
          donts?: string[]
          dos?: string[]
          emoji_frequency?: string
          emojis?: string[]
          fun_facts?: string | null
          handle?: string
          hobbies?: string[]
          id?: string
          is_flex?: boolean
          job?: string | null
          languages?: string[]
          limits?: Json | null
          location?: string | null
          openers?: string[]
          persona?: string | null
          persona_config?: Json | null
          relationship_status?: string | null
          signature_phrases?: string[]
          step_config?: Json | null
          subscribers?: number
          taboo_words?: string[]
          tone_of_voice?: string | null
          updated_at?: string
          writing_style?: string | null
        }
        Relationships: []
      }
      ppv_templates: {
        Row: {
          asset_ids: string[]
          caption: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          id: string
          is_demo: boolean
          media_count: number
          media_type: string
          model_id: string
          price_cents: number
          revenue_cents: number
          tags: string[]
          times_purchased: number
          times_sent: number
          title: string
          updated_at: string
        }
        Insert: {
          asset_ids?: string[]
          caption?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_demo?: boolean
          media_count?: number
          media_type: string
          model_id: string
          price_cents?: number
          revenue_cents?: number
          tags?: string[]
          times_purchased?: number
          times_sent?: number
          title: string
          updated_at?: string
        }
        Update: {
          asset_ids?: string[]
          caption?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_demo?: boolean
          media_count?: number
          media_type?: string
          model_id?: string
          price_cents?: number
          revenue_cents?: number
          tags?: string[]
          times_purchased?: number
          times_sent?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ppv_templates_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "model_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sim_runs: {
        Row: {
          conversation_id: string
          created_at: string
          gap_hours: number
          id: string
          last_error: string | null
          last_followup_day: number
          locked_at: string | null
          max_sim_days: number
          next_run_at: string
          persona: string
          phase: string
          purchases_in_session: number
          session_turn: number
          sim_day: number
          sim_last_at: string | null
          started_at: string
          state: string
          turn_count: number
          updated_at: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          gap_hours?: number
          id?: string
          last_error?: string | null
          last_followup_day?: number
          locked_at?: string | null
          max_sim_days?: number
          next_run_at?: string
          persona: string
          phase?: string
          purchases_in_session?: number
          session_turn?: number
          sim_day?: number
          sim_last_at?: string | null
          started_at?: string
          state?: string
          turn_count?: number
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          gap_hours?: number
          id?: string
          last_error?: string | null
          last_followup_day?: number
          locked_at?: string | null
          max_sim_days?: number
          next_run_at?: string
          persona?: string
          phase?: string
          purchases_in_session?: number
          session_turn?: number
          sim_day?: number
          sim_last_at?: string | null
          started_at?: string
          state?: string
          turn_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sim_runs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      sim_telemetry: {
        Row: {
          conversation_id: string | null
          created_at: string
          fan_msg_count: number | null
          fan_total_chars: number | null
          id: number
          model_id: string | null
          model_msg_count: number | null
          model_total_chars: number | null
          offer_no: number | null
          offer_price_cents: number | null
          offer_purchased: boolean | null
          offer_retry_count: number | null
          persona: string | null
          phase: string | null
          repetition_dropped: number | null
          session_turn: number | null
          sim_day: number | null
          sim_run_id: string | null
          turn_count: number | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          fan_msg_count?: number | null
          fan_total_chars?: number | null
          id?: never
          model_id?: string | null
          model_msg_count?: number | null
          model_total_chars?: number | null
          offer_no?: number | null
          offer_price_cents?: number | null
          offer_purchased?: boolean | null
          offer_retry_count?: number | null
          persona?: string | null
          phase?: string | null
          repetition_dropped?: number | null
          session_turn?: number | null
          sim_day?: number | null
          sim_run_id?: string | null
          turn_count?: number | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          fan_msg_count?: number | null
          fan_total_chars?: number | null
          id?: never
          model_id?: string | null
          model_msg_count?: number | null
          model_total_chars?: number | null
          offer_no?: number | null
          offer_price_cents?: number | null
          offer_purchased?: boolean | null
          offer_retry_count?: number | null
          persona?: string | null
          phase?: string | null
          repetition_dropped?: number | null
          session_turn?: number | null
          sim_day?: number | null
          sim_run_id?: string | null
          turn_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sim_telemetry_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sim_telemetry_sim_run_id_fkey"
            columns: ["sim_run_id"]
            isOneToOne: false
            referencedRelation: "sim_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_asset_send: {
        Args: { _asset_id: string; _conversation_id: string }
        Returns: undefined
      }
      record_template_send: {
        Args: { _template_id: string }
        Returns: undefined
      }
      reset_conversation: {
        Args: { _conversation_id: string }
        Returns: undefined
      }
      seed_demo_cloud_for_model: {
        Args: { _model_id: string }
        Returns: number
      }
      seed_demo_fans_for_model: { Args: { _model_id: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "chatter"
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
      app_role: ["admin", "chatter"],
    },
  },
} as const
