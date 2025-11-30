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
      academic_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          field_changed: string | null
          id: string
          module_id: string | null
          new_value: string | null
          old_value: string | null
          scholar_record_id: string | null
          term_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          field_changed?: string | null
          id?: string
          module_id?: string | null
          new_value?: string | null
          old_value?: string | null
          scholar_record_id?: string | null
          term_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          field_changed?: string | null
          id?: string
          module_id?: string | null
          new_value?: string | null
          old_value?: string | null
          scholar_record_id?: string | null
          term_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_audit_log_scholar_record_id_fkey"
            columns: ["scholar_record_id"]
            isOneToOne: false
            referencedRelation: "scholar_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_audit_log_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_documents: {
        Row: {
          academic_year: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          notes: string | null
          scholar_record_id: string
          term_id: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          academic_year?: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          scholar_record_id: string
          term_id?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          academic_year?: string | null
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          scholar_record_id?: string
          term_id?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_documents_scholar_record_id_fkey"
            columns: ["scholar_record_id"]
            isOneToOne: false
            referencedRelation: "scholar_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_documents_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_events: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          document_url: string | null
          end_date: string | null
          event_date: string
          event_type: string
          id: string
          impact_on_completion: boolean | null
          new_expected_end_date: string | null
          reason: string | null
          scholar_record_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_url?: string | null
          end_date?: string | null
          event_date: string
          event_type: string
          id?: string
          impact_on_completion?: boolean | null
          new_expected_end_date?: string | null
          reason?: string | null
          scholar_record_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_url?: string | null
          end_date?: string | null
          event_date?: string
          event_type?: string
          id?: string
          impact_on_completion?: boolean | null
          new_expected_end_date?: string | null
          reason?: string | null
          scholar_record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_events_scholar_record_id_fkey"
            columns: ["scholar_record_id"]
            isOneToOne: false
            referencedRelation: "scholar_records"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_modules: {
        Row: {
          created_at: string | null
          credits: number
          exam_attempts: number | null
          grade: string | null
          grade_points: number | null
          id: string
          is_retake: boolean | null
          module_code: string | null
          module_name: string
          module_type: string | null
          notes: string | null
          passed: boolean | null
          term_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credits: number
          exam_attempts?: number | null
          grade?: string | null
          grade_points?: number | null
          id?: string
          is_retake?: boolean | null
          module_code?: string | null
          module_name: string
          module_type?: string | null
          notes?: string | null
          passed?: boolean | null
          term_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credits?: number
          exam_attempts?: number | null
          grade?: string | null
          grade_points?: number | null
          id?: string
          is_retake?: boolean | null
          module_code?: string | null
          module_name?: string
          module_type?: string | null
          notes?: string | null
          passed?: boolean | null
          term_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_modules_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_risk_rules: {
        Row: {
          condition_type: string
          condition_value: Json
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          risk_level: string
          rule_name: string
        }
        Insert: {
          condition_type: string
          condition_value: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          risk_level: string
          rule_name: string
        }
        Update: {
          condition_type?: string
          condition_value?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          risk_level?: string
          rule_name?: string
        }
        Relationships: []
      }
      academic_terms: {
        Row: {
          created_at: string | null
          created_by: string | null
          credits_attempted: number | null
          credits_earned: number | null
          end_date: string | null
          id: string
          notes: string | null
          scholar_record_id: string
          start_date: string | null
          status: string | null
          term_gpa: number | null
          term_name: string
          term_number: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          credits_attempted?: number | null
          credits_earned?: number | null
          end_date?: string | null
          id?: string
          notes?: string | null
          scholar_record_id: string
          start_date?: string | null
          status?: string | null
          term_gpa?: number | null
          term_name: string
          term_number: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          credits_attempted?: number | null
          credits_earned?: number | null
          end_date?: string | null
          id?: string
          notes?: string | null
          scholar_record_id?: string
          start_date?: string | null
          status?: string | null
          term_gpa?: number | null
          term_name?: string
          term_number?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_terms_scholar_record_id_fkey"
            columns: ["scholar_record_id"]
            isOneToOne: false
            referencedRelation: "scholar_records"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_priority_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: []
      }
      ai_priority_config: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          competency_gap_weight: number | null
          compliance_status_weight: number | null
          config_name: string
          cost_efficiency_weight: number | null
          created_at: string | null
          created_by: string | null
          critical_threshold: number | null
          high_threshold: number | null
          hse_criticality_weight: number | null
          id: string
          is_active: boolean | null
          manager_priority_weight: number | null
          medium_threshold: number | null
          role_criticality_weight: number | null
          strategic_alignment_weight: number | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          competency_gap_weight?: number | null
          compliance_status_weight?: number | null
          config_name?: string
          cost_efficiency_weight?: number | null
          created_at?: string | null
          created_by?: string | null
          critical_threshold?: number | null
          high_threshold?: number | null
          hse_criticality_weight?: number | null
          id?: string
          is_active?: boolean | null
          manager_priority_weight?: number | null
          medium_threshold?: number | null
          role_criticality_weight?: number | null
          strategic_alignment_weight?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          competency_gap_weight?: number | null
          compliance_status_weight?: number | null
          config_name?: string
          cost_efficiency_weight?: number | null
          created_at?: string | null
          created_by?: string | null
          critical_threshold?: number | null
          high_threshold?: number | null
          hse_criticality_weight?: number | null
          id?: string
          is_active?: boolean | null
          manager_priority_weight?: number | null
          medium_threshold?: number | null
          role_criticality_weight?: number | null
          strategic_alignment_weight?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      ai_priority_scores: {
        Row: {
          competency_gap_contribution: number | null
          compliance_contribution: number | null
          config_version: number | null
          cost_contribution: number | null
          created_at: string | null
          explanation_summary: string | null
          factor_details: Json | null
          hse_contribution: number | null
          id: string
          is_overridden: boolean | null
          manager_priority_contribution: number | null
          model_version: string | null
          original_band: string | null
          original_score: number | null
          overridden_at: string | null
          overridden_by: string | null
          override_reason: string | null
          plan_item_id: string | null
          priority_band: string
          priority_score: number
          role_criticality_contribution: number | null
          scored_at: string | null
          scoring_job_id: string | null
          strategic_contribution: number | null
          tna_item_id: string | null
          updated_at: string | null
        }
        Insert: {
          competency_gap_contribution?: number | null
          compliance_contribution?: number | null
          config_version?: number | null
          cost_contribution?: number | null
          created_at?: string | null
          explanation_summary?: string | null
          factor_details?: Json | null
          hse_contribution?: number | null
          id?: string
          is_overridden?: boolean | null
          manager_priority_contribution?: number | null
          model_version?: string | null
          original_band?: string | null
          original_score?: number | null
          overridden_at?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          plan_item_id?: string | null
          priority_band: string
          priority_score: number
          role_criticality_contribution?: number | null
          scored_at?: string | null
          scoring_job_id?: string | null
          strategic_contribution?: number | null
          tna_item_id?: string | null
          updated_at?: string | null
        }
        Update: {
          competency_gap_contribution?: number | null
          compliance_contribution?: number | null
          config_version?: number | null
          cost_contribution?: number | null
          created_at?: string | null
          explanation_summary?: string | null
          factor_details?: Json | null
          hse_contribution?: number | null
          id?: string
          is_overridden?: boolean | null
          manager_priority_contribution?: number | null
          model_version?: string | null
          original_band?: string | null
          original_score?: number | null
          overridden_at?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          plan_item_id?: string | null
          priority_band?: string
          priority_score?: number
          role_criticality_contribution?: number | null
          scored_at?: string | null
          scoring_job_id?: string | null
          strategic_contribution?: number | null
          tna_item_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_priority_scores_plan_item_id_fkey"
            columns: ["plan_item_id"]
            isOneToOne: false
            referencedRelation: "training_plan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_priority_scores_tna_item_id_fkey"
            columns: ["tna_item_id"]
            isOneToOne: false
            referencedRelation: "tna_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_scoring_jobs: {
        Row: {
          completed_at: string | null
          config_snapshot: Json | null
          created_at: string | null
          created_by: string | null
          error_count: number | null
          error_log: Json | null
          estimated_completion: string | null
          id: string
          job_name: string | null
          job_type: string
          model_version: string | null
          plan_id: string | null
          processed_items: number | null
          scope_filter: Json | null
          started_at: string | null
          status: string | null
          success_count: number | null
          tna_period_id: string | null
          total_items: number | null
        }
        Insert: {
          completed_at?: string | null
          config_snapshot?: Json | null
          created_at?: string | null
          created_by?: string | null
          error_count?: number | null
          error_log?: Json | null
          estimated_completion?: string | null
          id?: string
          job_name?: string | null
          job_type?: string
          model_version?: string | null
          plan_id?: string | null
          processed_items?: number | null
          scope_filter?: Json | null
          started_at?: string | null
          status?: string | null
          success_count?: number | null
          tna_period_id?: string | null
          total_items?: number | null
        }
        Update: {
          completed_at?: string | null
          config_snapshot?: Json | null
          created_at?: string | null
          created_by?: string | null
          error_count?: number | null
          error_log?: Json | null
          estimated_completion?: string | null
          id?: string
          job_name?: string | null
          job_type?: string
          model_version?: string | null
          plan_id?: string | null
          processed_items?: number | null
          scope_filter?: Json | null
          started_at?: string | null
          status?: string | null
          success_count?: number | null
          tna_period_id?: string | null
          total_items?: number | null
        }
        Relationships: []
      }
      ai_tag_feedback: {
        Row: {
          action: string
          confidence_score: number | null
          course_id: string
          created_at: string | null
          created_by: string | null
          edited_to: string | null
          id: string
          model_version: string | null
          suggestion_id: string | null
          tag_type: Database["public"]["Enums"]["tag_type"]
          tag_value: string
          user_role: string | null
        }
        Insert: {
          action: string
          confidence_score?: number | null
          course_id: string
          created_at?: string | null
          created_by?: string | null
          edited_to?: string | null
          id?: string
          model_version?: string | null
          suggestion_id?: string | null
          tag_type: Database["public"]["Enums"]["tag_type"]
          tag_value: string
          user_role?: string | null
        }
        Update: {
          action?: string
          confidence_score?: number | null
          course_id?: string
          created_at?: string | null
          created_by?: string | null
          edited_to?: string | null
          id?: string
          model_version?: string | null
          suggestion_id?: string | null
          tag_type?: Database["public"]["Enums"]["tag_type"]
          tag_value?: string
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_tag_feedback_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "ai_tag_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tag_suggestions: {
        Row: {
          confidence_level: Database["public"]["Enums"]["confidence_level"]
          confidence_score: number
          config_version: number | null
          course_id: string
          explanation: string | null
          id: string
          model_version: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_snippet: string | null
          status: Database["public"]["Enums"]["tag_suggestion_status"] | null
          suggested_at: string | null
          tag_type: Database["public"]["Enums"]["tag_type"]
          tag_value: string
        }
        Insert: {
          confidence_level: Database["public"]["Enums"]["confidence_level"]
          confidence_score: number
          config_version?: number | null
          course_id: string
          explanation?: string | null
          id?: string
          model_version?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_snippet?: string | null
          status?: Database["public"]["Enums"]["tag_suggestion_status"] | null
          suggested_at?: string | null
          tag_type: Database["public"]["Enums"]["tag_type"]
          tag_value: string
        }
        Update: {
          confidence_level?: Database["public"]["Enums"]["confidence_level"]
          confidence_score?: number
          config_version?: number | null
          course_id?: string
          explanation?: string | null
          id?: string
          model_version?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_snippet?: string | null
          status?: Database["public"]["Enums"]["tag_suggestion_status"] | null
          suggested_at?: string | null
          tag_type?: Database["public"]["Enums"]["tag_type"]
          tag_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tag_suggestions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tagging_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: []
      }
      ai_tagging_config: {
        Row: {
          created_at: string | null
          high_confidence_threshold: number | null
          id: string
          is_enabled: boolean | null
          max_suggestions: number | null
          medium_confidence_threshold: number | null
          tag_type: Database["public"]["Enums"]["tag_type"]
          updated_at: string | null
          updated_by: string | null
          use_controlled_vocabulary: boolean | null
          vocabulary_source: string | null
        }
        Insert: {
          created_at?: string | null
          high_confidence_threshold?: number | null
          id?: string
          is_enabled?: boolean | null
          max_suggestions?: number | null
          medium_confidence_threshold?: number | null
          tag_type: Database["public"]["Enums"]["tag_type"]
          updated_at?: string | null
          updated_by?: string | null
          use_controlled_vocabulary?: boolean | null
          vocabulary_source?: string | null
        }
        Update: {
          created_at?: string | null
          high_confidence_threshold?: number | null
          id?: string
          is_enabled?: boolean | null
          max_suggestions?: number | null
          medium_confidence_threshold?: number | null
          tag_type?: Database["public"]["Enums"]["tag_type"]
          updated_at?: string | null
          updated_by?: string | null
          use_controlled_vocabulary?: boolean | null
          vocabulary_source?: string | null
        }
        Relationships: []
      }
      ai_tagging_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_log: Json | null
          failed_count: number | null
          id: string
          job_name: string | null
          model_version: string | null
          preserve_existing_tags: boolean | null
          processed_items: number | null
          scope_filter: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["tagging_job_status"] | null
          success_count: number | null
          total_items: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_log?: Json | null
          failed_count?: number | null
          id?: string
          job_name?: string | null
          model_version?: string | null
          preserve_existing_tags?: boolean | null
          processed_items?: number | null
          scope_filter?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["tagging_job_status"] | null
          success_count?: number | null
          total_items?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_log?: Json | null
          failed_count?: number | null
          id?: string
          job_name?: string | null
          model_version?: string | null
          preserve_existing_tags?: boolean | null
          processed_items?: number | null
          scope_filter?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["tagging_job_status"] | null
          success_count?: number | null
          total_items?: number | null
        }
        Relationships: []
      }
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
      bond_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          bond_id: string | null
          created_at: string | null
          event_id: string | null
          field_changed: string | null
          id: string
          new_value: string | null
          old_value: string | null
          reason: string | null
          repayment_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          bond_id?: string | null
          created_at?: string | null
          event_id?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
          repayment_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          bond_id?: string | null
          created_at?: string | null
          event_id?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
          repayment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bond_audit_log_bond_id_fkey"
            columns: ["bond_id"]
            isOneToOne: false
            referencedRelation: "service_bonds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bond_audit_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "bond_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bond_audit_log_repayment_id_fkey"
            columns: ["repayment_id"]
            isOneToOne: false
            referencedRelation: "bond_repayments"
            referencedColumns: ["id"]
          },
        ]
      }
      bond_events: {
        Row: {
          approval_chain: Json | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          bond_id: string
          created_at: string | null
          created_by: string | null
          days_affected: number | null
          description: string | null
          document_url: string | null
          end_date: string | null
          event_date: string
          event_type: string
          id: string
          reason: string | null
          waiver_amount: number | null
          waiver_time_months: number | null
          waiver_type: string | null
        }
        Insert: {
          approval_chain?: Json | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bond_id: string
          created_at?: string | null
          created_by?: string | null
          days_affected?: number | null
          description?: string | null
          document_url?: string | null
          end_date?: string | null
          event_date: string
          event_type: string
          id?: string
          reason?: string | null
          waiver_amount?: number | null
          waiver_time_months?: number | null
          waiver_type?: string | null
        }
        Update: {
          approval_chain?: Json | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bond_id?: string
          created_at?: string | null
          created_by?: string | null
          days_affected?: number | null
          description?: string | null
          document_url?: string | null
          end_date?: string | null
          event_date?: string
          event_type?: string
          id?: string
          reason?: string | null
          waiver_amount?: number | null
          waiver_time_months?: number | null
          waiver_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bond_events_bond_id_fkey"
            columns: ["bond_id"]
            isOneToOne: false
            referencedRelation: "service_bonds"
            referencedColumns: ["id"]
          },
        ]
      }
      bond_policies: {
        Row: {
          bond_duration_months: number
          bond_type: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          max_funding_amount: number | null
          min_funding_amount: number | null
          policy_name: string
          program_type: string
          repayment_formula: string | null
          repayment_percentage: number | null
          training_location: string | null
          updated_at: string | null
        }
        Insert: {
          bond_duration_months?: number
          bond_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          max_funding_amount?: number | null
          min_funding_amount?: number | null
          policy_name: string
          program_type: string
          repayment_formula?: string | null
          repayment_percentage?: number | null
          training_location?: string | null
          updated_at?: string | null
        }
        Update: {
          bond_duration_months?: number
          bond_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          max_funding_amount?: number | null
          min_funding_amount?: number | null
          policy_name?: string
          program_type?: string
          repayment_formula?: string | null
          repayment_percentage?: number | null
          training_location?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bond_repayments: {
        Row: {
          amount: number
          bond_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          reference_number: string | null
          status: string | null
        }
        Insert: {
          amount: number
          bond_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          reference_number?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          bond_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          reference_number?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bond_repayments_bond_id_fkey"
            columns: ["bond_id"]
            isOneToOne: false
            referencedRelation: "service_bonds"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          budget_id: string | null
          created_at: string | null
          id: string
          justification: string | null
          new_values: Json | null
          old_values: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          budget_id?: string | null
          created_at?: string | null
          id?: string
          justification?: string | null
          new_values?: Json | null
          old_values?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          budget_id?: string | null
          created_at?: string | null
          id?: string
          justification?: string | null
          new_values?: Json | null
          old_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_audit_log_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "training_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_thresholds: {
        Row: {
          applies_to: string
          category_filter: string[] | null
          created_at: string | null
          created_by: string | null
          entity_filter: string[] | null
          id: string
          is_active: boolean | null
          requires_approval_role: string | null
          threshold_name: string
          threshold_percentage: number
          threshold_type: string
          updated_at: string | null
        }
        Insert: {
          applies_to?: string
          category_filter?: string[] | null
          created_at?: string | null
          created_by?: string | null
          entity_filter?: string[] | null
          id?: string
          is_active?: boolean | null
          requires_approval_role?: string | null
          threshold_name: string
          threshold_percentage: number
          threshold_type: string
          updated_at?: string | null
        }
        Update: {
          applies_to?: string
          category_filter?: string[] | null
          created_at?: string | null
          created_by?: string | null
          entity_filter?: string[] | null
          id?: string
          is_active?: boolean | null
          requires_approval_role?: string | null
          threshold_name?: string
          threshold_percentage?: number
          threshold_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      catalogue_approvals: {
        Row: {
          approver_id: string
          comments: string | null
          course_id: string
          created_at: string | null
          decision: string | null
          decision_at: string | null
          id: string
          status: string | null
        }
        Insert: {
          approver_id: string
          comments?: string | null
          course_id: string
          created_at?: string | null
          decision?: string | null
          decision_at?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          approver_id?: string
          comments?: string | null
          course_id?: string
          created_at?: string | null
          decision?: string | null
          decision_at?: string | null
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_approvals_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogue_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          comment: string | null
          course_id: string | null
          created_at: string | null
          field_changed: string | null
          id: string
          new_status: Database["public"]["Enums"]["catalogue_status"] | null
          new_value: string | null
          old_status: Database["public"]["Enums"]["catalogue_status"] | null
          old_value: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          comment?: string | null
          course_id?: string | null
          created_at?: string | null
          field_changed?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["catalogue_status"] | null
          new_value?: string | null
          old_status?: Database["public"]["Enums"]["catalogue_status"] | null
          old_value?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          comment?: string | null
          course_id?: string | null
          created_at?: string | null
          field_changed?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["catalogue_status"] | null
          new_value?: string | null
          old_status?: Database["public"]["Enums"]["catalogue_status"] | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_audit_log_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
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
      competencies: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          created_by: string | null
          description_ar: string | null
          description_en: string | null
          id: string
          is_active: boolean | null
          max_level: number | null
          name_ar: string | null
          name_en: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string | null
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean | null
          max_level?: number | null
          name_ar?: string | null
          name_en: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean | null
          max_level?: number | null
          name_ar?: string | null
          name_en?: string
          updated_at?: string | null
        }
        Relationships: []
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
      cost_analytics: {
        Row: {
          cost_centre: string | null
          created_at: string | null
          destination_city: string | null
          destination_country: string | null
          entity: string | null
          id: string
          is_abroad: boolean | null
          last_refreshed_at: string | null
          participant_count: number | null
          per_diem_cost: number | null
          per_diem_source: string | null
          period_month: number
          period_year: number
          provider_id: string | null
          provider_name: string | null
          session_count: number | null
          total_cost: number | null
          training_category: string | null
          travel_cost: number | null
          travel_source: string | null
          trip_count: number | null
          tuition_cost: number | null
          tuition_source: string | null
        }
        Insert: {
          cost_centre?: string | null
          created_at?: string | null
          destination_city?: string | null
          destination_country?: string | null
          entity?: string | null
          id?: string
          is_abroad?: boolean | null
          last_refreshed_at?: string | null
          participant_count?: number | null
          per_diem_cost?: number | null
          per_diem_source?: string | null
          period_month: number
          period_year: number
          provider_id?: string | null
          provider_name?: string | null
          session_count?: number | null
          total_cost?: number | null
          training_category?: string | null
          travel_cost?: number | null
          travel_source?: string | null
          trip_count?: number | null
          tuition_cost?: number | null
          tuition_source?: string | null
        }
        Update: {
          cost_centre?: string | null
          created_at?: string | null
          destination_city?: string | null
          destination_country?: string | null
          entity?: string | null
          id?: string
          is_abroad?: boolean | null
          last_refreshed_at?: string | null
          participant_count?: number | null
          per_diem_cost?: number | null
          per_diem_source?: string | null
          period_month?: number
          period_year?: number
          provider_id?: string | null
          provider_name?: string | null
          session_count?: number | null
          total_cost?: number | null
          training_category?: string | null
          travel_cost?: number | null
          travel_source?: string | null
          trip_count?: number | null
          tuition_cost?: number | null
          tuition_source?: string | null
        }
        Relationships: []
      }
      cost_anomalies: {
        Row: {
          actual_value: number | null
          detected_at: string | null
          entity_id: string
          entity_name: string | null
          entity_type: string
          expected_value: number | null
          id: string
          period_month: number | null
          period_year: number | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rule_id: string | null
          severity: string
          status: string | null
          variance_percentage: number | null
        }
        Insert: {
          actual_value?: number | null
          detected_at?: string | null
          entity_id: string
          entity_name?: string | null
          entity_type: string
          expected_value?: number | null
          id?: string
          period_month?: number | null
          period_year?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rule_id?: string | null
          severity: string
          status?: string | null
          variance_percentage?: number | null
        }
        Update: {
          actual_value?: number | null
          detected_at?: string | null
          entity_id?: string
          entity_name?: string | null
          entity_type?: string
          expected_value?: number | null
          id?: string
          period_month?: number | null
          period_year?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rule_id?: string | null
          severity?: string
          status?: string | null
          variance_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_anomalies_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "cost_anomaly_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_anomaly_rules: {
        Row: {
          applies_to: string | null
          comparison_type: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          rule_name: string
          rule_type: string
          severity: string
          threshold_value: number
        }
        Insert: {
          applies_to?: string | null
          comparison_type: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          rule_name: string
          rule_type: string
          severity?: string
          threshold_value: number
        }
        Update: {
          applies_to?: string | null
          comparison_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          rule_name?: string
          rule_type?: string
          severity?: string
          threshold_value?: number
        }
        Relationships: []
      }
      cost_export_log: {
        Row: {
          export_type: string
          exported_at: string | null
          exported_by: string | null
          filters: Json | null
          id: string
          row_count: number | null
        }
        Insert: {
          export_type: string
          exported_at?: string | null
          exported_by?: string | null
          filters?: Json | null
          id?: string
          row_count?: number | null
        }
        Update: {
          export_type?: string
          exported_at?: string | null
          exported_by?: string | null
          filters?: Json | null
          id?: string
          row_count?: number | null
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
      course_competencies: {
        Row: {
          competency_id: string
          course_id: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          level_from: number | null
          level_to: number | null
        }
        Insert: {
          competency_id: string
          course_id: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          level_from?: number | null
          level_to?: number | null
        }
        Update: {
          competency_id?: string
          course_id?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          level_from?: number | null
          level_to?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_competencies_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_competencies_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_job_roles: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          is_mandatory: boolean | null
          job_role_id: string
          mandatory_for_location: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          is_mandatory?: boolean | null
          job_role_id: string
          mandatory_for_location?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          is_mandatory?: boolean | null
          job_role_id?: string
          mandatory_for_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_job_roles_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_job_roles_job_role_id_fkey"
            columns: ["job_role_id"]
            isOneToOne: false
            referencedRelation: "job_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_tags: {
        Row: {
          added_at: string | null
          added_by: string | null
          course_id: string
          id: string
          is_ai_generated: boolean | null
          original_confidence: number | null
          tag_type: Database["public"]["Enums"]["tag_type"]
          tag_value: string
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          course_id: string
          id?: string
          is_ai_generated?: boolean | null
          original_confidence?: number | null
          tag_type: Database["public"]["Enums"]["tag_type"]
          tag_value: string
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          course_id?: string
          id?: string
          is_ai_generated?: boolean | null
          original_confidence?: number | null
          tag_type?: Database["public"]["Enums"]["tag_type"]
          tag_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_tags_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          abroad_city: string | null
          abroad_country: string | null
          approved_at: string | null
          approved_by: string | null
          catalogue_status:
            | Database["public"]["Enums"]["catalogue_status"]
            | null
          category_id: string | null
          certificate_template: string | null
          code: string | null
          contracted_rate: number | null
          cost_amount: number | null
          cost_currency: string | null
          cost_level: Database["public"]["Enums"]["cost_level"] | null
          cost_unit_type: Database["public"]["Enums"]["cost_unit_type"] | null
          created_at: string | null
          delivery_languages: string[] | null
          delivery_mode: Database["public"]["Enums"]["delivery_mode"]
          description_ar: string | null
          description_en: string | null
          duration_days: number | null
          duration_hours: number | null
          has_assessment: boolean | null
          id: string
          is_active: boolean | null
          is_mandatory: boolean | null
          local_site: string | null
          max_participants: number | null
          migration_locked: boolean | null
          migration_source: string | null
          min_attendance_percent: number | null
          min_participants: number | null
          name_ar: string | null
          name_en: string
          objectives: string | null
          pass_score: number | null
          prerequisites: string[] | null
          provider_id: string | null
          require_both_attendance_and_assessment: boolean | null
          submitted_at: string | null
          submitted_by: string | null
          target_audience: string | null
          target_grades: string[] | null
          training_location:
            | Database["public"]["Enums"]["training_location"]
            | null
          typical_frequency: string | null
          updated_at: string | null
          validity_months: number | null
          version: number | null
        }
        Insert: {
          abroad_city?: string | null
          abroad_country?: string | null
          approved_at?: string | null
          approved_by?: string | null
          catalogue_status?:
            | Database["public"]["Enums"]["catalogue_status"]
            | null
          category_id?: string | null
          certificate_template?: string | null
          code?: string | null
          contracted_rate?: number | null
          cost_amount?: number | null
          cost_currency?: string | null
          cost_level?: Database["public"]["Enums"]["cost_level"] | null
          cost_unit_type?: Database["public"]["Enums"]["cost_unit_type"] | null
          created_at?: string | null
          delivery_languages?: string[] | null
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"]
          description_ar?: string | null
          description_en?: string | null
          duration_days?: number | null
          duration_hours?: number | null
          has_assessment?: boolean | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          local_site?: string | null
          max_participants?: number | null
          migration_locked?: boolean | null
          migration_source?: string | null
          min_attendance_percent?: number | null
          min_participants?: number | null
          name_ar?: string | null
          name_en: string
          objectives?: string | null
          pass_score?: number | null
          prerequisites?: string[] | null
          provider_id?: string | null
          require_both_attendance_and_assessment?: boolean | null
          submitted_at?: string | null
          submitted_by?: string | null
          target_audience?: string | null
          target_grades?: string[] | null
          training_location?:
            | Database["public"]["Enums"]["training_location"]
            | null
          typical_frequency?: string | null
          updated_at?: string | null
          validity_months?: number | null
          version?: number | null
        }
        Update: {
          abroad_city?: string | null
          abroad_country?: string | null
          approved_at?: string | null
          approved_by?: string | null
          catalogue_status?:
            | Database["public"]["Enums"]["catalogue_status"]
            | null
          category_id?: string | null
          certificate_template?: string | null
          code?: string | null
          contracted_rate?: number | null
          cost_amount?: number | null
          cost_currency?: string | null
          cost_level?: Database["public"]["Enums"]["cost_level"] | null
          cost_unit_type?: Database["public"]["Enums"]["cost_unit_type"] | null
          created_at?: string | null
          delivery_languages?: string[] | null
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"]
          description_ar?: string | null
          description_en?: string | null
          duration_days?: number | null
          duration_hours?: number | null
          has_assessment?: boolean | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          local_site?: string | null
          max_participants?: number | null
          migration_locked?: boolean | null
          migration_source?: string | null
          min_attendance_percent?: number | null
          min_participants?: number | null
          name_ar?: string | null
          name_en?: string
          objectives?: string | null
          pass_score?: number | null
          prerequisites?: string[] | null
          provider_id?: string | null
          require_both_attendance_and_assessment?: boolean | null
          submitted_at?: string | null
          submitted_by?: string | null
          target_audience?: string | null
          target_grades?: string[] | null
          training_location?:
            | Database["public"]["Enums"]["training_location"]
            | null
          typical_frequency?: string | null
          updated_at?: string | null
          validity_months?: number | null
          version?: number | null
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
      expense_export_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          batch_id: string | null
          created_at: string | null
          details: Json | null
          endpoint_called: string | null
          error_message: string | null
          file_path: string | null
          http_status: number | null
          id: string
          new_status: string | null
          old_status: string | null
          record_id: string | null
          response_snippet: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          batch_id?: string | null
          created_at?: string | null
          details?: Json | null
          endpoint_called?: string | null
          error_message?: string | null
          file_path?: string | null
          http_status?: number | null
          id?: string
          new_status?: string | null
          old_status?: string | null
          record_id?: string | null
          response_snippet?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          batch_id?: string | null
          created_at?: string | null
          details?: Json | null
          endpoint_called?: string | null
          error_message?: string | null
          file_path?: string | null
          http_status?: number | null
          id?: string
          new_status?: string | null
          old_status?: string | null
          record_id?: string | null
          response_snippet?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_export_audit_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "expense_export_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_export_audit_log_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "expense_export_records"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_export_batches: {
        Row: {
          batch_number: string
          config_id: string | null
          cost_centre_filter: string[] | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          deferred_records: number | null
          entity_filter: string[] | null
          error_records: number | null
          export_file_name: string | null
          export_file_path: string | null
          export_type: Database["public"]["Enums"]["export_type"]
          exported_at: string | null
          exported_by: string | null
          external_batch_id: string | null
          id: string
          original_batch_id: string | null
          period_end: string
          period_start: string
          re_export_count: number | null
          status: Database["public"]["Enums"]["export_batch_status"]
          target_system: string | null
          total_amount: number | null
          total_records: number | null
          updated_at: string | null
          valid_records: number | null
          validation_errors: Json | null
        }
        Insert: {
          batch_number: string
          config_id?: string | null
          cost_centre_filter?: string[] | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deferred_records?: number | null
          entity_filter?: string[] | null
          error_records?: number | null
          export_file_name?: string | null
          export_file_path?: string | null
          export_type: Database["public"]["Enums"]["export_type"]
          exported_at?: string | null
          exported_by?: string | null
          external_batch_id?: string | null
          id?: string
          original_batch_id?: string | null
          period_end: string
          period_start: string
          re_export_count?: number | null
          status?: Database["public"]["Enums"]["export_batch_status"]
          target_system?: string | null
          total_amount?: number | null
          total_records?: number | null
          updated_at?: string | null
          valid_records?: number | null
          validation_errors?: Json | null
        }
        Update: {
          batch_number?: string
          config_id?: string | null
          cost_centre_filter?: string[] | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deferred_records?: number | null
          entity_filter?: string[] | null
          error_records?: number | null
          export_file_name?: string | null
          export_file_path?: string | null
          export_type?: Database["public"]["Enums"]["export_type"]
          exported_at?: string | null
          exported_by?: string | null
          external_batch_id?: string | null
          id?: string
          original_batch_id?: string | null
          period_end?: string
          period_start?: string
          re_export_count?: number | null
          status?: Database["public"]["Enums"]["export_batch_status"]
          target_system?: string | null
          total_amount?: number | null
          total_records?: number | null
          updated_at?: string | null
          valid_records?: number | null
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_export_batches_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "expense_export_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_export_batches_original_batch_id_fkey"
            columns: ["original_batch_id"]
            isOneToOne: false
            referencedRelation: "expense_export_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_export_config: {
        Row: {
          api_auth_type: string | null
          api_endpoint: string | null
          config_name: string
          created_at: string | null
          created_by: string | null
          date_basis: string | null
          default_cost_centre_filter: string[] | null
          default_cost_element: string | null
          default_entity_filter: string[] | null
          default_gl_account: string | null
          delivery_method: Database["public"]["Enums"]["delivery_method"]
          export_format: Database["public"]["Enums"]["export_format"]
          export_type: Database["public"]["Enums"]["export_type"]
          field_mappings: Json | null
          id: string
          is_active: boolean | null
          sftp_host: string | null
          sftp_path: string | null
          sftp_port: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          api_auth_type?: string | null
          api_endpoint?: string | null
          config_name: string
          created_at?: string | null
          created_by?: string | null
          date_basis?: string | null
          default_cost_centre_filter?: string[] | null
          default_cost_element?: string | null
          default_entity_filter?: string[] | null
          default_gl_account?: string | null
          delivery_method?: Database["public"]["Enums"]["delivery_method"]
          export_format?: Database["public"]["Enums"]["export_format"]
          export_type: Database["public"]["Enums"]["export_type"]
          field_mappings?: Json | null
          id?: string
          is_active?: boolean | null
          sftp_host?: string | null
          sftp_path?: string | null
          sftp_port?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          api_auth_type?: string | null
          api_endpoint?: string | null
          config_name?: string
          created_at?: string | null
          created_by?: string | null
          date_basis?: string | null
          default_cost_centre_filter?: string[] | null
          default_cost_element?: string | null
          default_entity_filter?: string[] | null
          default_gl_account?: string | null
          delivery_method?: Database["public"]["Enums"]["delivery_method"]
          export_format?: Database["public"]["Enums"]["export_format"]
          export_type?: Database["public"]["Enums"]["export_type"]
          field_mappings?: Json | null
          id?: string
          is_active?: boolean | null
          sftp_host?: string | null
          sftp_path?: string | null
          sftp_port?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      expense_export_records: {
        Row: {
          amount: number
          batch_id: string
          cost_centre: string | null
          course_name: string | null
          created_at: string | null
          currency: string | null
          destination_city: string | null
          destination_country: string | null
          employee_id: string
          employee_name: string | null
          employee_payroll_id: string | null
          expense_date: string | null
          expense_type: string
          export_key: string
          external_reference: string | null
          external_status: string | null
          first_exported_at: string | null
          gl_account: string | null
          has_incident_adjustment: boolean | null
          id: string
          incident_ids: string[] | null
          last_exported_at: string | null
          posting_period: string | null
          session_id: string | null
          source_id: string
          source_type: string
          status: Database["public"]["Enums"]["export_record_status"]
          training_request_id: string | null
          trip_id: string | null
          updated_at: string | null
          validation_errors: Json | null
        }
        Insert: {
          amount: number
          batch_id: string
          cost_centre?: string | null
          course_name?: string | null
          created_at?: string | null
          currency?: string | null
          destination_city?: string | null
          destination_country?: string | null
          employee_id: string
          employee_name?: string | null
          employee_payroll_id?: string | null
          expense_date?: string | null
          expense_type: string
          export_key: string
          external_reference?: string | null
          external_status?: string | null
          first_exported_at?: string | null
          gl_account?: string | null
          has_incident_adjustment?: boolean | null
          id?: string
          incident_ids?: string[] | null
          last_exported_at?: string | null
          posting_period?: string | null
          session_id?: string | null
          source_id: string
          source_type: string
          status?: Database["public"]["Enums"]["export_record_status"]
          training_request_id?: string | null
          trip_id?: string | null
          updated_at?: string | null
          validation_errors?: Json | null
        }
        Update: {
          amount?: number
          batch_id?: string
          cost_centre?: string | null
          course_name?: string | null
          created_at?: string | null
          currency?: string | null
          destination_city?: string | null
          destination_country?: string | null
          employee_id?: string
          employee_name?: string | null
          employee_payroll_id?: string | null
          expense_date?: string | null
          expense_type?: string
          export_key?: string
          external_reference?: string | null
          external_status?: string | null
          first_exported_at?: string | null
          gl_account?: string | null
          has_incident_adjustment?: boolean | null
          id?: string
          incident_ids?: string[] | null
          last_exported_at?: string | null
          posting_period?: string | null
          session_id?: string | null
          source_id?: string
          source_type?: string
          status?: Database["public"]["Enums"]["export_record_status"]
          training_request_id?: string | null
          trip_id?: string | null
          updated_at?: string | null
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_export_records_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "expense_export_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_attachments: {
        Row: {
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          incident_id: string
          mime_type: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          incident_id: string
          mime_type?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          incident_id?: string
          mime_type?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_attachments_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "travel_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          field_changed: string | null
          id: string
          incident_id: string
          new_value: string | null
          old_value: string | null
          reason: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          field_changed?: string | null
          id?: string
          incident_id: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          field_changed?: string | null
          id?: string
          incident_id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_audit_log_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "travel_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_accommodations: {
        Row: {
          booking_reference: string | null
          check_in_date: string | null
          check_in_time: string | null
          check_out_date: string | null
          check_out_time: string | null
          confirmation_number: string | null
          created_at: string | null
          data_source: string | null
          edit_reason: string | null
          hotel_address: string | null
          hotel_city: string | null
          hotel_country: string | null
          hotel_email: string | null
          hotel_name: string
          hotel_phone: string | null
          hotel_website: string | null
          id: string
          itinerary_id: string
          manually_edited: boolean | null
          room_type: string | null
          special_requests: string | null
          updated_at: string | null
        }
        Insert: {
          booking_reference?: string | null
          check_in_date?: string | null
          check_in_time?: string | null
          check_out_date?: string | null
          check_out_time?: string | null
          confirmation_number?: string | null
          created_at?: string | null
          data_source?: string | null
          edit_reason?: string | null
          hotel_address?: string | null
          hotel_city?: string | null
          hotel_country?: string | null
          hotel_email?: string | null
          hotel_name: string
          hotel_phone?: string | null
          hotel_website?: string | null
          id?: string
          itinerary_id: string
          manually_edited?: boolean | null
          room_type?: string | null
          special_requests?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_reference?: string | null
          check_in_date?: string | null
          check_in_time?: string | null
          check_out_date?: string | null
          check_out_time?: string | null
          confirmation_number?: string | null
          created_at?: string | null
          data_source?: string | null
          edit_reason?: string | null
          hotel_address?: string | null
          hotel_city?: string | null
          hotel_country?: string | null
          hotel_email?: string | null
          hotel_name?: string
          hotel_phone?: string | null
          hotel_website?: string | null
          id?: string
          itinerary_id?: string
          manually_edited?: boolean | null
          room_type?: string | null
          special_requests?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_accommodations_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "travel_itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_audit_log: {
        Row: {
          access_reason: string | null
          action: string
          action_details: string | null
          actor_id: string | null
          actor_role: string | null
          created_at: string | null
          employee_id: string | null
          export_row_count: number | null
          fields_accessed: string[] | null
          filters_used: Json | null
          id: string
          ip_address: unknown
          itinerary_id: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          access_reason?: string | null
          action: string
          action_details?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string | null
          employee_id?: string | null
          export_row_count?: number | null
          fields_accessed?: string[] | null
          filters_used?: Json | null
          id?: string
          ip_address?: unknown
          itinerary_id?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          access_reason?: string | null
          action?: string
          action_details?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string | null
          employee_id?: string | null
          export_row_count?: number | null
          fields_accessed?: string[] | null
          filters_used?: Json | null
          id?: string
          ip_address?: unknown
          itinerary_id?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_audit_log_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "travel_itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_flight_segments: {
        Row: {
          airline_code: string | null
          airline_name: string | null
          arrival_datetime: string | null
          booking_reference: string | null
          cabin_class: string | null
          created_at: string | null
          data_source: string | null
          departure_datetime: string | null
          edit_reason: string | null
          flight_number: string | null
          from_airport_code: string | null
          from_airport_name: string | null
          from_city: string | null
          id: string
          itinerary_id: string
          manually_edited: boolean | null
          pnr_number: string | null
          seat_number: string | null
          segment_order: number
          segment_type: string
          ticket_number: string | null
          to_airport_code: string | null
          to_airport_name: string | null
          to_city: string | null
          updated_at: string | null
        }
        Insert: {
          airline_code?: string | null
          airline_name?: string | null
          arrival_datetime?: string | null
          booking_reference?: string | null
          cabin_class?: string | null
          created_at?: string | null
          data_source?: string | null
          departure_datetime?: string | null
          edit_reason?: string | null
          flight_number?: string | null
          from_airport_code?: string | null
          from_airport_name?: string | null
          from_city?: string | null
          id?: string
          itinerary_id: string
          manually_edited?: boolean | null
          pnr_number?: string | null
          seat_number?: string | null
          segment_order?: number
          segment_type?: string
          ticket_number?: string | null
          to_airport_code?: string | null
          to_airport_name?: string | null
          to_city?: string | null
          updated_at?: string | null
        }
        Update: {
          airline_code?: string | null
          airline_name?: string | null
          arrival_datetime?: string | null
          booking_reference?: string | null
          cabin_class?: string | null
          created_at?: string | null
          data_source?: string | null
          departure_datetime?: string | null
          edit_reason?: string | null
          flight_number?: string | null
          from_airport_code?: string | null
          from_airport_name?: string | null
          from_city?: string | null
          id?: string
          itinerary_id?: string
          manually_edited?: boolean | null
          pnr_number?: string | null
          seat_number?: string | null
          segment_order?: number
          segment_type?: string
          ticket_number?: string | null
          to_airport_code?: string | null
          to_airport_name?: string | null
          to_city?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_flight_segments_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "travel_itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_ground_transport: {
        Row: {
          company_name: string | null
          company_phone: string | null
          created_at: string | null
          data_source: string | null
          driver_name: string | null
          driver_phone: string | null
          dropoff_location: string | null
          id: string
          itinerary_id: string
          manually_edited: boolean | null
          meeting_point_description: string | null
          notes: string | null
          pickup_datetime: string | null
          pickup_location: string | null
          shuttle_id: string | null
          shuttle_route: string | null
          transport_type: string
          updated_at: string | null
          vehicle_description: string | null
        }
        Insert: {
          company_name?: string | null
          company_phone?: string | null
          created_at?: string | null
          data_source?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          dropoff_location?: string | null
          id?: string
          itinerary_id: string
          manually_edited?: boolean | null
          meeting_point_description?: string | null
          notes?: string | null
          pickup_datetime?: string | null
          pickup_location?: string | null
          shuttle_id?: string | null
          shuttle_route?: string | null
          transport_type?: string
          updated_at?: string | null
          vehicle_description?: string | null
        }
        Update: {
          company_name?: string | null
          company_phone?: string | null
          created_at?: string | null
          data_source?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          dropoff_location?: string | null
          id?: string
          itinerary_id?: string
          manually_edited?: boolean | null
          meeting_point_description?: string | null
          notes?: string | null
          pickup_datetime?: string | null
          pickup_location?: string | null
          shuttle_id?: string | null
          shuttle_route?: string | null
          transport_type?: string
          updated_at?: string | null
          vehicle_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_ground_transport_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "travel_itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      job_roles: {
        Row: {
          code: string
          created_at: string | null
          description_en: string | null
          id: string
          is_active: boolean | null
          job_family: string | null
          name_ar: string | null
          name_en: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean | null
          job_family?: string | null
          name_ar?: string | null
          name_en: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean | null
          job_family?: string | null
          name_ar?: string | null
          name_en?: string
          updated_at?: string | null
        }
        Relationships: []
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
      per_diem_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          field_changed: string | null
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: []
      }
      per_diem_calculations: {
        Row: {
          accommodation_covered: boolean | null
          actual_end_date: string | null
          actual_start_date: string | null
          calculated_at: string | null
          calculation_type: string
          config_missing: boolean | null
          config_missing_reason: string | null
          created_at: string | null
          created_by: string | null
          currency: string
          daily_rate: number
          destination_band: string | null
          destination_band_id: string | null
          destination_city: string | null
          destination_country: string
          employee_grade: number | null
          employee_id: string
          estimated_amount: number | null
          excluded_days: number | null
          final_amount: number | null
          full_days: number | null
          grade_band_id: string | null
          has_override: boolean | null
          id: string
          is_domestic: boolean | null
          notes: string | null
          payment_period: string | null
          payment_reference: string | null
          payment_status: string | null
          planned_end_date: string | null
          planned_start_date: string | null
          policy_snapshot: Json | null
          session_id: string | null
          status: string | null
          total_eligible_days: number | null
          training_request_id: string | null
          travel_days: number | null
          travel_visa_request_id: string | null
          updated_at: string | null
          weekend_days: number | null
        }
        Insert: {
          accommodation_covered?: boolean | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          calculated_at?: string | null
          calculation_type?: string
          config_missing?: boolean | null
          config_missing_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          daily_rate: number
          destination_band?: string | null
          destination_band_id?: string | null
          destination_city?: string | null
          destination_country: string
          employee_grade?: number | null
          employee_id: string
          estimated_amount?: number | null
          excluded_days?: number | null
          final_amount?: number | null
          full_days?: number | null
          grade_band_id?: string | null
          has_override?: boolean | null
          id?: string
          is_domestic?: boolean | null
          notes?: string | null
          payment_period?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          policy_snapshot?: Json | null
          session_id?: string | null
          status?: string | null
          total_eligible_days?: number | null
          training_request_id?: string | null
          travel_days?: number | null
          travel_visa_request_id?: string | null
          updated_at?: string | null
          weekend_days?: number | null
        }
        Update: {
          accommodation_covered?: boolean | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          calculated_at?: string | null
          calculation_type?: string
          config_missing?: boolean | null
          config_missing_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          daily_rate?: number
          destination_band?: string | null
          destination_band_id?: string | null
          destination_city?: string | null
          destination_country?: string
          employee_grade?: number | null
          employee_id?: string
          estimated_amount?: number | null
          excluded_days?: number | null
          final_amount?: number | null
          full_days?: number | null
          grade_band_id?: string | null
          has_override?: boolean | null
          id?: string
          is_domestic?: boolean | null
          notes?: string | null
          payment_period?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          policy_snapshot?: Json | null
          session_id?: string | null
          status?: string | null
          total_eligible_days?: number | null
          training_request_id?: string | null
          travel_days?: number | null
          travel_visa_request_id?: string | null
          updated_at?: string | null
          weekend_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_per_diem_calc_dest_band"
            columns: ["destination_band_id"]
            isOneToOne: false
            referencedRelation: "per_diem_destination_bands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_per_diem_calc_grade_band"
            columns: ["grade_band_id"]
            isOneToOne: false
            referencedRelation: "per_diem_grade_bands"
            referencedColumns: ["id"]
          },
        ]
      }
      per_diem_destination_bands: {
        Row: {
          band: string
          business_daily_rate: number | null
          city: string | null
          country: string
          created_at: string | null
          created_by: string | null
          currency: string
          id: string
          is_active: boolean | null
          is_domestic: boolean | null
          training_daily_rate: number
          updated_at: string | null
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          band?: string
          business_daily_rate?: number | null
          city?: string | null
          country: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean | null
          is_domestic?: boolean | null
          training_daily_rate: number
          updated_at?: string | null
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          band?: string
          business_daily_rate?: number | null
          city?: string | null
          country?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean | null
          is_domestic?: boolean | null
          training_daily_rate?: number
          updated_at?: string | null
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: []
      }
      per_diem_grade_bands: {
        Row: {
          band_name: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          fixed_rate_override: number | null
          grade_from: number
          grade_to: number
          id: string
          is_active: boolean | null
          multiplier: number | null
          updated_at: string | null
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          band_name: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          fixed_rate_override?: number | null
          grade_from: number
          grade_to: number
          id?: string
          is_active?: boolean | null
          multiplier?: number | null
          updated_at?: string | null
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          band_name?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          fixed_rate_override?: number | null
          grade_from?: number
          grade_to?: number
          id?: string
          is_active?: boolean | null
          multiplier?: number | null
          updated_at?: string | null
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: []
      }
      per_diem_overrides: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string
          id: string
          original_amount: number
          original_daily_rate: number
          original_eligible_days: number
          override_amount: number | null
          override_daily_rate: number | null
          override_eligible_days: number | null
          per_diem_calculation_id: string
          reason: string
          rejection_reason: string | null
          requires_approval: boolean | null
          supporting_document_url: string | null
          updated_at: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          original_amount: number
          original_daily_rate: number
          original_eligible_days: number
          override_amount?: number | null
          override_daily_rate?: number | null
          override_eligible_days?: number | null
          per_diem_calculation_id: string
          reason: string
          rejection_reason?: string | null
          requires_approval?: boolean | null
          supporting_document_url?: string | null
          updated_at?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          original_amount?: number
          original_daily_rate?: number
          original_eligible_days?: number
          override_amount?: number | null
          override_daily_rate?: number | null
          override_eligible_days?: number | null
          per_diem_calculation_id?: string
          reason?: string
          rejection_reason?: string | null
          requires_approval?: boolean | null
          supporting_document_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_per_diem_override_calc"
            columns: ["per_diem_calculation_id"]
            isOneToOne: false
            referencedRelation: "per_diem_calculations"
            referencedColumns: ["id"]
          },
        ]
      }
      per_diem_policy_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      plan_scenarios: {
        Row: {
          baseline_total_cost: number | null
          baseline_total_participants: number | null
          basis_plan_id: string
          basis_plan_version: number
          created_at: string
          creation_job_id: string | null
          creation_progress: number | null
          cut_abroad_first: boolean | null
          cut_order: string[] | null
          description: string | null
          entity_caps: Json | null
          global_budget_type: string | null
          global_budget_value: number | null
          id: string
          include_priority_bands: string[] | null
          last_recalculation_at: string | null
          name: string
          owner_id: string
          promoted_at: string | null
          promoted_by: string | null
          promoted_to_plan_id: string | null
          protected_categories: string[] | null
          scenario_total_cost: number | null
          scenario_total_participants: number | null
          status: string
          updated_at: string
          visibility_entities: string[] | null
          visibility_scope: string
          visibility_users: string[] | null
        }
        Insert: {
          baseline_total_cost?: number | null
          baseline_total_participants?: number | null
          basis_plan_id: string
          basis_plan_version?: number
          created_at?: string
          creation_job_id?: string | null
          creation_progress?: number | null
          cut_abroad_first?: boolean | null
          cut_order?: string[] | null
          description?: string | null
          entity_caps?: Json | null
          global_budget_type?: string | null
          global_budget_value?: number | null
          id?: string
          include_priority_bands?: string[] | null
          last_recalculation_at?: string | null
          name: string
          owner_id: string
          promoted_at?: string | null
          promoted_by?: string | null
          promoted_to_plan_id?: string | null
          protected_categories?: string[] | null
          scenario_total_cost?: number | null
          scenario_total_participants?: number | null
          status?: string
          updated_at?: string
          visibility_entities?: string[] | null
          visibility_scope?: string
          visibility_users?: string[] | null
        }
        Update: {
          baseline_total_cost?: number | null
          baseline_total_participants?: number | null
          basis_plan_id?: string
          basis_plan_version?: number
          created_at?: string
          creation_job_id?: string | null
          creation_progress?: number | null
          cut_abroad_first?: boolean | null
          cut_order?: string[] | null
          description?: string | null
          entity_caps?: Json | null
          global_budget_type?: string | null
          global_budget_value?: number | null
          id?: string
          include_priority_bands?: string[] | null
          last_recalculation_at?: string | null
          name?: string
          owner_id?: string
          promoted_at?: string | null
          promoted_by?: string | null
          promoted_to_plan_id?: string | null
          protected_categories?: string[] | null
          scenario_total_cost?: number | null
          scenario_total_participants?: number | null
          status?: string
          updated_at?: string
          visibility_entities?: string[] | null
          visibility_scope?: string
          visibility_users?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_scenarios_basis_plan_id_fkey"
            columns: ["basis_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_scenarios_promoted_to_plan_id_fkey"
            columns: ["promoted_to_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
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
      provider_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          comment: string | null
          created_at: string | null
          field_changed: string | null
          id: string
          new_status: Database["public"]["Enums"]["provider_status"] | null
          new_value: string | null
          old_status: Database["public"]["Enums"]["provider_status"] | null
          old_value: string | null
          provider_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          comment?: string | null
          created_at?: string | null
          field_changed?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["provider_status"] | null
          new_value?: string | null
          old_status?: Database["public"]["Enums"]["provider_status"] | null
          old_value?: string | null
          provider_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          comment?: string | null
          created_at?: string | null
          field_changed?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["provider_status"] | null
          new_value?: string | null
          old_status?: Database["public"]["Enums"]["provider_status"] | null
          old_value?: string | null
          provider_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_audit_log_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "training_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_banking: {
        Row: {
          account_number: string | null
          bank_branch: string | null
          bank_country: string | null
          bank_name: string | null
          created_at: string | null
          created_by: string | null
          iban: string | null
          id: string
          provider_id: string
          swift_bic: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          account_number?: string | null
          bank_branch?: string | null
          bank_country?: string | null
          bank_name?: string | null
          created_at?: string | null
          created_by?: string | null
          iban?: string | null
          id?: string
          provider_id: string
          swift_bic?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          account_number?: string | null
          bank_branch?: string | null
          bank_country?: string | null
          bank_name?: string | null
          created_at?: string | null
          created_by?: string | null
          iban?: string | null
          id?: string
          provider_id?: string
          swift_bic?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_banking_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "training_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_comments: {
        Row: {
          comment: string
          comment_type: string | null
          created_at: string | null
          created_by: string | null
          id: string
          provider_id: string
          updated_at: string | null
        }
        Insert: {
          comment: string
          comment_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          provider_id: string
          updated_at?: string | null
        }
        Update: {
          comment?: string
          comment_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_comments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "training_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_contacts: {
        Row: {
          contact_name: string
          contact_role: string | null
          created_at: string | null
          email: string
          id: string
          is_primary: boolean | null
          notes: string | null
          phone: string | null
          provider_id: string
          updated_at: string | null
        }
        Insert: {
          contact_name: string
          contact_role?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          phone?: string | null
          provider_id: string
          updated_at?: string | null
        }
        Update: {
          contact_name?: string
          contact_role?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          phone?: string | null
          provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_contacts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "training_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_contracts: {
        Row: {
          billing_currency: string | null
          contract_end_date: string | null
          contract_reference: string
          contract_start_date: string | null
          contract_value: number | null
          created_at: string | null
          created_by: string | null
          document_url: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          payment_terms: string | null
          provider_id: string
          updated_at: string | null
        }
        Insert: {
          billing_currency?: string | null
          contract_end_date?: string | null
          contract_reference: string
          contract_start_date?: string | null
          contract_value?: number | null
          created_at?: string | null
          created_by?: string | null
          document_url?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          payment_terms?: string | null
          provider_id: string
          updated_at?: string | null
        }
        Update: {
          billing_currency?: string | null
          contract_end_date?: string | null
          contract_reference?: string
          contract_start_date?: string | null
          contract_value?: number | null
          created_at?: string | null
          created_by?: string | null
          document_url?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          payment_terms?: string | null
          provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_contracts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "training_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_flags: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          expires_at: string | null
          flag_type: string
          id: string
          is_active: boolean | null
          provider_id: string
          reason: string | null
          set_at: string | null
          set_by: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          expires_at?: string | null
          flag_type: string
          id?: string
          is_active?: boolean | null
          provider_id: string
          reason?: string | null
          set_at?: string | null
          set_by?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          expires_at?: string | null
          flag_type?: string
          id?: string
          is_active?: boolean | null
          provider_id?: string
          reason?: string | null
          set_at?: string | null
          set_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_flags_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "training_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_kpi_thresholds: {
        Row: {
          comparison_operator: string | null
          created_at: string | null
          description: string | null
          display_name: string
          good_threshold: number | null
          id: string
          is_active: boolean | null
          kpi_name: string
          updated_at: string | null
          updated_by: string | null
          warning_threshold: number | null
        }
        Insert: {
          comparison_operator?: string | null
          created_at?: string | null
          description?: string | null
          display_name: string
          good_threshold?: number | null
          id?: string
          is_active?: boolean | null
          kpi_name: string
          updated_at?: string | null
          updated_by?: string | null
          warning_threshold?: number | null
        }
        Update: {
          comparison_operator?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          good_threshold?: number | null
          id?: string
          is_active?: boolean | null
          kpi_name?: string
          updated_at?: string | null
          updated_by?: string | null
          warning_threshold?: number | null
        }
        Relationships: []
      }
      provider_performance_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          filter_context: Json | null
          id: string
          new_value: Json | null
          old_value: Json | null
          provider_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          filter_context?: Json | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          provider_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          filter_context?: Json | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          provider_id?: string | null
        }
        Relationships: []
      }
      provider_performance_snapshots: {
        Row: {
          avg_nps: number | null
          avg_rating: number | null
          cancellation_rate: number | null
          cancelled_sessions: number | null
          completed_sessions: number | null
          completion_rate: number | null
          cost_per_participant: number | null
          created_at: string | null
          hse_avg_rating: number | null
          hse_completion_rate: number | null
          hse_sessions: number | null
          id: string
          import_source: string | null
          is_historical_import: boolean | null
          on_time_rate: number | null
          period_end: string
          period_start: string
          period_type: string
          provider_id: string
          total_cost: number | null
          total_participants: number | null
          total_sessions: number | null
        }
        Insert: {
          avg_nps?: number | null
          avg_rating?: number | null
          cancellation_rate?: number | null
          cancelled_sessions?: number | null
          completed_sessions?: number | null
          completion_rate?: number | null
          cost_per_participant?: number | null
          created_at?: string | null
          hse_avg_rating?: number | null
          hse_completion_rate?: number | null
          hse_sessions?: number | null
          id?: string
          import_source?: string | null
          is_historical_import?: boolean | null
          on_time_rate?: number | null
          period_end: string
          period_start: string
          period_type: string
          provider_id: string
          total_cost?: number | null
          total_participants?: number | null
          total_sessions?: number | null
        }
        Update: {
          avg_nps?: number | null
          avg_rating?: number | null
          cancellation_rate?: number | null
          cancelled_sessions?: number | null
          completed_sessions?: number | null
          completion_rate?: number | null
          cost_per_participant?: number | null
          created_at?: string | null
          hse_avg_rating?: number | null
          hse_completion_rate?: number | null
          hse_sessions?: number | null
          id?: string
          import_source?: string | null
          is_historical_import?: boolean | null
          on_time_rate?: number | null
          period_end?: string
          period_start?: string
          period_type?: string
          provider_id?: string
          total_cost?: number | null
          total_participants?: number | null
          total_sessions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_performance_snapshots_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "training_providers"
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
      scenario_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          id: string
          new_value: Json | null
          old_value: Json | null
          scenario_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          scenario_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          scenario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scenario_audit_log_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "plan_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_items: {
        Row: {
          baseline_cost: number
          baseline_cost_per_participant: number | null
          baseline_sessions: number
          baseline_volume: number
          category_id: string | null
          category_name: string | null
          cost_delta: number | null
          course_id: string | null
          course_name: string | null
          created_at: string
          cut_reason: string | null
          department_id: string | null
          department_name: string | null
          entity_id: string | null
          entity_name: string | null
          id: string
          is_abroad: boolean | null
          is_cut: boolean | null
          is_hse_mandatory: boolean | null
          is_locally_adjusted: boolean | null
          is_protected: boolean | null
          local_adjustment_at: string | null
          local_adjustment_by: string | null
          local_adjustment_reason: string | null
          priority_band: string | null
          priority_score: number | null
          provider_id: string | null
          provider_name: string | null
          scenario_cost: number
          scenario_id: string
          scenario_sessions: number
          scenario_volume: number
          source_plan_item_id: string | null
          updated_at: string
          volume_delta: number | null
        }
        Insert: {
          baseline_cost?: number
          baseline_cost_per_participant?: number | null
          baseline_sessions?: number
          baseline_volume?: number
          category_id?: string | null
          category_name?: string | null
          cost_delta?: number | null
          course_id?: string | null
          course_name?: string | null
          created_at?: string
          cut_reason?: string | null
          department_id?: string | null
          department_name?: string | null
          entity_id?: string | null
          entity_name?: string | null
          id?: string
          is_abroad?: boolean | null
          is_cut?: boolean | null
          is_hse_mandatory?: boolean | null
          is_locally_adjusted?: boolean | null
          is_protected?: boolean | null
          local_adjustment_at?: string | null
          local_adjustment_by?: string | null
          local_adjustment_reason?: string | null
          priority_band?: string | null
          priority_score?: number | null
          provider_id?: string | null
          provider_name?: string | null
          scenario_cost?: number
          scenario_id: string
          scenario_sessions?: number
          scenario_volume?: number
          source_plan_item_id?: string | null
          updated_at?: string
          volume_delta?: number | null
        }
        Update: {
          baseline_cost?: number
          baseline_cost_per_participant?: number | null
          baseline_sessions?: number
          baseline_volume?: number
          category_id?: string | null
          category_name?: string | null
          cost_delta?: number | null
          course_id?: string | null
          course_name?: string | null
          created_at?: string
          cut_reason?: string | null
          department_id?: string | null
          department_name?: string | null
          entity_id?: string | null
          entity_name?: string | null
          id?: string
          is_abroad?: boolean | null
          is_cut?: boolean | null
          is_hse_mandatory?: boolean | null
          is_locally_adjusted?: boolean | null
          is_protected?: boolean | null
          local_adjustment_at?: string | null
          local_adjustment_by?: string | null
          local_adjustment_reason?: string | null
          priority_band?: string | null
          priority_score?: number | null
          provider_id?: string | null
          provider_name?: string | null
          scenario_cost?: number
          scenario_id?: string
          scenario_sessions?: number
          scenario_volume?: number
          source_plan_item_id?: string | null
          updated_at?: string
          volume_delta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scenario_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_items_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "plan_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_items_source_plan_item_id_fkey"
            columns: ["source_plan_item_id"]
            isOneToOne: false
            referencedRelation: "training_plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      scholar_records: {
        Row: {
          actual_end_date: string | null
          actual_start_date: string | null
          application_id: string
          country: string
          created_at: string | null
          credits_completed: number | null
          cumulative_gpa: number | null
          current_term_number: number | null
          degree_level: string
          employee_id: string
          expected_end_date: string | null
          gpa_scale: number | null
          id: string
          institution: string
          notes_internal: string | null
          program_name: string
          risk_level: string | null
          risk_override: boolean | null
          risk_override_at: string | null
          risk_override_by: string | null
          risk_override_reason: string | null
          status: string | null
          term_structure: string | null
          total_credits_required: number | null
          total_terms: number | null
          updated_at: string | null
        }
        Insert: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          application_id: string
          country: string
          created_at?: string | null
          credits_completed?: number | null
          cumulative_gpa?: number | null
          current_term_number?: number | null
          degree_level: string
          employee_id: string
          expected_end_date?: string | null
          gpa_scale?: number | null
          id?: string
          institution: string
          notes_internal?: string | null
          program_name: string
          risk_level?: string | null
          risk_override?: boolean | null
          risk_override_at?: string | null
          risk_override_by?: string | null
          risk_override_reason?: string | null
          status?: string | null
          term_structure?: string | null
          total_credits_required?: number | null
          total_terms?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          application_id?: string
          country?: string
          created_at?: string | null
          credits_completed?: number | null
          cumulative_gpa?: number | null
          current_term_number?: number | null
          degree_level?: string
          employee_id?: string
          expected_end_date?: string | null
          gpa_scale?: number | null
          id?: string
          institution?: string
          notes_internal?: string | null
          program_name?: string
          risk_level?: string | null
          risk_override?: boolean | null
          risk_override_at?: string | null
          risk_override_by?: string | null
          risk_override_reason?: string | null
          status?: string | null
          term_structure?: string | null
          total_credits_required?: number | null
          total_terms?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scholar_records_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "scholarship_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      scholar_risk_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          id: string
          new_band: string
          notified_roles: Json | null
          previous_band: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_score_id: string | null
          scholar_record_id: string
          status: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          id?: string
          new_band: string
          notified_roles?: Json | null
          previous_band?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_score_id?: string | null
          scholar_record_id: string
          status?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          id?: string
          new_band?: string
          notified_roles?: Json | null
          previous_band?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_score_id?: string | null
          scholar_record_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scholar_risk_alerts_risk_score_id_fkey"
            columns: ["risk_score_id"]
            isOneToOne: false
            referencedRelation: "scholar_risk_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scholar_risk_alerts_scholar_record_id_fkey"
            columns: ["scholar_record_id"]
            isOneToOne: false
            referencedRelation: "scholar_records"
            referencedColumns: ["id"]
          },
        ]
      }
      scholar_risk_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string | null
          description: string | null
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      scholar_risk_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_count: number | null
          errors: Json | null
          id: string
          job_type: string
          model_version: string | null
          processed_count: number | null
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
          model_version?: string | null
          processed_count?: number | null
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
          model_version?: string | null
          processed_count?: number | null
          started_at?: string | null
          status?: string | null
          success_count?: number | null
          total_count?: number | null
        }
        Relationships: []
      }
      scholar_risk_scores: {
        Row: {
          contributing_factors: Json | null
          created_at: string | null
          feature_snapshot: Json | null
          id: string
          is_override: boolean | null
          model_version: string | null
          override_at: string | null
          override_by: string | null
          override_reason: string | null
          previous_band: string | null
          risk_band: string
          risk_score: number
          scholar_record_id: string
          scored_at: string | null
        }
        Insert: {
          contributing_factors?: Json | null
          created_at?: string | null
          feature_snapshot?: Json | null
          id?: string
          is_override?: boolean | null
          model_version?: string | null
          override_at?: string | null
          override_by?: string | null
          override_reason?: string | null
          previous_band?: string | null
          risk_band: string
          risk_score: number
          scholar_record_id: string
          scored_at?: string | null
        }
        Update: {
          contributing_factors?: Json | null
          created_at?: string | null
          feature_snapshot?: Json | null
          id?: string
          is_override?: boolean | null
          model_version?: string | null
          override_at?: string | null
          override_by?: string | null
          override_reason?: string | null
          previous_band?: string | null
          risk_band?: string
          risk_score?: number
          scholar_record_id?: string
          scored_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scholar_risk_scores_scholar_record_id_fkey"
            columns: ["scholar_record_id"]
            isOneToOne: false
            referencedRelation: "scholar_records"
            referencedColumns: ["id"]
          },
        ]
      }
      scholarship_applications: {
        Row: {
          accepted_at: string | null
          alignment_check: boolean | null
          alignment_notes: string | null
          applicant_id: string
          application_number: string | null
          approved_amount: number | null
          bond_amount: number | null
          budget_status: string | null
          career_path_notes: string | null
          city: string | null
          committee_decision: string | null
          committee_remarks: string | null
          committee_score_total: number | null
          company_percentage: number | null
          competency_gaps: string | null
          cost_centre: string | null
          country: string
          created_at: string | null
          currency: string | null
          current_approval_level: number | null
          current_approver_id: string | null
          decline_reason: string | null
          declined_at: string | null
          duration_months: number | null
          eligibility_check: boolean | null
          eligibility_notes: string | null
          end_date: string | null
          final_approved_at: string | null
          final_approved_by: string | null
          final_comments: string | null
          final_decision: string | null
          finance_comments: string | null
          funding_source: string | null
          hrbp_comments: string | null
          hrbp_recommendation: string | null
          id: string
          impact_description: string | null
          institution_custom: string | null
          internal_notes: string | null
          is_historical_import: boolean | null
          justification: string | null
          ld_comments: string | null
          ld_recommendation: string | null
          living_allowance: number | null
          manager_comments: string | null
          operational_impact: string | null
          policy_compliance: boolean | null
          policy_notes: string | null
          program_id: string | null
          program_name_custom: string | null
          program_type: string
          replacement_plan: string | null
          risk_assessment: string | null
          risk_comments: string | null
          service_commitment_months: number | null
          start_date: string | null
          status: string | null
          study_mode: string | null
          submitted_at: string | null
          target_role: string | null
          total_estimated_cost: number | null
          travel_cost: number | null
          tuition_per_year: number | null
          tuition_total: number | null
          updated_at: string | null
          visa_insurance_cost: number | null
        }
        Insert: {
          accepted_at?: string | null
          alignment_check?: boolean | null
          alignment_notes?: string | null
          applicant_id: string
          application_number?: string | null
          approved_amount?: number | null
          bond_amount?: number | null
          budget_status?: string | null
          career_path_notes?: string | null
          city?: string | null
          committee_decision?: string | null
          committee_remarks?: string | null
          committee_score_total?: number | null
          company_percentage?: number | null
          competency_gaps?: string | null
          cost_centre?: string | null
          country: string
          created_at?: string | null
          currency?: string | null
          current_approval_level?: number | null
          current_approver_id?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          duration_months?: number | null
          eligibility_check?: boolean | null
          eligibility_notes?: string | null
          end_date?: string | null
          final_approved_at?: string | null
          final_approved_by?: string | null
          final_comments?: string | null
          final_decision?: string | null
          finance_comments?: string | null
          funding_source?: string | null
          hrbp_comments?: string | null
          hrbp_recommendation?: string | null
          id?: string
          impact_description?: string | null
          institution_custom?: string | null
          internal_notes?: string | null
          is_historical_import?: boolean | null
          justification?: string | null
          ld_comments?: string | null
          ld_recommendation?: string | null
          living_allowance?: number | null
          manager_comments?: string | null
          operational_impact?: string | null
          policy_compliance?: boolean | null
          policy_notes?: string | null
          program_id?: string | null
          program_name_custom?: string | null
          program_type: string
          replacement_plan?: string | null
          risk_assessment?: string | null
          risk_comments?: string | null
          service_commitment_months?: number | null
          start_date?: string | null
          status?: string | null
          study_mode?: string | null
          submitted_at?: string | null
          target_role?: string | null
          total_estimated_cost?: number | null
          travel_cost?: number | null
          tuition_per_year?: number | null
          tuition_total?: number | null
          updated_at?: string | null
          visa_insurance_cost?: number | null
        }
        Update: {
          accepted_at?: string | null
          alignment_check?: boolean | null
          alignment_notes?: string | null
          applicant_id?: string
          application_number?: string | null
          approved_amount?: number | null
          bond_amount?: number | null
          budget_status?: string | null
          career_path_notes?: string | null
          city?: string | null
          committee_decision?: string | null
          committee_remarks?: string | null
          committee_score_total?: number | null
          company_percentage?: number | null
          competency_gaps?: string | null
          cost_centre?: string | null
          country?: string
          created_at?: string | null
          currency?: string | null
          current_approval_level?: number | null
          current_approver_id?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          duration_months?: number | null
          eligibility_check?: boolean | null
          eligibility_notes?: string | null
          end_date?: string | null
          final_approved_at?: string | null
          final_approved_by?: string | null
          final_comments?: string | null
          final_decision?: string | null
          finance_comments?: string | null
          funding_source?: string | null
          hrbp_comments?: string | null
          hrbp_recommendation?: string | null
          id?: string
          impact_description?: string | null
          institution_custom?: string | null
          internal_notes?: string | null
          is_historical_import?: boolean | null
          justification?: string | null
          ld_comments?: string | null
          ld_recommendation?: string | null
          living_allowance?: number | null
          manager_comments?: string | null
          operational_impact?: string | null
          policy_compliance?: boolean | null
          policy_notes?: string | null
          program_id?: string | null
          program_name_custom?: string | null
          program_type?: string
          replacement_plan?: string | null
          risk_assessment?: string | null
          risk_comments?: string | null
          service_commitment_months?: number | null
          start_date?: string | null
          status?: string | null
          study_mode?: string | null
          submitted_at?: string | null
          target_role?: string | null
          total_estimated_cost?: number | null
          travel_cost?: number | null
          tuition_per_year?: number | null
          tuition_total?: number | null
          updated_at?: string | null
          visa_insurance_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scholarship_applications_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "scholarship_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      scholarship_approvals: {
        Row: {
          application_id: string
          approval_level: number
          approver_id: string
          approver_role: Database["public"]["Enums"]["app_role"]
          comments: string | null
          created_at: string | null
          decision: string | null
          decision_date: string | null
          delegated_from: string | null
          id: string
          status: Database["public"]["Enums"]["approval_status"] | null
          updated_at: string | null
        }
        Insert: {
          application_id: string
          approval_level: number
          approver_id: string
          approver_role: Database["public"]["Enums"]["app_role"]
          comments?: string | null
          created_at?: string | null
          decision?: string | null
          decision_date?: string | null
          delegated_from?: string | null
          id?: string
          status?: Database["public"]["Enums"]["approval_status"] | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          approval_level?: number
          approver_id?: string
          approver_role?: Database["public"]["Enums"]["app_role"]
          comments?: string | null
          created_at?: string | null
          decision?: string | null
          decision_date?: string | null
          delegated_from?: string | null
          id?: string
          status?: Database["public"]["Enums"]["approval_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scholarship_approvals_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "scholarship_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      scholarship_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          application_id: string
          comments: string | null
          created_at: string | null
          id: string
          new_status: string | null
          new_values: Json | null
          old_status: string | null
          old_values: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          application_id: string
          comments?: string | null
          created_at?: string | null
          id?: string
          new_status?: string | null
          new_values?: Json | null
          old_status?: string | null
          old_values?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          application_id?: string
          comments?: string | null
          created_at?: string | null
          id?: string
          new_status?: string | null
          new_values?: Json | null
          old_status?: string | null
          old_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "scholarship_audit_log_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "scholarship_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      scholarship_committee_scores: {
        Row: {
          abstained: boolean | null
          application_id: string
          business_relevance_score: number | null
          candidate_quality_score: number | null
          comments: string | null
          committee_member_id: string
          cost_benefit_score: number | null
          has_conflict_of_interest: boolean | null
          id: string
          scored_at: string | null
          total_score: number | null
          urgency_score: number | null
        }
        Insert: {
          abstained?: boolean | null
          application_id: string
          business_relevance_score?: number | null
          candidate_quality_score?: number | null
          comments?: string | null
          committee_member_id: string
          cost_benefit_score?: number | null
          has_conflict_of_interest?: boolean | null
          id?: string
          scored_at?: string | null
          total_score?: number | null
          urgency_score?: number | null
        }
        Update: {
          abstained?: boolean | null
          application_id?: string
          business_relevance_score?: number | null
          candidate_quality_score?: number | null
          comments?: string | null
          committee_member_id?: string
          cost_benefit_score?: number | null
          has_conflict_of_interest?: boolean | null
          id?: string
          scored_at?: string | null
          total_score?: number | null
          urgency_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scholarship_committee_scores_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "scholarship_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      scholarship_documents: {
        Row: {
          application_id: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_required: boolean | null
          mime_type: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          application_id: string
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_required?: boolean | null
          mime_type?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          application_id?: string
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_required?: boolean | null
          mime_type?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scholarship_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "scholarship_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      scholarship_programs: {
        Row: {
          city: string | null
          country: string
          created_at: string | null
          description_ar: string | null
          description_en: string | null
          duration_months: number | null
          id: string
          institution_ar: string | null
          institution_en: string
          is_active: boolean | null
          name_ar: string | null
          name_en: string
          program_type: string
          study_mode: string | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          country: string
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          duration_months?: number | null
          id?: string
          institution_ar?: string | null
          institution_en: string
          is_active?: boolean | null
          name_ar?: string | null
          name_en: string
          program_type: string
          study_mode?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          country?: string
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          duration_months?: number | null
          id?: string
          institution_ar?: string | null
          institution_en?: string
          is_active?: boolean | null
          name_ar?: string | null
          name_en?: string
          program_type?: string
          study_mode?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      service_bonds: {
        Row: {
          actual_return_date: string | null
          application_id: string | null
          bond_duration_months: number
          bond_end_date: string | null
          bond_start_date: string | null
          bond_type: string
          calculated_repayment_amount: number | null
          closed_at: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          expected_return_date: string | null
          final_repayment_amount: number | null
          fulfilled_at: string | null
          funded_amount: number | null
          id: string
          import_source: string | null
          is_historical_import: boolean | null
          legal_agreement_reference: string | null
          legal_agreement_url: string | null
          notes: string | null
          policy_id: string | null
          repayment_required: boolean | null
          repayment_status: string | null
          return_department_id: string | null
          return_entity_id: string | null
          return_manager_id: string | null
          return_position: string | null
          scholar_record_id: string
          status: string
          time_served_months: number | null
          time_suspended_months: number | null
          updated_at: string | null
        }
        Insert: {
          actual_return_date?: string | null
          application_id?: string | null
          bond_duration_months?: number
          bond_end_date?: string | null
          bond_start_date?: string | null
          bond_type?: string
          calculated_repayment_amount?: number | null
          closed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          expected_return_date?: string | null
          final_repayment_amount?: number | null
          fulfilled_at?: string | null
          funded_amount?: number | null
          id?: string
          import_source?: string | null
          is_historical_import?: boolean | null
          legal_agreement_reference?: string | null
          legal_agreement_url?: string | null
          notes?: string | null
          policy_id?: string | null
          repayment_required?: boolean | null
          repayment_status?: string | null
          return_department_id?: string | null
          return_entity_id?: string | null
          return_manager_id?: string | null
          return_position?: string | null
          scholar_record_id: string
          status?: string
          time_served_months?: number | null
          time_suspended_months?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_return_date?: string | null
          application_id?: string | null
          bond_duration_months?: number
          bond_end_date?: string | null
          bond_start_date?: string | null
          bond_type?: string
          calculated_repayment_amount?: number | null
          closed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          expected_return_date?: string | null
          final_repayment_amount?: number | null
          fulfilled_at?: string | null
          funded_amount?: number | null
          id?: string
          import_source?: string | null
          is_historical_import?: boolean | null
          legal_agreement_reference?: string | null
          legal_agreement_url?: string | null
          notes?: string | null
          policy_id?: string | null
          repayment_required?: boolean | null
          repayment_status?: string | null
          return_department_id?: string | null
          return_entity_id?: string | null
          return_manager_id?: string | null
          return_position?: string | null
          scholar_record_id?: string
          status?: string
          time_served_months?: number | null
          time_suspended_months?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_bonds_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "scholarship_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bonds_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "bond_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bonds_return_department_id_fkey"
            columns: ["return_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bonds_return_entity_id_fkey"
            columns: ["return_entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bonds_scholar_record_id_fkey"
            columns: ["scholar_record_id"]
            isOneToOne: false
            referencedRelation: "scholar_records"
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
      tna_approvals: {
        Row: {
          approval_level: number
          approver_id: string
          approver_role: Database["public"]["Enums"]["app_role"]
          comments: string | null
          created_at: string | null
          decision_date: string | null
          id: string
          status: string | null
          submission_id: string
        }
        Insert: {
          approval_level: number
          approver_id: string
          approver_role: Database["public"]["Enums"]["app_role"]
          comments?: string | null
          created_at?: string | null
          decision_date?: string | null
          id?: string
          status?: string | null
          submission_id: string
        }
        Update: {
          approval_level?: number
          approver_id?: string
          approver_role?: Database["public"]["Enums"]["app_role"]
          comments?: string | null
          created_at?: string | null
          decision_date?: string | null
          id?: string
          status?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tna_approvals_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "tna_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      tna_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          details: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          period_id: string | null
          submission_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          period_id?: string | null
          submission_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          period_id?: string | null
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tna_audit_log_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "tna_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tna_audit_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "tna_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      tna_items: {
        Row: {
          competency_id: string | null
          competency_text: string | null
          course_id: string | null
          course_text: string | null
          created_at: string | null
          custom_fields: Json | null
          estimated_cost: number | null
          id: string
          item_order: number | null
          justification: string | null
          location_type: string | null
          priority: string | null
          submission_id: string
          target_date_from: string | null
          target_date_to: string | null
          target_quarter: string | null
          training_type: string | null
          updated_at: string | null
        }
        Insert: {
          competency_id?: string | null
          competency_text?: string | null
          course_id?: string | null
          course_text?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          estimated_cost?: number | null
          id?: string
          item_order?: number | null
          justification?: string | null
          location_type?: string | null
          priority?: string | null
          submission_id: string
          target_date_from?: string | null
          target_date_to?: string | null
          target_quarter?: string | null
          training_type?: string | null
          updated_at?: string | null
        }
        Update: {
          competency_id?: string | null
          competency_text?: string | null
          course_id?: string | null
          course_text?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          estimated_cost?: number | null
          id?: string
          item_order?: number | null
          justification?: string | null
          location_type?: string | null
          priority?: string | null
          submission_id?: string
          target_date_from?: string | null
          target_date_to?: string | null
          target_quarter?: string | null
          training_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tna_items_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tna_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tna_items_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "tna_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      tna_periods: {
        Row: {
          allow_employee_submission: boolean | null
          allow_manager_submission: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          name: string
          start_date: string
          status: string | null
          submission_end_date: string
          submission_start_date: string
          updated_at: string | null
        }
        Insert: {
          allow_employee_submission?: boolean | null
          allow_manager_submission?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          name: string
          start_date: string
          status?: string | null
          submission_end_date: string
          submission_start_date: string
          updated_at?: string | null
        }
        Update: {
          allow_employee_submission?: boolean | null
          allow_manager_submission?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          status?: string | null
          submission_end_date?: string
          submission_start_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tna_submissions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          employee_id: string
          id: string
          period_id: string
          return_comments: string | null
          status: string | null
          submitted_at: string | null
          submitted_by: string | null
          total_estimated_cost: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          period_id: string
          return_comments?: string | null
          status?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          total_estimated_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          period_id?: string
          return_comments?: string | null
          status?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          total_estimated_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tna_submissions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "tna_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      tna_template_fields: {
        Row: {
          applicable_entities: string[] | null
          applicable_job_families: string[] | null
          created_at: string | null
          field_label_ar: string | null
          field_label_en: string
          field_name: string
          field_order: number | null
          field_type: string
          id: string
          is_required: boolean | null
          is_visible: boolean | null
          options: Json | null
          period_id: string
        }
        Insert: {
          applicable_entities?: string[] | null
          applicable_job_families?: string[] | null
          created_at?: string | null
          field_label_ar?: string | null
          field_label_en: string
          field_name: string
          field_order?: number | null
          field_type: string
          id?: string
          is_required?: boolean | null
          is_visible?: boolean | null
          options?: Json | null
          period_id: string
        }
        Update: {
          applicable_entities?: string[] | null
          applicable_job_families?: string[] | null
          created_at?: string | null
          field_label_ar?: string | null
          field_label_en?: string
          field_name?: string
          field_order?: number | null
          field_type?: string
          id?: string
          is_required?: boolean | null
          is_visible?: boolean | null
          options?: Json | null
          period_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tna_template_fields_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "tna_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      training_budgets: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          budget_amount: number
          budget_type: string
          cost_centre: string | null
          created_at: string | null
          created_by: string | null
          currency: string
          entity: string | null
          fiscal_year: number
          id: string
          notes: string | null
          period_number: number | null
          period_type: Database["public"]["Enums"]["budget_period_type"]
          status: Database["public"]["Enums"]["budget_status"]
          training_category: string | null
          updated_at: string | null
          version: number
          version_name: string | null
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          budget_amount: number
          budget_type?: string
          cost_centre?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          entity?: string | null
          fiscal_year: number
          id?: string
          notes?: string | null
          period_number?: number | null
          period_type?: Database["public"]["Enums"]["budget_period_type"]
          status?: Database["public"]["Enums"]["budget_status"]
          training_category?: string | null
          updated_at?: string | null
          version?: number
          version_name?: string | null
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          budget_amount?: number
          budget_type?: string
          cost_centre?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          entity?: string | null
          fiscal_year?: number
          id?: string
          notes?: string | null
          period_number?: number | null
          period_type?: Database["public"]["Enums"]["budget_period_type"]
          status?: Database["public"]["Enums"]["budget_status"]
          training_category?: string | null
          updated_at?: string | null
          version?: number
          version_name?: string | null
        }
        Relationships: []
      }
      training_plan_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          details: Json | null
          field_changed: string | null
          id: string
          item_id: string | null
          new_value: string | null
          old_value: string | null
          plan_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          field_changed?: string | null
          id?: string
          item_id?: string | null
          new_value?: string | null
          old_value?: string | null
          plan_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          field_changed?: string | null
          id?: string
          item_id?: string | null
          new_value?: string | null
          old_value?: string | null
          plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_plan_audit_log_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plan_items: {
        Row: {
          category_id: string | null
          cost_centre: string | null
          cost_currency: string | null
          course_id: string | null
          created_at: string | null
          created_by: string | null
          delivery_mode: string | null
          department_id: string | null
          entity_id: string | null
          excluded_at: string | null
          excluded_by: string | null
          exclusion_reason: string | null
          finance_comments: string | null
          hrbp_comments: string | null
          id: string
          is_catalogue_linked: boolean | null
          is_tna_backed: boolean | null
          item_name: string
          item_name_ar: string | null
          item_status: string | null
          l_and_d_comments: string | null
          max_participants_per_session: number | null
          merged_into_id: string | null
          plan_id: string
          planned_participants: number
          planned_sessions: number
          priority: string | null
          provider_id: string | null
          provider_name: string | null
          site: string | null
          source_tna_ids: string[] | null
          split_from_id: string | null
          target_month: number | null
          target_quarter: string | null
          tna_item_count: number | null
          training_location: string
          training_type: string
          unit_cost: number | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          cost_centre?: string | null
          cost_currency?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_mode?: string | null
          department_id?: string | null
          entity_id?: string | null
          excluded_at?: string | null
          excluded_by?: string | null
          exclusion_reason?: string | null
          finance_comments?: string | null
          hrbp_comments?: string | null
          id?: string
          is_catalogue_linked?: boolean | null
          is_tna_backed?: boolean | null
          item_name: string
          item_name_ar?: string | null
          item_status?: string | null
          l_and_d_comments?: string | null
          max_participants_per_session?: number | null
          merged_into_id?: string | null
          plan_id: string
          planned_participants?: number
          planned_sessions?: number
          priority?: string | null
          provider_id?: string | null
          provider_name?: string | null
          site?: string | null
          source_tna_ids?: string[] | null
          split_from_id?: string | null
          target_month?: number | null
          target_quarter?: string | null
          tna_item_count?: number | null
          training_location?: string
          training_type?: string
          unit_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          cost_centre?: string | null
          cost_currency?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_mode?: string | null
          department_id?: string | null
          entity_id?: string | null
          excluded_at?: string | null
          excluded_by?: string | null
          exclusion_reason?: string | null
          finance_comments?: string | null
          hrbp_comments?: string | null
          id?: string
          is_catalogue_linked?: boolean | null
          is_tna_backed?: boolean | null
          item_name?: string
          item_name_ar?: string | null
          item_status?: string | null
          l_and_d_comments?: string | null
          max_participants_per_session?: number | null
          merged_into_id?: string | null
          plan_id?: string
          planned_participants?: number
          planned_sessions?: number
          priority?: string | null
          provider_id?: string | null
          provider_name?: string | null
          site?: string | null
          source_tna_ids?: string[] | null
          split_from_id?: string | null
          target_month?: number | null
          target_quarter?: string | null
          tna_item_count?: number | null
          training_location?: string
          training_type?: string
          unit_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_plan_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "course_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plan_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plan_items_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plan_items_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "training_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plans: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          area_reviewed_at: string | null
          area_reviewed_by: string | null
          corporate_reviewed_at: string | null
          corporate_reviewed_by: string | null
          cost_currency: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          fiscal_year: string
          id: string
          is_historical_import: boolean | null
          locked_at: string | null
          locked_by: string | null
          name: string
          status: Database["public"]["Enums"]["training_plan_status"]
          tna_period_id: string | null
          total_estimated_cost: number | null
          total_participants: number | null
          total_sessions: number | null
          updated_at: string | null
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          area_reviewed_at?: string | null
          area_reviewed_by?: string | null
          corporate_reviewed_at?: string | null
          corporate_reviewed_by?: string | null
          cost_currency?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          fiscal_year: string
          id?: string
          is_historical_import?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          name: string
          status?: Database["public"]["Enums"]["training_plan_status"]
          tna_period_id?: string | null
          total_estimated_cost?: number | null
          total_participants?: number | null
          total_sessions?: number | null
          updated_at?: string | null
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          area_reviewed_at?: string | null
          area_reviewed_by?: string | null
          corporate_reviewed_at?: string | null
          corporate_reviewed_by?: string | null
          cost_currency?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          fiscal_year?: string
          id?: string
          is_historical_import?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          name?: string
          status?: Database["public"]["Enums"]["training_plan_status"]
          tna_period_id?: string | null
          total_estimated_cost?: number | null
          total_participants?: number | null
          total_sessions?: number | null
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_plans_tna_period_id_fkey"
            columns: ["tna_period_id"]
            isOneToOne: false
            referencedRelation: "tna_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      training_providers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          categories: string[] | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          delivery_modes: string[] | null
          description: string | null
          expertise_areas: string[] | null
          id: string
          internal_rating: number | null
          is_active: boolean | null
          is_local: boolean | null
          languages: string[] | null
          legal_name: string | null
          migration_locked: boolean | null
          migration_source: string | null
          name_ar: string | null
          name_en: string
          provider_status: Database["public"]["Enums"]["provider_status"] | null
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string | null
          vendor_code: string | null
          website: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          categories?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_modes?: string[] | null
          description?: string | null
          expertise_areas?: string[] | null
          id?: string
          internal_rating?: number | null
          is_active?: boolean | null
          is_local?: boolean | null
          languages?: string[] | null
          legal_name?: string | null
          migration_locked?: boolean | null
          migration_source?: string | null
          name_ar?: string | null
          name_en: string
          provider_status?:
            | Database["public"]["Enums"]["provider_status"]
            | null
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string | null
          vendor_code?: string | null
          website?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          categories?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_modes?: string[] | null
          description?: string | null
          expertise_areas?: string[] | null
          id?: string
          internal_rating?: number | null
          is_active?: boolean | null
          is_local?: boolean | null
          languages?: string[] | null
          legal_name?: string | null
          migration_locked?: boolean | null
          migration_source?: string | null
          name_ar?: string | null
          name_en?: string
          provider_status?:
            | Database["public"]["Enums"]["provider_status"]
            | null
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string | null
          vendor_code?: string | null
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
      training_sites: {
        Row: {
          address: string | null
          capacity: number | null
          city: string | null
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name_ar: string | null
          name_en: string
          site_type: string | null
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          city?: string | null
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name_ar?: string | null
          name_en: string
          site_type?: string | null
        }
        Update: {
          address?: string | null
          capacity?: number | null
          city?: string | null
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name_ar?: string | null
          name_en?: string
          site_type?: string | null
        }
        Relationships: []
      }
      travel_incidents: {
        Row: {
          actions_taken: string | null
          assigned_to: string | null
          confidential_notes: string | null
          contributing_factors: string[] | null
          created_at: string | null
          created_by: string | null
          days_missed: number | null
          description: string
          employee_id: string
          escalated_at: string | null
          escalated_by: string | null
          escalated_to: string | null
          escalation_reason: string | null
          external_case_id: string | null
          follow_up_completed: boolean | null
          follow_up_description: string | null
          follow_up_due_date: string | null
          follow_up_required: boolean | null
          id: string
          incident_datetime: string
          incident_timezone: string | null
          incident_type: Database["public"]["Enums"]["incident_type"]
          internal_notes: string | null
          itinerary_id: string | null
          location_city: string | null
          location_country: string | null
          location_detail: string | null
          outcome: string | null
          owner_role: string | null
          resolution_summary: string | null
          resolved_at: string | null
          resolved_by: string | null
          root_cause: string | null
          secondary_type: Database["public"]["Enums"]["incident_type"] | null
          session_id: string | null
          severity: Database["public"]["Enums"]["incident_severity"]
          source: string | null
          status: Database["public"]["Enums"]["incident_status"]
          training_impact: Database["public"]["Enums"]["training_impact"]
          training_request_id: string | null
          travel_system_ref: string | null
          travel_visa_request_id: string | null
          updated_at: string | null
        }
        Insert: {
          actions_taken?: string | null
          assigned_to?: string | null
          confidential_notes?: string | null
          contributing_factors?: string[] | null
          created_at?: string | null
          created_by?: string | null
          days_missed?: number | null
          description: string
          employee_id: string
          escalated_at?: string | null
          escalated_by?: string | null
          escalated_to?: string | null
          escalation_reason?: string | null
          external_case_id?: string | null
          follow_up_completed?: boolean | null
          follow_up_description?: string | null
          follow_up_due_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          incident_datetime: string
          incident_timezone?: string | null
          incident_type: Database["public"]["Enums"]["incident_type"]
          internal_notes?: string | null
          itinerary_id?: string | null
          location_city?: string | null
          location_country?: string | null
          location_detail?: string | null
          outcome?: string | null
          owner_role?: string | null
          resolution_summary?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause?: string | null
          secondary_type?: Database["public"]["Enums"]["incident_type"] | null
          session_id?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          source?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          training_impact?: Database["public"]["Enums"]["training_impact"]
          training_request_id?: string | null
          travel_system_ref?: string | null
          travel_visa_request_id?: string | null
          updated_at?: string | null
        }
        Update: {
          actions_taken?: string | null
          assigned_to?: string | null
          confidential_notes?: string | null
          contributing_factors?: string[] | null
          created_at?: string | null
          created_by?: string | null
          days_missed?: number | null
          description?: string
          employee_id?: string
          escalated_at?: string | null
          escalated_by?: string | null
          escalated_to?: string | null
          escalation_reason?: string | null
          external_case_id?: string | null
          follow_up_completed?: boolean | null
          follow_up_description?: string | null
          follow_up_due_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          incident_datetime?: string
          incident_timezone?: string | null
          incident_type?: Database["public"]["Enums"]["incident_type"]
          internal_notes?: string | null
          itinerary_id?: string | null
          location_city?: string | null
          location_country?: string | null
          location_detail?: string | null
          outcome?: string | null
          owner_role?: string | null
          resolution_summary?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause?: string | null
          secondary_type?: Database["public"]["Enums"]["incident_type"] | null
          session_id?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          source?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          training_impact?: Database["public"]["Enums"]["training_impact"]
          training_request_id?: string | null
          travel_system_ref?: string | null
          travel_visa_request_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "travel_incidents_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "travel_itineraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_incidents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_incidents_training_request_id_fkey"
            columns: ["training_request_id"]
            isOneToOne: false
            referencedRelation: "training_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_incidents_travel_visa_request_id_fkey"
            columns: ["travel_visa_request_id"]
            isOneToOne: false
            referencedRelation: "travel_visa_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_itineraries: {
        Row: {
          created_at: string | null
          created_by: string | null
          data_source: string | null
          destination_city: string | null
          destination_country: string
          dietary_requirements: string | null
          employee_id: string
          external_trip_id: string | null
          hse_instructions: string | null
          id: string
          last_synced_at: string | null
          mobility_needs: string | null
          notes: string | null
          safety_notes: string | null
          session_id: string | null
          status: string
          sync_error_message: string | null
          sync_status: string | null
          training_request_id: string | null
          training_venue_address: string | null
          training_venue_contact_email: string | null
          training_venue_contact_name: string | null
          training_venue_contact_phone: string | null
          training_venue_map_url: string | null
          training_venue_name: string | null
          travel_visa_request_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data_source?: string | null
          destination_city?: string | null
          destination_country: string
          dietary_requirements?: string | null
          employee_id: string
          external_trip_id?: string | null
          hse_instructions?: string | null
          id?: string
          last_synced_at?: string | null
          mobility_needs?: string | null
          notes?: string | null
          safety_notes?: string | null
          session_id?: string | null
          status?: string
          sync_error_message?: string | null
          sync_status?: string | null
          training_request_id?: string | null
          training_venue_address?: string | null
          training_venue_contact_email?: string | null
          training_venue_contact_name?: string | null
          training_venue_contact_phone?: string | null
          training_venue_map_url?: string | null
          training_venue_name?: string | null
          travel_visa_request_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data_source?: string | null
          destination_city?: string | null
          destination_country?: string
          dietary_requirements?: string | null
          employee_id?: string
          external_trip_id?: string | null
          hse_instructions?: string | null
          id?: string
          last_synced_at?: string | null
          mobility_needs?: string | null
          notes?: string | null
          safety_notes?: string | null
          session_id?: string | null
          status?: string
          sync_error_message?: string | null
          sync_status?: string | null
          training_request_id?: string | null
          training_venue_address?: string | null
          training_venue_contact_email?: string | null
          training_venue_contact_name?: string | null
          training_venue_contact_phone?: string | null
          training_venue_map_url?: string | null
          training_venue_name?: string | null
          travel_visa_request_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "travel_itineraries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_itineraries_training_request_id_fkey"
            columns: ["training_request_id"]
            isOneToOne: false
            referencedRelation: "training_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_itineraries_travel_visa_request_id_fkey"
            columns: ["travel_visa_request_id"]
            isOneToOne: false
            referencedRelation: "travel_visa_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_visa_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          error_details: string | null
          external_request_id: string | null
          external_response: Json | null
          id: string
          new_value: Json | null
          old_value: Json | null
          travel_visa_request_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          error_details?: string | null
          external_request_id?: string | null
          external_response?: Json | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          travel_visa_request_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          error_details?: string | null
          external_request_id?: string | null
          external_response?: Json | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          travel_visa_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "travel_visa_audit_log_travel_visa_request_id_fkey"
            columns: ["travel_visa_request_id"]
            isOneToOne: false
            referencedRelation: "travel_visa_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_visa_config: {
        Row: {
          config_name: string
          created_at: string
          created_by: string | null
          enable_bulk_initiation: boolean | null
          enable_cost_display: boolean | null
          enable_manual_linking: boolean | null
          field_mappings: Json | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          sync_enabled: boolean | null
          sync_interval_minutes: number | null
          training_purpose_code: string | null
          travel_api_auth_method: string | null
          travel_api_retry_count: number | null
          travel_api_retry_delay_ms: number | null
          travel_api_timeout_ms: number | null
          travel_api_url: string | null
          updated_at: string
          updated_by: string | null
          visa_api_auth_method: string | null
          visa_api_timeout_ms: number | null
          visa_api_url: string | null
        }
        Insert: {
          config_name?: string
          created_at?: string
          created_by?: string | null
          enable_bulk_initiation?: boolean | null
          enable_cost_display?: boolean | null
          enable_manual_linking?: boolean | null
          field_mappings?: Json | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          sync_enabled?: boolean | null
          sync_interval_minutes?: number | null
          training_purpose_code?: string | null
          travel_api_auth_method?: string | null
          travel_api_retry_count?: number | null
          travel_api_retry_delay_ms?: number | null
          travel_api_timeout_ms?: number | null
          travel_api_url?: string | null
          updated_at?: string
          updated_by?: string | null
          visa_api_auth_method?: string | null
          visa_api_timeout_ms?: number | null
          visa_api_url?: string | null
        }
        Update: {
          config_name?: string
          created_at?: string
          created_by?: string | null
          enable_bulk_initiation?: boolean | null
          enable_cost_display?: boolean | null
          enable_manual_linking?: boolean | null
          field_mappings?: Json | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          sync_enabled?: boolean | null
          sync_interval_minutes?: number | null
          training_purpose_code?: string | null
          travel_api_auth_method?: string | null
          travel_api_retry_count?: number | null
          travel_api_retry_delay_ms?: number | null
          travel_api_timeout_ms?: number | null
          travel_api_url?: string | null
          updated_at?: string
          updated_by?: string | null
          visa_api_auth_method?: string | null
          visa_api_timeout_ms?: number | null
          visa_api_url?: string | null
        }
        Relationships: []
      }
      travel_visa_requests: {
        Row: {
          accommodation_cost: number | null
          cost_last_updated_at: string | null
          created_at: string
          destination_city: string | null
          destination_country: string
          employee_id: string
          enrollment_id: string | null
          external_data: Json | null
          id: string
          initiated_at: string | null
          initiated_by: string | null
          initiation_method: string | null
          is_active: boolean | null
          per_diem_amount: number | null
          session_id: string | null
          total_travel_cost: number | null
          training_end_date: string | null
          training_request_id: string | null
          training_start_date: string | null
          travel_booking_reference: string | null
          travel_cost_amount: number | null
          travel_cost_currency: string | null
          travel_end_date: string | null
          travel_request_id: string | null
          travel_start_date: string | null
          travel_status: Database["public"]["Enums"]["travel_status"]
          travel_status_updated_at: string | null
          travel_ticket_number: string | null
          updated_at: string
          visa_expiry_date: string | null
          visa_issue_date: string | null
          visa_number: string | null
          visa_request_id: string | null
          visa_required: boolean | null
          visa_status: Database["public"]["Enums"]["visa_status"]
          visa_status_updated_at: string | null
        }
        Insert: {
          accommodation_cost?: number | null
          cost_last_updated_at?: string | null
          created_at?: string
          destination_city?: string | null
          destination_country: string
          employee_id: string
          enrollment_id?: string | null
          external_data?: Json | null
          id?: string
          initiated_at?: string | null
          initiated_by?: string | null
          initiation_method?: string | null
          is_active?: boolean | null
          per_diem_amount?: number | null
          session_id?: string | null
          total_travel_cost?: number | null
          training_end_date?: string | null
          training_request_id?: string | null
          training_start_date?: string | null
          travel_booking_reference?: string | null
          travel_cost_amount?: number | null
          travel_cost_currency?: string | null
          travel_end_date?: string | null
          travel_request_id?: string | null
          travel_start_date?: string | null
          travel_status?: Database["public"]["Enums"]["travel_status"]
          travel_status_updated_at?: string | null
          travel_ticket_number?: string | null
          updated_at?: string
          visa_expiry_date?: string | null
          visa_issue_date?: string | null
          visa_number?: string | null
          visa_request_id?: string | null
          visa_required?: boolean | null
          visa_status?: Database["public"]["Enums"]["visa_status"]
          visa_status_updated_at?: string | null
        }
        Update: {
          accommodation_cost?: number | null
          cost_last_updated_at?: string | null
          created_at?: string
          destination_city?: string | null
          destination_country?: string
          employee_id?: string
          enrollment_id?: string | null
          external_data?: Json | null
          id?: string
          initiated_at?: string | null
          initiated_by?: string | null
          initiation_method?: string | null
          is_active?: boolean | null
          per_diem_amount?: number | null
          session_id?: string | null
          total_travel_cost?: number | null
          training_end_date?: string | null
          training_request_id?: string | null
          training_start_date?: string | null
          travel_booking_reference?: string | null
          travel_cost_amount?: number | null
          travel_cost_currency?: string | null
          travel_end_date?: string | null
          travel_request_id?: string | null
          travel_start_date?: string | null
          travel_status?: Database["public"]["Enums"]["travel_status"]
          travel_status_updated_at?: string | null
          travel_ticket_number?: string | null
          updated_at?: string
          visa_expiry_date?: string | null
          visa_issue_date?: string | null
          visa_number?: string | null
          visa_request_id?: string | null
          visa_required?: boolean | null
          visa_status?: Database["public"]["Enums"]["visa_status"]
          visa_status_updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "travel_visa_requests_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "session_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_visa_requests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_visa_requests_training_request_id_fkey"
            columns: ["training_request_id"]
            isOneToOne: false
            referencedRelation: "training_requests"
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
      visa_requirements: {
        Row: {
          created_at: string
          destination_country: string
          employee_nationality: string
          id: string
          is_active: boolean | null
          notes: string | null
          processing_days_estimate: number | null
          updated_at: string
          visa_required: boolean
          visa_type: string | null
        }
        Insert: {
          created_at?: string
          destination_country: string
          employee_nationality: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          processing_days_estimate?: number | null
          updated_at?: string
          visa_required?: boolean
          visa_type?: string | null
        }
        Update: {
          created_at?: string
          destination_country?: string
          employee_nationality?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          processing_days_estimate?: number | null
          updated_at?: string
          visa_required?: boolean
          visa_type?: string | null
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
      create_notification: {
        Args: {
          p_message: string
          p_reference_id?: string
          p_reference_type?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialize_training_request_workflow: {
        Args: {
          p_current_approval_level: number
          p_current_approver_id: string
          p_request_id: string
          p_status?: string
        }
        Returns: undefined
      }
      process_training_request_approval: {
        Args: {
          p_current_approver_id?: string
          p_new_status: string
          p_request_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "employee"
        | "manager"
        | "hrbp"
        | "l_and_d"
        | "chro"
        | "admin"
        | "finance"
        | "committee"
      approval_status: "pending" | "approved" | "rejected" | "escalated"
      budget_period_type: "annual" | "quarterly" | "monthly"
      budget_status: "draft" | "active" | "revised" | "closed"
      catalogue_status: "draft" | "pending_approval" | "active" | "retired"
      confidence_level: "high" | "medium" | "low"
      cost_level: "low" | "medium" | "high"
      cost_unit_type: "per_participant" | "per_session"
      delivery_method: "file_download" | "sftp" | "api"
      delivery_mode: "classroom" | "online" | "blended" | "on_the_job"
      export_batch_status:
        | "draft"
        | "validated"
        | "exported"
        | "re_exported"
        | "closed"
        | "error"
      export_format: "csv" | "json" | "xml"
      export_record_status:
        | "pending"
        | "included"
        | "exported"
        | "failed"
        | "deferred"
        | "posted"
      export_type: "per_diem" | "tuition" | "travel_cost" | "combined"
      incident_severity: "minor" | "moderate" | "major" | "critical"
      incident_status:
        | "open"
        | "under_review"
        | "resolved_no_impact"
        | "resolved_training_adjusted"
        | "escalated"
        | "closed"
      incident_type:
        | "flight_delay"
        | "flight_cancellation"
        | "missed_connection"
        | "lost_baggage"
        | "no_pickup"
        | "wrong_pickup"
        | "hotel_issue"
        | "medical_incident"
        | "accident_injury"
        | "security_threat"
        | "lost_stolen_documents"
        | "weather_disruption"
        | "strike_disruption"
        | "political_event"
        | "other"
      provider_status:
        | "draft"
        | "pending_approval"
        | "active"
        | "inactive"
        | "blocked"
      request_status:
        | "draft"
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
        | "completed"
      tag_suggestion_status: "pending" | "accepted" | "rejected"
      tag_type:
        | "topic"
        | "category"
        | "competency"
        | "job_role"
        | "difficulty"
        | "language"
        | "modality"
      tagging_job_status:
        | "pending"
        | "running"
        | "completed"
        | "failed"
        | "cancelled"
      training_impact:
        | "none"
        | "late_arrival"
        | "missed_days"
        | "complete_no_show"
        | "session_cancelled"
        | "session_postponed"
      training_location: "local" | "abroad"
      training_plan_status:
        | "draft"
        | "under_area_review"
        | "under_corporate_review"
        | "approved"
        | "locked"
      travel_status:
        | "not_initiated"
        | "requested"
        | "approved"
        | "ticketed"
        | "completed"
        | "cancelled"
      visa_status:
        | "not_required"
        | "initiated"
        | "submitted"
        | "approved"
        | "rejected"
        | "cancelled"
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
      app_role: [
        "employee",
        "manager",
        "hrbp",
        "l_and_d",
        "chro",
        "admin",
        "finance",
        "committee",
      ],
      approval_status: ["pending", "approved", "rejected", "escalated"],
      budget_period_type: ["annual", "quarterly", "monthly"],
      budget_status: ["draft", "active", "revised", "closed"],
      catalogue_status: ["draft", "pending_approval", "active", "retired"],
      confidence_level: ["high", "medium", "low"],
      cost_level: ["low", "medium", "high"],
      cost_unit_type: ["per_participant", "per_session"],
      delivery_method: ["file_download", "sftp", "api"],
      delivery_mode: ["classroom", "online", "blended", "on_the_job"],
      export_batch_status: [
        "draft",
        "validated",
        "exported",
        "re_exported",
        "closed",
        "error",
      ],
      export_format: ["csv", "json", "xml"],
      export_record_status: [
        "pending",
        "included",
        "exported",
        "failed",
        "deferred",
        "posted",
      ],
      export_type: ["per_diem", "tuition", "travel_cost", "combined"],
      incident_severity: ["minor", "moderate", "major", "critical"],
      incident_status: [
        "open",
        "under_review",
        "resolved_no_impact",
        "resolved_training_adjusted",
        "escalated",
        "closed",
      ],
      incident_type: [
        "flight_delay",
        "flight_cancellation",
        "missed_connection",
        "lost_baggage",
        "no_pickup",
        "wrong_pickup",
        "hotel_issue",
        "medical_incident",
        "accident_injury",
        "security_threat",
        "lost_stolen_documents",
        "weather_disruption",
        "strike_disruption",
        "political_event",
        "other",
      ],
      provider_status: [
        "draft",
        "pending_approval",
        "active",
        "inactive",
        "blocked",
      ],
      request_status: [
        "draft",
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "completed",
      ],
      tag_suggestion_status: ["pending", "accepted", "rejected"],
      tag_type: [
        "topic",
        "category",
        "competency",
        "job_role",
        "difficulty",
        "language",
        "modality",
      ],
      tagging_job_status: [
        "pending",
        "running",
        "completed",
        "failed",
        "cancelled",
      ],
      training_impact: [
        "none",
        "late_arrival",
        "missed_days",
        "complete_no_show",
        "session_cancelled",
        "session_postponed",
      ],
      training_location: ["local", "abroad"],
      training_plan_status: [
        "draft",
        "under_area_review",
        "under_corporate_review",
        "approved",
        "locked",
      ],
      travel_status: [
        "not_initiated",
        "requested",
        "approved",
        "ticketed",
        "completed",
        "cancelled",
      ],
      visa_status: [
        "not_required",
        "initiated",
        "submitted",
        "approved",
        "rejected",
        "cancelled",
      ],
    },
  },
} as const
