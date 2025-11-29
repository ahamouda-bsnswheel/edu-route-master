-- Provider Performance Dashboard Schema

-- Provider KPI threshold configuration
CREATE TABLE public.provider_kpi_thresholds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_name VARCHAR NOT NULL UNIQUE,
  display_name VARCHAR NOT NULL,
  description TEXT,
  good_threshold NUMERIC,
  warning_threshold NUMERIC,
  comparison_operator VARCHAR DEFAULT 'gte', -- 'gte' (higher is better) or 'lte' (lower is better)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

-- Provider comments and flags
CREATE TABLE public.provider_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.training_providers(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  comment_type VARCHAR DEFAULT 'general', -- general, quality, cost, reliability, hse
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Provider internal flags/status
CREATE TABLE public.provider_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.training_providers(id) ON DELETE CASCADE,
  flag_type VARCHAR NOT NULL, -- preferred_partner, under_review, do_not_use
  reason TEXT,
  set_at TIMESTAMPTZ DEFAULT now(),
  set_by UUID,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  approved_by UUID,
  approved_at TIMESTAMPTZ
);

-- Provider performance snapshots (for historical analytics)
CREATE TABLE public.provider_performance_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.training_providers(id) ON DELETE CASCADE,
  period_type VARCHAR NOT NULL, -- monthly, quarterly, yearly
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_sessions INTEGER DEFAULT 0,
  total_participants INTEGER DEFAULT 0,
  completed_sessions INTEGER DEFAULT 0,
  cancelled_sessions INTEGER DEFAULT 0,
  avg_rating NUMERIC,
  avg_nps NUMERIC,
  completion_rate NUMERIC,
  cancellation_rate NUMERIC,
  on_time_rate NUMERIC,
  total_cost NUMERIC,
  cost_per_participant NUMERIC,
  hse_sessions INTEGER DEFAULT 0,
  hse_completion_rate NUMERIC,
  hse_avg_rating NUMERIC,
  is_historical_import BOOLEAN DEFAULT false,
  import_source VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider_id, period_type, period_start)
);

-- Provider performance audit log
CREATE TABLE public.provider_performance_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action VARCHAR NOT NULL,
  entity_type VARCHAR NOT NULL, -- threshold, comment, flag, export
  entity_id UUID,
  provider_id UUID,
  old_value JSONB,
  new_value JSONB,
  filter_context JSONB, -- for exports
  actor_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.provider_kpi_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_performance_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- KPI Thresholds - viewable by authorized roles, manageable by L&D/Admin
CREATE POLICY "View KPI thresholds" ON public.provider_kpi_thresholds
  FOR SELECT USING (
    has_role(auth.uid(), 'l_and_d') OR 
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'hrbp') OR
    has_role(auth.uid(), 'chro')
  );

CREATE POLICY "Manage KPI thresholds" ON public.provider_kpi_thresholds
  FOR ALL USING (
    has_role(auth.uid(), 'l_and_d') OR 
    has_role(auth.uid(), 'admin')
  );

-- Provider Comments
CREATE POLICY "View provider comments" ON public.provider_comments
  FOR SELECT USING (
    has_role(auth.uid(), 'l_and_d') OR 
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'hrbp') OR
    has_role(auth.uid(), 'chro')
  );

CREATE POLICY "Create provider comments" ON public.provider_comments
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'l_and_d') OR 
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'hrbp')
  );

CREATE POLICY "Update own comments" ON public.provider_comments
  FOR UPDATE USING (created_by = auth.uid());

-- Provider Flags
CREATE POLICY "View provider flags" ON public.provider_flags
  FOR SELECT USING (
    has_role(auth.uid(), 'l_and_d') OR 
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'hrbp') OR
    has_role(auth.uid(), 'chro')
  );

CREATE POLICY "Manage provider flags" ON public.provider_flags
  FOR ALL USING (
    has_role(auth.uid(), 'l_and_d') OR 
    has_role(auth.uid(), 'admin')
  );

-- Performance Snapshots
CREATE POLICY "View performance snapshots" ON public.provider_performance_snapshots
  FOR SELECT USING (
    has_role(auth.uid(), 'l_and_d') OR 
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'hrbp') OR
    has_role(auth.uid(), 'chro')
  );

CREATE POLICY "Manage performance snapshots" ON public.provider_performance_snapshots
  FOR ALL USING (
    has_role(auth.uid(), 'l_and_d') OR 
    has_role(auth.uid(), 'admin')
  );

-- Audit Log
CREATE POLICY "View performance audit logs" ON public.provider_performance_audit_log
  FOR SELECT USING (
    has_role(auth.uid(), 'l_and_d') OR 
    has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Insert audit logs" ON public.provider_performance_audit_log
  FOR INSERT WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_provider_comments_provider ON public.provider_comments(provider_id);
CREATE INDEX idx_provider_flags_provider ON public.provider_flags(provider_id);
CREATE INDEX idx_provider_flags_active ON public.provider_flags(is_active) WHERE is_active = true;
CREATE INDEX idx_performance_snapshots_provider ON public.provider_performance_snapshots(provider_id);
CREATE INDEX idx_performance_snapshots_period ON public.provider_performance_snapshots(period_type, period_start);
CREATE INDEX idx_performance_audit_provider ON public.provider_performance_audit_log(provider_id);

-- Insert default KPI thresholds
INSERT INTO public.provider_kpi_thresholds (kpi_name, display_name, description, good_threshold, warning_threshold, comparison_operator) VALUES
  ('avg_rating', 'Average Rating', 'Average participant satisfaction rating (1-5)', 4.0, 3.5, 'gte'),
  ('completion_rate', 'Completion Rate', 'Percentage of enrolled participants who completed', 90, 80, 'gte'),
  ('cancellation_rate', 'Cancellation Rate', 'Percentage of sessions cancelled by provider', 5, 10, 'lte'),
  ('on_time_rate', 'On-Time Start Rate', 'Percentage of sessions started on schedule', 95, 85, 'gte'),
  ('hse_completion_rate', 'HSE Completion Rate', 'HSE mandatory training completion before due date', 95, 90, 'gte'),
  ('hse_avg_rating', 'HSE Average Rating', 'Average rating for HSE trainings', 4.2, 3.8, 'gte');