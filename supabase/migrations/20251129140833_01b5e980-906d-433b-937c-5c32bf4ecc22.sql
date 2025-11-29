-- Risk scores table to store AI predictions
CREATE TABLE public.scholar_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholar_record_id UUID NOT NULL REFERENCES public.scholar_records(id) ON DELETE CASCADE,
  risk_score NUMERIC NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_band VARCHAR NOT NULL CHECK (risk_band IN ('on_track', 'watch', 'at_risk', 'critical')),
  contributing_factors JSONB DEFAULT '[]',
  model_version VARCHAR DEFAULT '1.0',
  feature_snapshot JSONB,
  scored_at TIMESTAMPTZ DEFAULT now(),
  is_override BOOLEAN DEFAULT false,
  override_by UUID,
  override_reason TEXT,
  override_at TIMESTAMPTZ,
  previous_band VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Risk configuration table
CREATE TABLE public.scholar_risk_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Risk alerts table
CREATE TABLE public.scholar_risk_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholar_record_id UUID NOT NULL REFERENCES public.scholar_records(id) ON DELETE CASCADE,
  risk_score_id UUID REFERENCES public.scholar_risk_scores(id) ON DELETE SET NULL,
  previous_band VARCHAR,
  new_band VARCHAR NOT NULL,
  alert_type VARCHAR NOT NULL CHECK (alert_type IN ('escalation', 'new_risk', 'critical_threshold', 'improvement')),
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_planned', 'dismissed')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  notified_roles JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Risk scoring jobs table
CREATE TABLE public.scholar_risk_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR NOT NULL CHECK (job_type IN ('batch', 'single', 'historical')),
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  total_count INTEGER DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  model_version VARCHAR,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_risk_scores_scholar ON public.scholar_risk_scores(scholar_record_id);
CREATE INDEX idx_risk_scores_band ON public.scholar_risk_scores(risk_band);
CREATE INDEX idx_risk_scores_scored_at ON public.scholar_risk_scores(scored_at DESC);
CREATE INDEX idx_risk_alerts_status ON public.scholar_risk_alerts(status);
CREATE INDEX idx_risk_alerts_scholar ON public.scholar_risk_alerts(scholar_record_id);
CREATE INDEX idx_risk_jobs_status ON public.scholar_risk_jobs(status);

-- Enable RLS
ALTER TABLE public.scholar_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholar_risk_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholar_risk_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholar_risk_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scholar_risk_scores
CREATE POLICY "L&D/HRBP/CHRO can view all risk scores"
ON public.scholar_risk_scores FOR SELECT
USING (
  has_role(auth.uid(), 'l_and_d') OR 
  has_role(auth.uid(), 'hrbp') OR 
  has_role(auth.uid(), 'chro') OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "L&D can manage risk scores"
ON public.scholar_risk_scores FOR ALL
USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view team risk scores"
ON public.scholar_risk_scores FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM scholar_records sr
    JOIN profiles p ON p.id = sr.employee_id
    WHERE sr.id = scholar_risk_scores.scholar_record_id
    AND p.manager_id = auth.uid()
  )
);

-- RLS Policies for scholar_risk_config
CREATE POLICY "Anyone can view risk config"
ON public.scholar_risk_config FOR SELECT
USING (true);

CREATE POLICY "L&D can manage risk config"
ON public.scholar_risk_config FOR ALL
USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for scholar_risk_alerts
CREATE POLICY "L&D/HRBP can view all alerts"
ON public.scholar_risk_alerts FOR SELECT
USING (
  has_role(auth.uid(), 'l_and_d') OR 
  has_role(auth.uid(), 'hrbp') OR 
  has_role(auth.uid(), 'chro') OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "L&D can manage alerts"
ON public.scholar_risk_alerts FOR ALL
USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hrbp'));

CREATE POLICY "Managers can view team alerts"
ON public.scholar_risk_alerts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM scholar_records sr
    JOIN profiles p ON p.id = sr.employee_id
    WHERE sr.id = scholar_risk_alerts.scholar_record_id
    AND p.manager_id = auth.uid()
  )
);

-- RLS Policies for scholar_risk_jobs
CREATE POLICY "L&D can view and manage jobs"
ON public.scholar_risk_jobs FOR ALL
USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- Insert default configuration
INSERT INTO public.scholar_risk_config (config_key, config_value, description) VALUES
('risk_factors', '{
  "gpa_weight": 0.25,
  "credits_weight": 0.20,
  "failed_modules_weight": 0.20,
  "events_weight": 0.15,
  "timeline_weight": 0.20,
  "gpa_threshold_low": 2.0,
  "gpa_threshold_medium": 2.5,
  "credits_behind_threshold": 0.20,
  "max_failed_core_modules": 2
}', 'Weights and thresholds for risk factors'),
('risk_bands', '{
  "on_track": {"min": 0, "max": 39},
  "watch": {"min": 40, "max": 59},
  "at_risk": {"min": 60, "max": 79},
  "critical": {"min": 80, "max": 100}
}', 'Risk band thresholds'),
('scoring_cadence', '{
  "frequency": "weekly",
  "day_of_week": "sunday",
  "time": "02:00"
}', 'When batch scoring runs'),
('notification_settings', '{
  "notify_l_and_d": true,
  "notify_hrbp": true,
  "notify_manager": true,
  "escalation_threshold": "at_risk"
}', 'Notification routing settings');