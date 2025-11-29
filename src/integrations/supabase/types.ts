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
      attendance_audit_log: {
        Row: {
          changed_at: string | null
          changed_by: string
          enrollment_id: string
          field_changed: string
          id: string
          new_value: string | null
          old_value: string | null
          reason: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by: string
          enrollment_id: string
          field_changed: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string
          enrollment_id?: string
          field_changed?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_audit_log_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "session_enrollments"
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
      certificate_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          certificate_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          template_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          certificate_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          template_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          certificate_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificate_audit_log_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_audit_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_count: number | null
          errors: Json | null
          id: string
          job_type: string
          processed_count: number | null
          session_id: string | null
          started_at: string | null
          status: string | null
          success_count: number | null
          total_count: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_count?: number | null
          errors?: Json | null
          id?: string
          job_type: string
          processed_count?: number | null
          session_id?: string | null
          started_at?: string | null
          status?: string | null
          success_count?: number | null
          total_count?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_count?: number | null
          errors?: Json | null
          id?: string
          job_type?: string
          processed_count?: number | null
          session_id?: string | null
          started_at?: string | null
          status?: string | null
          success_count?: number | null
          total_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "certificate_jobs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_templates: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          background_url: string | null
          created_at: string | null
          created_by: string | null
          custom_css: string | null
          description: string | null
          font_family: string | null
          footer_logo_url: string | null
          header_logo_url: string | null
          id: string
          is_approved: boolean | null
          is_default: boolean | null
          language: string | null
          name: string
          orientation: string | null
          page_size: string | null
          placeholders: Json | null
          primary_color: string | null
          secondary_color: string | null
          signature_image_url: string | null
          status: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          background_url?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_css?: string | null
          description?: string | null
          font_family?: string | null
          footer_logo_url?: string | null
          header_logo_url?: string | null
          id?: string
          is_approved?: boolean | null
          is_default?: boolean | null
          language?: string | null
          name: string
          orientation?: string | null
          page_size?: string | null
          placeholders?: Json | null
          primary_color?: string | null
          secondary_color?: string | null
          signature_image_url?: string | null
          status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          background_url?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_css?: string | null
          description?: string | null
          font_family?: string | null
          footer_logo_url?: string | null
          header_logo_url?: string | null
          id?: string
          is_approved?: boolean | null
          is_default?: boolean | null
          language?: string | null
          name?: string
          orientation?: string | null
          page_size?: string | null
          placeholders?: Json | null
          primary_color?: string | null
          secondary_color?: string | null
          signature_image_url?: string | null
          status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      certificates: {
        Row: {
          assessment_score: number | null
          certificate_number: string
          completion_date: string | null
          course_id: string
          course_name_ar: string | null
          course_name_en: string | null
          cpd_hours: number | null
          created_at: string | null
          duration_hours: number | null
          employee_id: string
          enrollment_id: string | null
          expires_at: string | null
          id: string
          import_source: string | null
          is_historical_import: boolean | null
          issued_at: string | null
          metadata: Json | null
          participant_employee_id: string | null
          participant_name_ar: string | null
          participant_name_en: string | null
          pdf_url: string | null
          provider_name: string | null
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          session_end_date: string | null
          session_id: string | null
          session_start_date: string | null
          status: string | null
          template_id: string | null
          template_version: number | null
          trainer_name: string | null
          updated_at: string | null
          verification_token: string | null
        }
        Insert: {
          assessment_score?: number | null
          certificate_number: string
          completion_date?: string | null
          course_id: string
          course_name_ar?: string | null
          course_name_en?: string | null
          cpd_hours?: number | null
          created_at?: string | null
          duration_hours?: number | null
          employee_id: string
          enrollment_id?: string | null
          expires_at?: string | null
          id?: string
          import_source?: string | null
          is_historical_import?: boolean | null
          issued_at?: string | null
          metadata?: Json | null
          participant_employee_id?: string | null
          participant_name_ar?: string | null
          participant_name_en?: string | null
          pdf_url?: string | null
          provider_name?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          session_end_date?: string | null
          session_id?: string | null
          session_start_date?: string | null
          status?: string | null
          template_id?: string | null
          template_version?: number | null
          trainer_name?: string | null
          updated_at?: string | null
          verification_token?: string | null
        }
        Update: {
          assessment_score?: number | null
          certificate_number?: string
          completion_date?: string | null
          course_id?: string
          course_name_ar?: string | null
          course_name_en?: string | null
          cpd_hours?: number | null
          created_at?: string | null
          duration_hours?: number | null
          employee_id?: string
          enrollment_id?: string | null
          expires_at?: string | null
          id?: string
          import_source?: string | null
          is_historical_import?: boolean | null
          issued_at?: string | null
          metadata?: Json | null
          participant_employee_id?: string | null
          participant_name_ar?: string | null
          participant_name_en?: string | null
          pdf_url?: string | null
          provider_name?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          session_end_date?: string | null
          session_id?: string | null
          session_start_date?: string | null
          status?: string | null
          template_id?: string | null
          template_version?: number | null
          trainer_name?: string | null
          updated_at?: string | null
          verification_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "session_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_requirements: {
        Row: {
          course_id: string
          created_at: string | null
          created_by: string | null
          grace_period_days: number | null
          id: string
          is_active: boolean | null
          recurrence_months: number | null
          target_type: string
          target_value: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          created_by?: string | null
          grace_period_days?: number | null
          id?: string
          is_active?: boolean | null
          recurrence_months?: number | null
          target_type: string
          target_value?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          created_by?: string | null
          grace_period_days?: number | null
          id?: string
          is_active?: boolean | null
          recurrence_months?: number | null
          target_type?: string
          target_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_requirements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
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
      course_certificate_templates: {
        Row: {
          category_id: string | null
          course_id: string | null
          created_at: string | null
          id: string
          priority: number | null
          template_id: string
        }
        Insert: {
          category_id?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          priority?: number | null
          template_id: string
        }
        Update: {
          category_id?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          priority?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_certificate_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "course_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_certificate_templates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_certificate_templates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category_id: string | null
          certificate_template: string | null
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
          has_assessment: boolean | null
          id: string
          is_active: boolean | null
          is_mandatory: boolean | null
          max_participants: number | null
          min_attendance_percent: number | null
          min_participants: number | null
          name_ar: string | null
          name_en: string
          pass_score: number | null
          prerequisites: string[] | null
          provider_id: string | null
          require_both_attendance_and_assessment: boolean | null
          target_grades: string[] | null
          training_location:
            | Database["public"]["Enums"]["training_location"]
            | null
          updated_at: string | null
          validity_months: number | null
        }
        Insert: {
          category_id?: string | null
          certificate_template?: string | null
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
          has_assessment?: boolean | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          max_participants?: number | null
          min_attendance_percent?: number | null
          min_participants?: number | null
          name_ar?: string | null
          name_en: string
          pass_score?: number | null
          prerequisites?: string[] | null
          provider_id?: string | null
          require_both_attendance_and_assessment?: boolean | null
          target_grades?: string[] | null
          training_location?:
            | Database["public"]["Enums"]["training_location"]
            | null
          updated_at?: string | null
          validity_months?: number | null
        }
        Update: {
          category_id?: string | null
          certificate_template?: string | null
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
          has_assessment?: boolean | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          max_participants?: number | null
          min_attendance_percent?: number | null
          min_participants?: number | null
          name_ar?: string | null
          name_en?: string
          pass_score?: number | null
          prerequisites?: string[] | null
          provider_id?: string | null
          require_both_attendance_and_assessment?: boolean | null
          target_grades?: string[] | null
          training_location?:
            | Database["public"]["Enums"]["training_location"]
            | null
          updated_at?: string | null
          validity_months?: number | null
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
      employee_compliance: {
        Row: {
          course_id: string
          employee_id: string
          id: string
          last_completion_date: string | null
          last_enrollment_id: string | null
          next_due_date: string | null
          requirement_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          course_id: string
          employee_id: string
          id?: string
          last_completion_date?: string | null
          last_enrollment_id?: string | null
          next_due_date?: string | null
          requirement_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          employee_id?: string
          id?: string
          last_completion_date?: string | null
          last_enrollment_id?: string | null
          next_due_date?: string | null
          requirement_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_compliance_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_compliance_last_enrollment_id_fkey"
            columns: ["last_enrollment_id"]
            isOneToOne: false
            referencedRelation: "session_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_compliance_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "compliance_requirements"
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
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          read_at: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
      session_changes: {
        Row: {
          change_type: string
          changed_by: string
          created_at: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          reason: string | null
          session_id: string
        }
        Insert: {
          change_type: string
          changed_by: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          session_id: string
        }
        Update: {
          change_type?: string
          changed_by?: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_changes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_enrollments: {
        Row: {
          assessment_score: number | null
          attendance_comments: string | null
          attendance_finalized_at: string | null
          attendance_finalized_by: string | null
          attendance_minutes: number | null
          attendance_status: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          certificate_generated_at: string | null
          certificate_url: string | null
          check_in_time: string | null
          check_out_time: string | null
          completion_date: string | null
          completion_finalized_at: string | null
          completion_finalized_by: string | null
          completion_status: string | null
          confirmed_at: string | null
          created_at: string | null
          enrolled_at: string | null
          enrolled_by: string | null
          id: string
          is_attendance_final: boolean | null
          is_completion_final: boolean | null
          participant_id: string
          passed: boolean | null
          request_id: string | null
          session_id: string
          status: string | null
          updated_at: string | null
          waitlist_position: number | null
        }
        Insert: {
          assessment_score?: number | null
          attendance_comments?: string | null
          attendance_finalized_at?: string | null
          attendance_finalized_by?: string | null
          attendance_minutes?: number | null
          attendance_status?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          certificate_generated_at?: string | null
          certificate_url?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          completion_date?: string | null
          completion_finalized_at?: string | null
          completion_finalized_by?: string | null
          completion_status?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          enrolled_at?: string | null
          enrolled_by?: string | null
          id?: string
          is_attendance_final?: boolean | null
          is_completion_final?: boolean | null
          participant_id: string
          passed?: boolean | null
          request_id?: string | null
          session_id: string
          status?: string | null
          updated_at?: string | null
          waitlist_position?: number | null
        }
        Update: {
          assessment_score?: number | null
          attendance_comments?: string | null
          attendance_finalized_at?: string | null
          attendance_finalized_by?: string | null
          attendance_minutes?: number | null
          attendance_status?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          certificate_generated_at?: string | null
          certificate_url?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          completion_date?: string | null
          completion_finalized_at?: string | null
          completion_finalized_by?: string | null
          completion_status?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          enrolled_at?: string | null
          enrolled_by?: string | null
          id?: string
          is_attendance_final?: boolean | null
          is_completion_final?: boolean | null
          participant_id?: string
          passed?: boolean | null
          request_id?: string | null
          session_id?: string
          status?: string | null
          updated_at?: string | null
          waitlist_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_enrollments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "training_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_enrollments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
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
          trainer_id: string | null
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
          trainer_id?: string | null
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
          trainer_id?: string | null
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
          workflow_template_id: string | null
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
          workflow_template_id?: string | null
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
          workflow_template_id?: string | null
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
          {
            foreignKeyName: "training_requests_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
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
      workflow_rules: {
        Row: {
          condition_operator: string
          condition_type: string
          condition_value: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          template_id: string
        }
        Insert: {
          condition_operator: string
          condition_type: string
          condition_value: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          template_id: string
        }
        Update: {
          condition_operator?: string
          condition_type?: string
          condition_value?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          approver_role: Database["public"]["Enums"]["app_role"]
          auto_approve_condition: Json | null
          can_delegate: boolean | null
          created_at: string | null
          id: string
          is_auto_approve: boolean | null
          step_order: number
          template_id: string
          timeout_days: number | null
        }
        Insert: {
          approver_role: Database["public"]["Enums"]["app_role"]
          auto_approve_condition?: Json | null
          can_delegate?: boolean | null
          created_at?: string | null
          id?: string
          is_auto_approve?: boolean | null
          step_order: number
          template_id: string
          timeout_days?: number | null
        }
        Update: {
          approver_role?: Database["public"]["Enums"]["app_role"]
          auto_approve_condition?: Json | null
          can_delegate?: boolean | null
          created_at?: string | null
          id?: string
          is_auto_approve?: boolean | null
          step_order?: number
          template_id?: string
          timeout_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name_ar: string | null
          name_en: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name_ar?: string | null
          name_en: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name_ar?: string | null
          name_en?: string
          updated_at?: string | null
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
