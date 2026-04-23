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
      folder_shares: {
        Row: {
          created_at: string
          folder_id: string
          id: string
          owner_id: string
          shared_with_id: string
        }
        Insert: {
          created_at?: string
          folder_id: string
          id?: string
          owner_id: string
          shared_with_id: string
        }
        Update: {
          created_at?: string
          folder_id?: string
          id?: string
          owner_id?: string
          shared_with_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folder_shares_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_public: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
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
      image_captures: {
        Row: {
          created_at: string | null
          id: string
          tasks_created: number
          tasks_extracted: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          tasks_created: number
          tasks_extracted: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          tasks_created?: number
          tasks_extracted?: number
          user_id?: string | null
        }
        Relationships: []
      }
      notion_tokens: {
        Row: {
          access_token: string
          bot_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
          workspace_id: string | null
          workspace_name: string | null
        }
        Insert: {
          access_token: string
          bot_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
          workspace_name?: string | null
        }
        Update: {
          access_token?: string
          bot_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
          workspace_name?: string | null
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
      recurrence_rules: {
        Row: {
          created_at: string
          day_of_month: number | null
          days_of_week: number[] | null
          end_date: string | null
          frequency: string
          id: string
          interval: number
          month_of_year: number | null
          start_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_month?: number | null
          days_of_week?: number[] | null
          end_date?: string | null
          frequency?: string
          id?: string
          interval?: number
          month_of_year?: number | null
          start_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_month?: number | null
          days_of_week?: number[] | null
          end_date?: string | null
          frequency?: string
          id?: string
          interval?: number
          month_of_year?: number | null
          start_date?: string
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          calendar_connected: boolean | null
          created_at: string
          focus_level: string | null
          id: string
          notifications_enabled: boolean | null
          notion_connected: boolean | null
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
          notion_connected?: boolean | null
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
          notion_connected?: boolean | null
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
          folder_id: string | null
          goal_id: string | null
          id: string
          importance: boolean | null
          link: string | null
          priority: string | null
          recurrence_id: string | null
          sort_order: number | null
          source_type: string | null
          status: string | null
          time_block_id: string | null
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
          folder_id?: string | null
          goal_id?: string | null
          id?: string
          importance?: boolean | null
          link?: string | null
          priority?: string | null
          recurrence_id?: string | null
          sort_order?: number | null
          source_type?: string | null
          status?: string | null
          time_block_id?: string | null
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
          folder_id?: string | null
          goal_id?: string | null
          id?: string
          importance?: boolean | null
          link?: string | null
          priority?: string | null
          recurrence_id?: string | null
          sort_order?: number | null
          source_type?: string | null
          status?: string | null
          time_block_id?: string | null
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
            foreignKeyName: "tasks_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_recurrence_id_fkey"
            columns: ["recurrence_id"]
            isOneToOne: false
            referencedRelation: "recurrence_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_time_block_id_fkey"
            columns: ["time_block_id"]
            isOneToOne: false
            referencedRelation: "time_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      time_blocks: {
        Row: {
          block_date: string | null
          color: string | null
          created_at: string | null
          days_of_week: number[] | null
          end_time: string
          id: string
          is_recurring: boolean | null
          start_time: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          block_date?: string | null
          color?: string | null
          created_at?: string | null
          days_of_week?: number[] | null
          end_time: string
          id?: string
          is_recurring?: boolean | null
          start_time: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          block_date?: string | null
          color?: string | null
          created_at?: string | null
          days_of_week?: number[] | null
          end_time?: string
          id?: string
          is_recurring?: boolean | null
          start_time?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
