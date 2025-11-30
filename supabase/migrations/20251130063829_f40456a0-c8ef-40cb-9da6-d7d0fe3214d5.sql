-- Training Budget Management
CREATE TYPE budget_status AS ENUM ('draft', 'active', 'revised', 'closed');
CREATE TYPE budget_period_type AS ENUM ('annual', 'quarterly', 'monthly');

-- Budget Definitions
CREATE TABLE training_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year INTEGER NOT NULL,
  period_type budget_period_type NOT NULL DEFAULT 'annual',
  period_number INTEGER DEFAULT 1, -- For quarterly: 1-4, monthly: 1-12
  entity TEXT,
  cost_centre TEXT,
  training_category TEXT, -- HSE, Technical, Leadership, etc.
  budget_type TEXT NOT NULL DEFAULT 'combined', -- combined, tuition, travel_per_diem
  budget_amount NUMERIC(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'LYD',
  version INTEGER NOT NULL DEFAULT 1,
  version_name TEXT DEFAULT 'Initial',
  status budget_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  activated_by UUID,
  UNIQUE (fiscal_year, period_type, period_number, entity, cost_centre, training_category, budget_type, version)
);

-- Cost Analytics Data Mart (aggregated for performance)
CREATE TABLE cost_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  entity TEXT,
  cost_centre TEXT,
  training_category TEXT,
  provider_id UUID,
  provider_name TEXT,
  destination_country TEXT,
  destination_city TEXT,
  is_abroad BOOLEAN DEFAULT FALSE,
  
  -- Cost breakdowns
  tuition_cost NUMERIC(15, 2) DEFAULT 0,
  travel_cost NUMERIC(15, 2) DEFAULT 0,
  per_diem_cost NUMERIC(15, 2) DEFAULT 0,
  total_cost NUMERIC(15, 2) DEFAULT 0,
  
  -- Counts
  session_count INTEGER DEFAULT 0,
  participant_count INTEGER DEFAULT 0,
  trip_count INTEGER DEFAULT 0,
  
  -- Data source tracking
  tuition_source TEXT DEFAULT 'lms', -- lms, erp
  travel_source TEXT DEFAULT 'estimated', -- estimated, actual, erp
  per_diem_source TEXT DEFAULT 'lms', -- lms, erp
  
  -- Refresh tracking
  last_refreshed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget Thresholds for Alerts
CREATE TABLE budget_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold_name TEXT NOT NULL,
  threshold_type TEXT NOT NULL, -- warning, hard_stop
  threshold_percentage INTEGER NOT NULL, -- e.g., 90 for 90%
  applies_to TEXT NOT NULL DEFAULT 'all', -- all, entity, category
  entity_filter TEXT[],
  category_filter TEXT[],
  requires_approval_role TEXT, -- Additional approver role when exceeded
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cost Anomaly Rules
CREATE TABLE cost_anomaly_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL, -- cost_per_participant, per_diem_band, travel_cost_outlier
  comparison_type TEXT NOT NULL, -- median_multiple, percentage_above, absolute_threshold
  threshold_value NUMERIC(10, 2) NOT NULL,
  applies_to TEXT, -- provider, destination, category, or null for all
  severity TEXT NOT NULL DEFAULT 'warning', -- info, warning, critical
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- Detected Anomalies
CREATE TABLE cost_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES cost_anomaly_rules(id),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  entity_type TEXT NOT NULL, -- session, trip, provider, destination
  entity_id TEXT NOT NULL,
  entity_name TEXT,
  expected_value NUMERIC(15, 2),
  actual_value NUMERIC(15, 2),
  variance_percentage NUMERIC(10, 2),
  severity TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- open, reviewed, dismissed, resolved
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  period_year INTEGER,
  period_month INTEGER
);

-- Budget Audit Log
CREATE TABLE budget_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES training_budgets(id),
  action TEXT NOT NULL, -- create, update, activate, close, import
  actor_id UUID,
  old_values JSONB,
  new_values JSONB,
  justification TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cost Export Log
CREATE TABLE cost_export_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_type TEXT NOT NULL, -- summary, detailed
  filters JSONB,
  row_count INTEGER,
  exported_by UUID,
  exported_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_training_budgets_year ON training_budgets(fiscal_year);
CREATE INDEX idx_training_budgets_entity ON training_budgets(entity);
CREATE INDEX idx_training_budgets_status ON training_budgets(status);
CREATE INDEX idx_cost_analytics_period ON cost_analytics(period_year, period_month);
CREATE INDEX idx_cost_analytics_entity ON cost_analytics(entity);
CREATE INDEX idx_cost_analytics_category ON cost_analytics(training_category);
CREATE INDEX idx_cost_analytics_provider ON cost_analytics(provider_id);
CREATE INDEX idx_cost_analytics_destination ON cost_analytics(destination_country);
CREATE INDEX idx_cost_anomalies_status ON cost_anomalies(status);

-- Enable RLS
ALTER TABLE training_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_anomaly_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_export_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Budget read access" ON training_budgets FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Budget write access" ON training_budgets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'l_and_d', 'finance', 'chro')
    )
  );

CREATE POLICY "Cost analytics read" ON cost_analytics FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Cost analytics write" ON cost_analytics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'l_and_d')
    )
  );

CREATE POLICY "Threshold read" ON budget_thresholds FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Threshold write" ON budget_thresholds FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'l_and_d', 'finance')
    )
  );

CREATE POLICY "Anomaly rules read" ON cost_anomaly_rules FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anomaly rules write" ON cost_anomaly_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'l_and_d', 'finance')
    )
  );

CREATE POLICY "Anomalies read" ON cost_anomalies FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anomalies write" ON cost_anomalies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'l_and_d', 'finance', 'hrbp')
    )
  );

CREATE POLICY "Budget audit read" ON budget_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'l_and_d', 'finance', 'chro')
    )
  );

CREATE POLICY "Budget audit insert" ON budget_audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Export log read" ON cost_export_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'l_and_d', 'finance')
    )
  );

CREATE POLICY "Export log insert" ON cost_export_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);