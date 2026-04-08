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
      contexts: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_priorities: {
        Row: {
          created_at: string
          date: string
          id: string
          intention: string | null
          mood_end: string | null
          mood_start: string | null
          task_ids: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          intention?: string | null
          mood_end?: string | null
          mood_start?: string | null
          task_ids?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          intention?: string | null
          mood_end?: string | null
          mood_start?: string | null
          task_ids?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      experiment_metrics: {
        Row: {
          day_1_used: boolean | null
          day_2_used: boolean | null
          day_3_used: boolean | null
          id: string
          last_active_date: string | null
          streak_current: number | null
          streak_max: number | null
          updated_at: string
          user_activated: boolean | null
          user_id: string
          user_retained: boolean | null
        }
        Insert: {
          day_1_used?: boolean | null
          day_2_used?: boolean | null
          day_3_used?: boolean | null
          id?: string
          last_active_date?: string | null
          streak_current?: number | null
          streak_max?: number | null
          updated_at?: string
          user_activated?: boolean | null
          user_id: string
          user_retained?: boolean | null
        }
        Update: {
          day_1_used?: boolean | null
          day_2_used?: boolean | null
          day_3_used?: boolean | null
          id?: string
          last_active_date?: string | null
          streak_current?: number | null
          streak_max?: number | null
          updated_at?: string
          user_activated?: boolean | null
          user_id?: string
          user_retained?: boolean | null
        }
        Relationships: []
      }
      goals: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          horizon: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          horizon?: string | null
          id?: string
          title: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          horizon?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accent_color: string | null
          created_at: string
          email: string | null
          id: string
          main_goal_id: string | null
          name: string | null
          onboarding_completed: boolean | null
          organization_style: string | null
          preferred_input: string | null
          theme: string | null
          timezone: string | null
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          email?: string | null
          id?: string
          main_goal_id?: string | null
          name?: string | null
          onboarding_completed?: boolean | null
          organization_style?: string | null
          preferred_input?: string | null
          theme?: string | null
          timezone?: string | null
          user_id: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          email?: string | null
          id?: string
          main_goal_id?: string | null
          name?: string | null
          onboarding_completed?: boolean | null
          organization_style?: string | null
          preferred_input?: string | null
          theme?: string | null
          timezone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_main_goal"
            columns: ["main_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          calendar_connected: boolean | null
          created_at: string
          focus_level: string | null
          id: string
          notifications_enabled: boolean | null
          reminder_style: string | null
          user_id: string
          voice_enabled: boolean | null
        }
        Insert: {
          calendar_connected?: boolean | null
          created_at?: string
          focus_level?: string | null
          id?: string
          notifications_enabled?: boolean | null
          reminder_style?: string | null
          user_id: string
          voice_enabled?: boolean | null
        }
        Update: {
          calendar_connected?: boolean | null
          created_at?: string
          focus_level?: string | null
          id?: string
          notifications_enabled?: boolean | null
          reminder_style?: string | null
          user_id?: string
          voice_enabled?: boolean | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          context_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_minutes: number | null
          goal_id: string | null
          id: string
          importance: boolean | null
          priority: string | null
          sort_order: number | null
          source_type: string | null
          status: string | null
          title: string
          urgency: boolean | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          context_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          goal_id?: string | null
          id?: string
          importance?: boolean | null
          priority?: string | null
          sort_order?: number | null
          source_type?: string | null
          status?: string | null
          title: string
          urgency?: boolean | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          context_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          goal_id?: string | null
          id?: string
          importance?: boolean | null
          priority?: string | null
          sort_order?: number | null
          source_type?: string | null
          status?: string | null
          title?: string
          urgency?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_context_id_fkey"
            columns: ["context_id"]
            isOneToOne: false
            referencedRelation: "contexts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_context: {
        Row: {
          age_range: string | null
          ai_learned_patterns: Json | null
          biggest_challenge: string | null
          created_at: string
          daily_routine_summary: string | null
          energy_patterns: string | null
          family_status: string | null
          gender: string | null
          hobbies: string | null
          id: string
          imported_context: string | null
          industry: string | null
          life_areas: Json | null
          location: string | null
          occupation: string | null
          personal_goals: string | null
          priorities_summary: string | null
          recurring_commitments: string | null
          stress_level: string | null
          updated_at: string
          user_id: string
          work_hours: string | null
          work_style: string | null
        }
        Insert: {
          age_range?: string | null
          ai_learned_patterns?: Json | null
          biggest_challenge?: string | null
          created_at?: string
          daily_routine_summary?: string | null
          energy_patterns?: string | null
          family_status?: string | null
          gender?: string | null
          hobbies?: string | null
          id?: string
          imported_context?: string | null
          industry?: string | null
          life_areas?: Json | null
          location?: string | null
          occupation?: string | null
          personal_goals?: string | null
          priorities_summary?: string | null
          recurring_commitments?: string | null
          stress_level?: string | null
          updated_at?: string
          user_id: string
          work_hours?: string | null
          work_style?: string | null
        }
        Update: {
          age_range?: string | null
          ai_learned_patterns?: Json | null
          biggest_challenge?: string | null
          created_at?: string
          daily_routine_summary?: string | null
          energy_patterns?: string | null
          family_status?: string | null
          gender?: string | null
          hobbies?: string | null
          id?: string
          imported_context?: string | null
          industry?: string | null
          life_areas?: Json | null
          location?: string | null
          occupation?: string | null
          personal_goals?: string | null
          priorities_summary?: string | null
          recurring_commitments?: string | null
          stress_level?: string | null
          updated_at?: string
          user_id?: string
          work_hours?: string | null
          work_style?: string | null
        }
        Relationships: []
      }
      voice_inputs: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          parsed_task_id: string | null
          transcript: string | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          parsed_task_id?: string | null
          transcript?: string | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          parsed_task_id?: string | null
          transcript?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_inputs_parsed_task_id_fkey"
            columns: ["parsed_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_reviews: {
        Row: {
          created_at: string
          id: string
          reflection: string | null
          tasks_completed: number | null
          tasks_skipped: number | null
          top_goal_id: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          reflection?: string | null
          tasks_completed?: number | null
          tasks_skipped?: number | null
          top_goal_id?: string | null
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          reflection?: string | null
          tasks_completed?: number | null
          tasks_skipped?: number | null
          top_goal_id?: string | null
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reviews_top_goal_id_fkey"
            columns: ["top_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
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
