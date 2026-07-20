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
      app_config: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          thread_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          thread_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_thread_members: {
        Row: {
          joined_at: string
          thread_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          thread_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_thread_members_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          city_key: string | null
          created_at: string
          id: string
          kind: string
          minyan_id: string | null
          title: string | null
        }
        Insert: {
          city_key?: string | null
          created_at?: string
          id?: string
          kind: string
          minyan_id?: string | null
          title?: string | null
        }
        Update: {
          city_key?: string | null
          created_at?: string
          id?: string
          kind?: string
          minyan_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_minyan_id_fkey"
            columns: ["minyan_id"]
            isOneToOne: false
            referencedRelation: "minyanim"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          message_id: string | null
          message_snapshot: string | null
          reason: string
          reported_user_id: string | null
          reporter_id: string
          thread_id: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          message_id?: string | null
          message_snapshot?: string | null
          reason?: string
          reported_user_id?: string | null
          reporter_id: string
          thread_id?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          message_id?: string | null
          message_snapshot?: string | null
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      member_presence: {
        Row: {
          last_seen_at: string
          opt_out: boolean
          presence_level: string
          updated_at: string
          user_id: string
          zone: string
        }
        Insert: {
          last_seen_at?: string
          opt_out?: boolean
          presence_level?: string
          updated_at?: string
          user_id: string
          zone: string
        }
        Update: {
          last_seen_at?: string
          opt_out?: boolean
          presence_level?: string
          updated_at?: string
          user_id?: string
          zone?: string
        }
        Relationships: []
      }
      minyan_confirmations: {
        Row: {
          answer: Database["public"]["Enums"]["confirmation_answer"] | null
          answered_at: string | null
          asked_at: string
          id: string
          minyan_id: string
          role: Database["public"]["Enums"]["confirmation_role"]
          user_id: string
        }
        Insert: {
          answer?: Database["public"]["Enums"]["confirmation_answer"] | null
          answered_at?: string | null
          asked_at?: string
          id?: string
          minyan_id: string
          role: Database["public"]["Enums"]["confirmation_role"]
          user_id: string
        }
        Update: {
          answer?: Database["public"]["Enums"]["confirmation_answer"] | null
          answered_at?: string | null
          asked_at?: string
          id?: string
          minyan_id?: string
          role?: Database["public"]["Enums"]["confirmation_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "minyan_confirmations_minyan_id_fkey"
            columns: ["minyan_id"]
            isOneToOne: false
            referencedRelation: "minyanim"
            referencedColumns: ["id"]
          },
        ]
      }
      minyan_participants: {
        Row: {
          id: string
          joined_at: string
          minyan_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          minyan_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          minyan_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "minyan_participants_minyan_id_fkey"
            columns: ["minyan_id"]
            isOneToOne: false
            referencedRelation: "minyanim"
            referencedColumns: ["id"]
          },
        ]
      }
      minyanim: {
        Row: {
          address: string | null
          created_at: string
          creator_id: string
          expires_at: string
          extra_present: number
          grace_extended: boolean
          id: string
          is_live: boolean
          latitude: number
          location: unknown
          longitude: number
          message: string | null
          nusach: string | null
          prayer: Database["public"]["Enums"]["minyan_prayer"]
          present_count: number
          scheduled_at: string | null
          trip_end_date: string | null
          trip_start_date: string | null
          type: Database["public"]["Enums"]["minyan_type"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          creator_id: string
          expires_at?: string
          extra_present?: number
          grace_extended?: boolean
          id?: string
          is_live?: boolean
          latitude: number
          location?: unknown
          longitude: number
          message?: string | null
          nusach?: string | null
          prayer?: Database["public"]["Enums"]["minyan_prayer"]
          present_count?: number
          scheduled_at?: string | null
          trip_end_date?: string | null
          trip_start_date?: string | null
          type: Database["public"]["Enums"]["minyan_type"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          creator_id?: string
          expires_at?: string
          extra_present?: number
          grace_extended?: boolean
          id?: string
          is_live?: boolean
          latitude?: number
          location?: unknown
          longitude?: number
          message?: string | null
          nusach?: string | null
          prayer?: Database["public"]["Enums"]["minyan_prayer"]
          present_count?: number
          scheduled_at?: string | null
          trip_end_date?: string | null
          trip_start_date?: string | null
          type?: Database["public"]["Enums"]["minyan_type"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          backup_mode: boolean
          backup_radius_m: number
          created_at: string
          display_name: string | null
          first_name: string | null
          id: string
          language: string | null
          last_name: string | null
          terms_accepted_at: string | null
          trust_score: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          backup_mode?: boolean
          backup_radius_m?: number
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id: string
          language?: string | null
          last_name?: string | null
          terms_accepted_at?: string | null
          trust_score?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          backup_mode?: boolean
          backup_radius_m?: number
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          language?: string | null
          last_name?: string | null
          terms_accepted_at?: string | null
          trust_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      push_notification_log: {
        Row: {
          created_at: string
          id: string
          kind: string
          minyan_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          minyan_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          minyan_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_notification_log_minyan_id_fkey"
            columns: ["minyan_id"]
            isOneToOne: false
            referencedRelation: "minyanim"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_presence: {
        Row: {
          address: string | null
          city_key: string
          city_label: string
          created_at: string
          date_end: string
          date_start: string
          id: string
          latitude: number | null
          longitude: number | null
          note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city_key: string
          city_label: string
          created_at?: string
          date_end: string
          date_start: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city_key?: string
          city_label?: string
          created_at?: string
          date_end?: string
          date_start?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          data: Json
          id: string
          kind: string
          minyan_id: string | null
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          kind: string
          minyan_id?: string | null
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          kind?: string
          minyan_id?: string | null
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_minyan_id_fkey"
            columns: ["minyan_id"]
            isOneToOne: false
            referencedRelation: "minyanim"
            referencedColumns: ["id"]
          },
        ]
      }
      user_push_tokens: {
        Row: {
          created_at: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _geohash6_decode_center: {
        Args: { _zone: string }
        Returns: Record<string, unknown>
      }
      _geohash6_encode: { Args: { lat: number; lng: number }; Returns: string }
      _geohash6_zones_in_radius: {
        Args: { lat: number; lng: number; radius_m: number }
        Returns: {
          zone: string
        }[]
      }
      active_members_count: {
        Args: { lat: number; lng: number; radius_m?: number }
        Returns: number
      }
      answer_confirmation: {
        Args: {
          _answer: Database["public"]["Enums"]["confirmation_answer"]
          _minyan_id: string
        }
        Returns: undefined
      }
      can_join_chat_thread: {
        Args: { _thread_id: string; _user_id: string }
        Returns: boolean
      }
      cancel_my_minyan: { Args: { _id: string }; Returns: undefined }
      check_minyan_grace: { Args: never; Returns: number }
      cleanup_expired_minyanim: { Args: never; Returns: undefined }
      cleanup_stale_presence: { Args: never; Returns: number }
      count_minyanim_within: {
        Args: { _start?: string; lat: number; lng: number; radius_m?: number }
        Returns: number
      }
      count_travelers_in_city: {
        Args: { _city_key: string; _from: string; _to: string }
        Returns: number
      }
      ensure_minyan_chat: { Args: { _minyan_id: string }; Returns: string }
      get_app_config_int: {
        Args: { _default: number; _key: string }
        Returns: number
      }
      get_my_profile: {
        Args: never
        Returns: {
          avatar_url: string
          backup_mode: boolean
          backup_radius_m: number
          created_at: string
          display_name: string
          first_name: string
          id: string
          language: string
          last_name: string
          trust_score: number
          updated_at: string
        }[]
      }
      get_my_recent_participations: {
        Args: { _limit?: number }
        Returns: {
          address: string
          joined_at: string
          minyan_id: string
          prayer: string
        }[]
      }
      get_my_stats: {
        Args: never
        Returns: {
          completed_count: number
          minyanim_count: number
          stars: number
          streak_days: number
        }[]
      }
      get_or_create_minyan_chat: {
        Args: { _minyan_id: string }
        Returns: string
      }
      is_chat_member: { Args: { _thread_id: string }; Returns: boolean }
      list_city_peers: {
        Args: { _city_key: string; _from: string; _to: string }
        Returns: {
          avatar_url: string
          date_end: string
          date_start: string
          display_name: string
          is_me: boolean
          note: string
          user_id: string
        }[]
      }
      my_chat_threads: {
        Args: never
        Returns: {
          city_key: string
          id: string
          kind: string
          last_at: string
          last_message: string
          member_count: number
          minyan_id: string
          title: string
        }[]
      }
      my_travel_cities: {
        Args: never
        Returns: {
          city_key: string
          city_label: string
          date_end: string
          date_start: string
          peer_count: number
          thread_id: string
        }[]
      }
      nearby_minyanim: {
        Args: { lat: number; lng: number; radius_m?: number }
        Returns: {
          address: string | null
          created_at: string
          creator_id: string
          expires_at: string
          extra_present: number
          grace_extended: boolean
          id: string
          is_live: boolean
          latitude: number
          location: unknown
          longitude: number
          message: string | null
          nusach: string | null
          prayer: Database["public"]["Enums"]["minyan_prayer"]
          present_count: number
          scheduled_at: string | null
          trip_end_date: string | null
          trip_start_date: string | null
          type: Database["public"]["Enums"]["minyan_type"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "minyanim"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      nearby_push_recipients: {
        Args: {
          _exclude_user_id?: string
          _lat: number
          _lng: number
          _radius_m?: number
        }
        Returns: {
          token: string
          user_id: string
        }[]
      }
      normalize_city: { Args: { _addr: string }; Returns: string }
      request_confirmations: {
        Args: { _minyan_id: string }
        Returns: undefined
      }
      stay_city_key: { Args: { _label: string }; Returns: string }
      trigger_due_confirmations: { Args: never; Returns: number }
      upsert_presence: { Args: { zone: string }; Returns: undefined }
      zone_density: {
        Args: { lat: number; lng: number; radius_m?: number }
        Returns: {
          member_count: number
          zone: string
        }[]
      }
    }
    Enums: {
      confirmation_answer: "yes" | "no"
      confirmation_role: "organizer" | "participant"
      minyan_prayer: "shacharit" | "mincha" | "arvit" | "maariv" | "other"
      minyan_type: "street" | "stay" | "scheduled"
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
      confirmation_answer: ["yes", "no"],
      confirmation_role: ["organizer", "participant"],
      minyan_prayer: ["shacharit", "mincha", "arvit", "maariv", "other"],
      minyan_type: ["street", "stay", "scheduled"],
    },
  },
} as const
