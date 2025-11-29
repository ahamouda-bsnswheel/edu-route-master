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
      approvals: {
        Row: {
          approval_level: number
          approver_id: string
          approver_role: Database["public"]["Enums"]["app_role"]
          comments: string | null
          created_at: string | null
          decision_date: string | null
          delegated_from: string | null
          id: string
          request_id: string
          status: Database["public"]["Enums"]["approval_status"] | null
          updated_at: string | null
        }
        Insert: {
          approval_level: number
          approver_id: string
          approver_role: Database["public"]["Enums"]["app_role"]
          comments?: string | null
          created_at?: string | null
          decision_date?: string | null
          delegated_from?: string | null
          id?: string
          request_id: string
          status?: Database["public"]["Enums"]["approval_status"] | null
          updated_at?: string | null
        }
        Update: {
          approval_level?: number
          approver_id?: string
          approver_role?: Database["public"]["Enums"]["app_role"]
          comments?: string | null
          created_at?: string | null
          decision_date?: string | null
          delegated_from?: string | null
          id?: string
          request_id?: string
          status?: Database["public"]["Enums"]["approval_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "training_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changed_fields: string[] | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          performed_at: string | null
          performed_by: string | null
          record_id: string
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          performed_at?: string | null
          performed_by?: string | null
          record_id: string
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          performed_at?: string | null
          performed_by?: string | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      course_categories: {
        Row: {
          created_at: string | null
          description_ar: string | null
          description_en: string | null
          id: string
          is_active: boolean | null
          name_ar: string | null
          name_en: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean | null
          name_ar?: string | null
          name_en: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean | null
          name_ar?: string | null
          name_en?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "course_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category_id: string | null
          code: string | null
          cost_amount: number | null
          cost_currency: string | null
          cost_level: Database["public"]["Enums"]["cost_level"] | null
          created_at: string | null
          delivery_mode: Database["public"]["Enums"]["delivery_mode"]
          description_ar: string | null
          description_en: string | null
          duration_days: number | null
          duration_hours: number | null
          id: string
          is_active: boolean | null
          is_mandatory: boolean | null
          max_participants: number | null
          min_participants: number | null
          name_ar: string | null
          name_en: string
          prerequisites: string[] | null
          provider_id: string | null
          target_grades: string[] | null
          training_location:
            | Database["public"]["Enums"]["training_location"]
            | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          code?: string | null
          cost_amount?: number | null
          cost_currency?: string | null
          cost_level?: Database["public"]["Enums"]["cost_level"] | null
          created_at?: string | null
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"]
          description_ar?: string | null
          description_en?: string | null
          duration_days?: number | null
          duration_hours?: number | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          max_participants?: number | null
          min_participants?: number | null
          name_ar?: string | null
          name_en: string
          prerequisites?: string[] | null
          provider_id?: string | null
          target_grades?: string[] | null
          training_location?:
            | Database["public"]["Enums"]["training_location"]
            | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          code?: string | null
          cost_amount?: number | null
          cost_currency?: string | null
          cost_level?: Database["public"]["Enums"]["cost_level"] | null
          created_at?: string | null
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"]
          description_ar?: string | null
          description_en?: string | null
          duration_days?: number | null
          duration_hours?: number | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          max_participants?: number | null
          min_participants?: number | null
          name_ar?: string | null
          name_en?: string
          prerequisites?: string[] | null
          provider_id?: string | null
          target_grades?: string[] | null
          training_location?:
            | Database["public"]["Enums"]["training_location"]
            | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "course_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "training_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string | null
          created_at: string | null
          entity_id: string | null
          id: string
          is_active: boolean | null
          name_ar: string | null
          name_en: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          entity_id?: string | null
          id?: string
          is_active?: boolean | null
          name_ar?: string | null
          name_en: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          entity_id?: string | null
          id?: string
          is_active?: boolean | null
          name_ar?: string | null
          name_en?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name_ar: string | null
          name_en: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name_ar?: string | null
          name_en: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name_ar?: string | null
          name_en?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entities_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          department_id: string | null
          email: string | null
          employee_id: string | null
          entity_id: string | null
          first_name_ar: string | null
          first_name_en: string | null
          grade: string | null
          hire_date: string | null
          id: string
          job_title_ar: string | null
          job_title_en: string | null
          last_name_ar: string | null
          last_name_en: string | null
          manager_id: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          employee_id?: string | null
          entity_id?: string | null
          first_name_ar?: string | null
          first_name_en?: string | null
          grade?: string | null
          hire_date?: string | null
          id: string
          job_title_ar?: string | null
          job_title_en?: string | null
          last_name_ar?: string | null
          last_name_en?: string | null
          manager_id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          employee_id?: string | null
          entity_id?: string | null
          first_name_ar?: string | null
          first_name_en?: string | null
          grade?: string | null
          hire_date?: string | null
          id?: string
          job_title_ar?: string | null
          job_title_en?: string | null
          last_name_ar?: string | null
          last_name_en?: string | null
          manager_id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      request_participants: {
        Row: {
          created_at: string | null
          id: string
          participant_id: string
          request_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          participant_id: string
          request_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          participant_id?: string
          request_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_participants_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "training_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          capacity: number | null
          course_id: string
          created_at: string | null
          created_by: string | null
          end_date: string
          enrolled_count: number | null
          id: string
          instructor_name: string | null
          location_ar: string | null
          location_en: string | null
          session_code: string | null
          start_date: string
          status: string | null
          updated_at: string | null
          venue_details: string | null
          waitlist_count: number | null
        }
        Insert: {
          capacity?: number | null
          course_id: string
          created_at?: string | null
          created_by?: string | null
          end_date: string
          enrolled_count?: number | null
          id?: string
          instructor_name?: string | null
          location_ar?: string | null
          location_en?: string | null
          session_code?: string | null
          start_date: string
          status?: string | null
          updated_at?: string | null
          venue_details?: string | null
          waitlist_count?: number | null
        }
        Update: {
          capacity?: number | null
          course_id?: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string
          enrolled_count?: number | null
          id?: string
          instructor_name?: string | null
          location_ar?: string | null
          location_en?: string | null
          session_code?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string | null
          venue_details?: string | null
          waitlist_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      training_providers: {
        Row: {
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name_ar: string | null
          name_en: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name_ar?: string | null
          name_en: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name_ar?: string | null
          name_en?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      training_requests: {
        Row: {
          abroad_reason: string | null
          completed_at: string | null
          course_id: string
          created_at: string | null
          current_approval_level: number | null
          current_approver_id: string | null
          estimated_cost: number | null
          id: string
          justification: string | null
          preferred_end_date: string | null
          preferred_start_date: string | null
          priority: string | null
          request_number: string | null
          request_type: string | null
          requester_id: string
          session_id: string | null
          status: Database["public"]["Enums"]["request_status"] | null
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          abroad_reason?: string | null
          completed_at?: string | null
          course_id: string
          created_at?: string | null
          current_approval_level?: number | null
          current_approver_id?: string | null
          estimated_cost?: number | null
          id?: string
          justification?: string | null
          preferred_end_date?: string | null
          preferred_start_date?: string | null
          priority?: string | null
          request_number?: string | null
          request_type?: string | null
          requester_id: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          abroad_reason?: string | null
          completed_at?: string | null
          course_id?: string
          created_at?: string | null
          current_approval_level?: number | null
          current_approver_id?: string | null
          estimated_cost?: number | null
          id?: string
          justification?: string | null
          preferred_end_date?: string | null
          preferred_start_date?: string | null
          priority?: string | null
          request_number?: string | null
          request_type?: string | null
          requester_id?: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_requests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_requests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
    }
    Enums: {
      app_role: "employee" | "manager" | "hrbp" | "l_and_d" | "chro" | "admin"
      approval_status: "pending" | "approved" | "rejected" | "escalated"
      cost_level: "low" | "medium" | "high"
      delivery_mode: "classroom" | "online" | "blended" | "on_the_job"
      request_status:
        | "draft"
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
        | "completed"
      training_location: "local" | "abroad"
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
      app_role: ["employee", "manager", "hrbp", "l_and_d", "chro", "admin"],
      approval_status: ["pending", "approved", "rejected", "escalated"],
      cost_level: ["low", "medium", "high"],
      delivery_mode: ["classroom", "online", "blended", "on_the_job"],
      request_status: [
        "draft",
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "completed",
      ],
      training_location: ["local", "abroad"],
    },
  },
} as const
