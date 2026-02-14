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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      explain_logs: {
        Row: {
          created_at: string
          data_sources: Json | null
          id: string
          metadata: Json | null
          profile_id: string | null
          prompt_version: string | null
          reasoning: string | null
          step: string
        }
        Insert: {
          created_at?: string
          data_sources?: Json | null
          id?: string
          metadata?: Json | null
          profile_id?: string | null
          prompt_version?: string | null
          reasoning?: string | null
          step: string
        }
        Update: {
          created_at?: string
          data_sources?: Json | null
          id?: string
          metadata?: Json | null
          profile_id?: string | null
          prompt_version?: string | null
          reasoning?: string | null
          step?: string
        }
        Relationships: [
          {
            foreignKeyName: "explain_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_guides: {
        Row: {
          created_at: string
          id: string
          interview_guide: Json | null
          profile_id: string | null
          role_analysis_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          interview_guide?: Json | null
          profile_id?: string | null
          role_analysis_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          interview_guide?: Json | null
          profile_id?: string | null
          role_analysis_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_guides_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_guides_role_analysis_id_fkey"
            columns: ["role_analysis_id"]
            isOneToOne: false
            referencedRelation: "role_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          data_completeness: number | null
          education: Json | null
          experience_level: string | null
          github_stats: Json | null
          github_url: string | null
          id: string
          inferred_strength_score: number | null
          linkedin_url: string | null
          name: string | null
          projects: Json | null
          resume_text: string | null
          skills: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data_completeness?: number | null
          education?: Json | null
          experience_level?: string | null
          github_stats?: Json | null
          github_url?: string | null
          id?: string
          inferred_strength_score?: number | null
          linkedin_url?: string | null
          name?: string | null
          projects?: Json | null
          resume_text?: string | null
          skills?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data_completeness?: number | null
          education?: Json | null
          experience_level?: string | null
          github_stats?: Json | null
          github_url?: string | null
          id?: string
          inferred_strength_score?: number | null
          linkedin_url?: string | null
          name?: string | null
          projects?: Json | null
          resume_text?: string | null
          skills?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      roadmaps: {
        Row: {
          created_at: string
          estimated_readiness_weeks: number | null
          id: string
          profile_id: string | null
          roadmap: Json | null
          skill_gap_id: string | null
          total_learning_hours: number | null
        }
        Insert: {
          created_at?: string
          estimated_readiness_weeks?: number | null
          id?: string
          profile_id?: string | null
          roadmap?: Json | null
          skill_gap_id?: string | null
          total_learning_hours?: number | null
        }
        Update: {
          created_at?: string
          estimated_readiness_weeks?: number | null
          id?: string
          profile_id?: string | null
          roadmap?: Json | null
          skill_gap_id?: string | null
          total_learning_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roadmaps_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmaps_skill_gap_id_fkey"
            columns: ["skill_gap_id"]
            isOneToOne: false
            referencedRelation: "skill_gaps"
            referencedColumns: ["id"]
          },
        ]
      }
      role_analyses: {
        Row: {
          aggregated_required_skills: Json | null
          confidence: string | null
          created_at: string
          id: string
          profile_id: string | null
          role: string
          skill_frequency_map: Json | null
          sources: Json | null
          top_companies: Json | null
        }
        Insert: {
          aggregated_required_skills?: Json | null
          confidence?: string | null
          created_at?: string
          id?: string
          profile_id?: string | null
          role: string
          skill_frequency_map?: Json | null
          sources?: Json | null
          top_companies?: Json | null
        }
        Update: {
          aggregated_required_skills?: Json | null
          confidence?: string | null
          created_at?: string
          id?: string
          profile_id?: string | null
          role?: string
          skill_frequency_map?: Json | null
          sources?: Json | null
          top_companies?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "role_analyses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_gaps: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          missing: Json | null
          profile_id: string | null
          role_analysis_id: string | null
          role_match_percentage: number | null
          skills_found_count: number | null
          skills_required_count: number | null
          strong: Json | null
          weak: Json | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          missing?: Json | null
          profile_id?: string | null
          role_analysis_id?: string | null
          role_match_percentage?: number | null
          skills_found_count?: number | null
          skills_required_count?: number | null
          strong?: Json | null
          weak?: Json | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          missing?: Json | null
          profile_id?: string | null
          role_analysis_id?: string | null
          role_match_percentage?: number | null
          skills_found_count?: number | null
          skills_required_count?: number | null
          strong?: Json | null
          weak?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_gaps_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_gaps_role_analysis_id_fkey"
            columns: ["role_analysis_id"]
            isOneToOne: false
            referencedRelation: "role_analyses"
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
