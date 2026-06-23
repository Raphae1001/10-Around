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
          id: string
          language: string | null
          trust_score: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          backup_mode?: boolean
          backup_radius_m?: number
          created_at?: string
          display_name?: string | null
          id: string
          language?: string | null
          trust_score?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          backup_mode?: boolean
          backup_radius_m?: number
          created_at?: string
          display_name?: string | null
          id?: string
          language?: string | null
          trust_score?: number
          updated_at?: string
        }
        Relationships: []
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
      answer_confirmation: {
        Args: {
          _answer: Database["public"]["Enums"]["confirmation_answer"]
          _minyan_id: string
        }
        Returns: undefined
      }
      count_minyanim_within: {
        Args: { lat: number; lng: number; radius_m?: number }
        Returns: number
      }
      get_my_profile: {
        Args: never
        Returns: {
          avatar_url: string | null
          backup_mode: boolean
          backup_radius_m: number
          created_at: string
          display_name: string | null
          id: string
          language: string | null
          trust_score: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
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
      nearby_minyanim: {
        Args: { lat: number; lng: number; radius_m?: number }
        Returns: {
          address: string | null
          created_at: string
          creator_id: string
          expires_at: string
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
      request_confirmations: {
        Args: { _minyan_id: string }
        Returns: undefined
      }
      trigger_due_confirmations: { Args: never; Returns: number }
    }
    Enums: {
      confirmation_answer: "yes" | "no"
      confirmation_role: "organizer" | "participant"
      minyan_prayer: "shacharit" | "mincha" | "arvit" | "maariv" | "other"
      minyan_type: "street" | "airport" | "hotel" | "travel"
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
      minyan_type: ["street", "airport", "hotel", "travel"],
    },
  },
} as const
