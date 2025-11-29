-- AI Prioritisation Configuration
CREATE TABLE public.ai_priority_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name character varying NOT NULL DEFAULT 'default',
  is_active boolean DEFAULT true,
  
  -- Factor weights (0-100)
  hse_criticality_weight integer DEFAULT 25,
  competency_gap_weight integer DEFAULT 20,
  manager_priority_weight integer DEFAULT 15,
  role_criticality_weight integer DEFAULT 15,
  compliance_status_weight integer DEFAULT 10,
  cost_efficiency_weight integer DEFAULT 10,
  strategic_alignment_weight integer DEFAULT 5,
  
  -- Threshold bands
  critical_threshold integer DEFAULT 80,
  high_threshold integer DEFAULT 60,
  medium_threshold integer DEFAULT 40,
  
  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_at timestamp with time zone DEFAULT now(),
  approved_by uuid,
  approved_at timestamp with time zone,
  version integer DEFAULT 1
);

-- AI Priority Scores for TNA Items
CREATE TABLE public.ai_priority_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tna_item_id uuid REFERENCES public.tna_items(id) ON DELETE CASCADE,
  plan_item_id uuid REFERENCES public.training_plan_items(id) ON DELETE CASCADE,
  
  -- Scores
  priority_score numeric(5,2) NOT NULL,
  priority_band character varying NOT NULL, -- critical, high, medium, low
  
  -- Factor contributions
  hse_contribution numeric(5,2) DEFAULT 0,
  competency_gap_contribution numeric(5,2) DEFAULT 0,
  manager_priority_contribution numeric(5,2) DEFAULT 0,
  role_criticality_contribution numeric(5,2) DEFAULT 0,
  compliance_contribution numeric(5,2) DEFAULT 0,
  cost_contribution numeric(5,2) DEFAULT 0,
  strategic_contribution numeric(5,2) DEFAULT 0,
  
  -- Explanation
  explanation_summary text,
  factor_details jsonb DEFAULT '[]'::jsonb,
  
  -- Model metadata
  model_version character varying DEFAULT 'v1',
  config_version integer DEFAULT 1,
  scoring_job_id uuid,
  
  -- Override tracking
  is_overridden boolean DEFAULT false,
  original_score numeric(5,2),
  original_band character varying,
  overridden_by uuid,
  overridden_at timestamp with time zone,
  override_reason text,
  
  -- Timestamps
  scored_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT score_target_check CHECK (
    (tna_item_id IS NOT NULL AND plan_item_id IS NULL) OR
    (tna_item_id IS NULL AND plan_item_id IS NOT NULL)
  )
);

-- AI Scoring Jobs
CREATE TABLE public.ai_scoring_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name character varying,
  job_type character varying NOT NULL DEFAULT 'batch', -- batch, on_demand, historical
  
  -- Scope
  tna_period_id uuid,
  plan_id uuid,
  scope_filter jsonb DEFAULT '{}'::jsonb,
  
  -- Progress
  status character varying DEFAULT 'pending', -- pending, running, completed, failed
  total_items integer DEFAULT 0,
  processed_items integer DEFAULT 0,
  success_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  error_log jsonb DEFAULT '[]'::jsonb,
  
  -- Timing
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  estimated_completion timestamp with time zone,
  
  -- Config snapshot
  config_snapshot jsonb,
  model_version character varying DEFAULT 'v1',
  
  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid
);

-- AI Priority Audit Log
CREATE TABLE public.ai_priority_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type character varying NOT NULL, -- config, score, override, job
  entity_id uuid,
  action character varying NOT NULL,
  actor_id uuid,
  old_value jsonb,
  new_value jsonb,
  details jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ai_priority_scores_tna_item ON public.ai_priority_scores(tna_item_id) WHERE tna_item_id IS NOT NULL;
CREATE INDEX idx_ai_priority_scores_plan_item ON public.ai_priority_scores(plan_item_id) WHERE plan_item_id IS NOT NULL;
CREATE INDEX idx_ai_priority_scores_band ON public.ai_priority_scores(priority_band);
CREATE INDEX idx_ai_priority_scores_score ON public.ai_priority_scores(priority_score DESC);
CREATE INDEX idx_ai_scoring_jobs_status ON public.ai_scoring_jobs(status);

-- Enable RLS
ALTER TABLE public.ai_priority_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_priority_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_scoring_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_priority_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_priority_config
CREATE POLICY "Everyone can view active config" ON public.ai_priority_config
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "L&D/Admin can manage config" ON public.ai_priority_config
  FOR ALL USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for ai_priority_scores
CREATE POLICY "View scores based on role" ON public.ai_priority_scores
  FOR SELECT USING (
    has_role(auth.uid(), 'l_and_d') OR 
    has_role(auth.uid(), 'hrbp') OR 
    has_role(auth.uid(), 'chro') OR 
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'manager')
  );

CREATE POLICY "L&D can manage scores" ON public.ai_priority_scores
  FOR ALL USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "HRBP can override scores" ON public.ai_priority_scores
  FOR UPDATE USING (has_role(auth.uid(), 'hrbp'))
  WITH CHECK (has_role(auth.uid(), 'hrbp'));

-- RLS Policies for ai_scoring_jobs
CREATE POLICY "L&D/HRBP can view jobs" ON public.ai_scoring_jobs
  FOR SELECT USING (
    has_role(auth.uid(), 'l_and_d') OR 
    has_role(auth.uid(), 'hrbp') OR 
    has_role(auth.uid(), 'chro') OR 
    has_role(auth.uid(), 'admin')
  );

CREATE POLICY "L&D can manage jobs" ON public.ai_scoring_jobs
  FOR ALL USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for audit log
CREATE POLICY "L&D/Admin can view audit logs" ON public.ai_priority_audit_log
  FOR SELECT USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs" ON public.ai_priority_audit_log
  FOR INSERT WITH CHECK (true);

-- Insert default config
INSERT INTO public.ai_priority_config (config_name, is_active) VALUES ('default', true);

-- Triggers for updated_at
CREATE TRIGGER update_ai_priority_config_updated_at
  BEFORE UPDATE ON public.ai_priority_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_priority_scores_updated_at
  BEFORE UPDATE ON public.ai_priority_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();