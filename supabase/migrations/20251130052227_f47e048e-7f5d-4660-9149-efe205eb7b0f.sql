-- Per Diem Destination Bands Table
CREATE TABLE public.per_diem_destination_bands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country VARCHAR NOT NULL,
  city VARCHAR,
  band VARCHAR NOT NULL DEFAULT 'B',
  currency VARCHAR NOT NULL DEFAULT 'USD',
  training_daily_rate NUMERIC NOT NULL,
  business_daily_rate NUMERIC,
  is_domestic BOOLEAN DEFAULT false,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_destination_band UNIQUE (country, city, valid_from)
);

-- Per Diem Grade Bands Table
CREATE TABLE public.per_diem_grade_bands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  band_name VARCHAR NOT NULL,
  grade_from INTEGER NOT NULL,
  grade_to INTEGER NOT NULL,
  multiplier NUMERIC DEFAULT 1.0,
  fixed_rate_override NUMERIC,
  currency VARCHAR,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Per Diem Policy Configuration
CREATE TABLE public.per_diem_policy_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key VARCHAR NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default policy configurations
INSERT INTO public.per_diem_policy_config (config_key, config_value, description) VALUES
('travel_day_rate', '{"percentage": 50}', 'Percentage of per diem for travel days'),
('weekend_included', '{"training": true, "business": true}', 'Whether weekends are included in per diem calculation'),
('no_per_diem_same_city', '{"enabled": true}', 'No per diem when training in same city as employee base'),
('accommodation_covered_rate', '{"percentage": 0}', 'Per diem rate when accommodation and meals fully covered'),
('min_days_eligible', '{"days": 1}', 'Minimum days to be eligible for per diem'),
('max_days_eligible', '{"days": 30}', 'Maximum days eligible for per diem per trip'),
('departure_cutoff_time', '{"hour": 12, "half_day_before": true}', 'Departure time cutoff for half-day calculation'),
('arrival_cutoff_time', '{"hour": 14, "half_day_after": true}', 'Arrival time cutoff for half-day calculation'),
('override_approval_threshold', '{"percentage": 20}', 'Override threshold requiring approval');

-- Per Diem Calculations Table
CREATE TABLE public.per_diem_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  training_request_id UUID,
  session_id UUID,
  travel_visa_request_id UUID,
  destination_country VARCHAR NOT NULL,
  destination_city VARCHAR,
  destination_band VARCHAR,
  is_domestic BOOLEAN DEFAULT false,
  employee_grade INTEGER,
  grade_band_id UUID,
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  calculation_type VARCHAR NOT NULL DEFAULT 'estimate',
  daily_rate NUMERIC NOT NULL,
  currency VARCHAR NOT NULL DEFAULT 'USD',
  full_days INTEGER DEFAULT 0,
  travel_days NUMERIC DEFAULT 0,
  weekend_days INTEGER DEFAULT 0,
  excluded_days INTEGER DEFAULT 0,
  total_eligible_days NUMERIC DEFAULT 0,
  estimated_amount NUMERIC,
  final_amount NUMERIC,
  destination_band_id UUID,
  policy_snapshot JSONB,
  status VARCHAR DEFAULT 'pending',
  payment_status VARCHAR DEFAULT 'not_submitted',
  payment_period VARCHAR,
  payment_reference VARCHAR,
  config_missing BOOLEAN DEFAULT false,
  config_missing_reason TEXT,
  accommodation_covered BOOLEAN DEFAULT false,
  has_override BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  calculated_at TIMESTAMP WITH TIME ZONE
);

-- Per Diem Overrides Table
CREATE TABLE public.per_diem_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  per_diem_calculation_id UUID NOT NULL,
  original_eligible_days NUMERIC NOT NULL,
  original_daily_rate NUMERIC NOT NULL,
  original_amount NUMERIC NOT NULL,
  override_eligible_days NUMERIC,
  override_daily_rate NUMERIC,
  override_amount NUMERIC,
  reason TEXT NOT NULL,
  supporting_document_url TEXT,
  approval_status VARCHAR DEFAULT 'pending',
  requires_approval BOOLEAN DEFAULT true,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Per Diem Audit Log
CREATE TABLE public.per_diem_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type VARCHAR NOT NULL,
  entity_id UUID,
  action VARCHAR NOT NULL,
  field_changed VARCHAR,
  old_value TEXT,
  new_value TEXT,
  actor_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add foreign keys
ALTER TABLE public.per_diem_calculations 
  ADD CONSTRAINT fk_per_diem_calc_grade_band FOREIGN KEY (grade_band_id) REFERENCES per_diem_grade_bands(id),
  ADD CONSTRAINT fk_per_diem_calc_dest_band FOREIGN KEY (destination_band_id) REFERENCES per_diem_destination_bands(id);

ALTER TABLE public.per_diem_overrides 
  ADD CONSTRAINT fk_per_diem_override_calc FOREIGN KEY (per_diem_calculation_id) REFERENCES per_diem_calculations(id);

-- Enable RLS on all tables
ALTER TABLE public.per_diem_destination_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.per_diem_grade_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.per_diem_policy_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.per_diem_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.per_diem_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.per_diem_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for per_diem_destination_bands
CREATE POLICY "Finance/Admin can manage destination bands"
ON public.per_diem_destination_bands FOR ALL
USING (has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "View active destination bands"
ON public.per_diem_destination_bands FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'l_and_d'::app_role));

-- RLS Policies for per_diem_grade_bands
CREATE POLICY "Finance/Admin can manage grade bands"
ON public.per_diem_grade_bands FOR ALL
USING (has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "View active grade bands"
ON public.per_diem_grade_bands FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'l_and_d'::app_role));

-- RLS Policies for per_diem_policy_config
CREATE POLICY "Finance/Admin can manage policy config"
ON public.per_diem_policy_config FOR ALL
USING (has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "View active policy config"
ON public.per_diem_policy_config FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'l_and_d'::app_role));

-- RLS Policies for per_diem_calculations
CREATE POLICY "Employees view own calculations"
ON public.per_diem_calculations FOR SELECT
USING (employee_id = auth.uid());

CREATE POLICY "L&D/Finance view all calculations"
ON public.per_diem_calculations FOR SELECT
USING (has_role(auth.uid(), 'l_and_d'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'hrbp'::app_role) OR has_role(auth.uid(), 'chro'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "L&D/Finance create calculations"
ON public.per_diem_calculations FOR INSERT
WITH CHECK (has_role(auth.uid(), 'l_and_d'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role));

CREATE POLICY "Finance update calculations"
ON public.per_diem_calculations FOR UPDATE
USING (has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers view team calculations"
ON public.per_diem_calculations FOR SELECT
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = per_diem_calculations.employee_id AND p.manager_id = auth.uid()));

-- RLS Policies for per_diem_overrides
CREATE POLICY "Finance manage overrides"
ON public.per_diem_overrides FOR ALL
USING (has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "L&D view overrides"
ON public.per_diem_overrides FOR SELECT
USING (has_role(auth.uid(), 'l_and_d'::app_role) OR has_role(auth.uid(), 'hrbp'::app_role) OR has_role(auth.uid(), 'chro'::app_role));

-- RLS Policies for per_diem_audit_log
CREATE POLICY "View per diem audit logs"
ON public.per_diem_audit_log FOR SELECT
USING (has_role(auth.uid(), 'l_and_d'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Insert per diem audit logs"
ON public.per_diem_audit_log FOR INSERT
WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_per_diem_dest_country ON public.per_diem_destination_bands(country);
CREATE INDEX idx_per_diem_dest_active ON public.per_diem_destination_bands(is_active, valid_from);
CREATE INDEX idx_per_diem_grade_range ON public.per_diem_grade_bands(grade_from, grade_to);
CREATE INDEX idx_per_diem_calc_emp ON public.per_diem_calculations(employee_id);
CREATE INDEX idx_per_diem_calc_sess ON public.per_diem_calculations(session_id);
CREATE INDEX idx_per_diem_calc_req ON public.per_diem_calculations(training_request_id);
CREATE INDEX idx_per_diem_calc_stat ON public.per_diem_calculations(status, payment_status);