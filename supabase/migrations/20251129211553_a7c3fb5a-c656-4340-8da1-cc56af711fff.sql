-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Training Plan Status Enum (if not exists)
DO $$ BEGIN
  CREATE TYPE training_plan_status AS ENUM (
    'draft',
    'under_area_review',
    'under_corporate_review',
    'approved',
    'locked'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Training Plans Table
CREATE TABLE IF NOT EXISTS public.training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  tna_period_id UUID REFERENCES public.tna_periods(id),
  fiscal_year VARCHAR NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status training_plan_status NOT NULL DEFAULT 'draft',
  is_historical_import BOOLEAN DEFAULT false,
  total_participants INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  total_estimated_cost NUMERIC DEFAULT 0,
  cost_currency VARCHAR DEFAULT 'LYD',
  area_reviewed_by UUID,
  area_reviewed_at TIMESTAMPTZ,
  corporate_reviewed_by UUID,
  corporate_reviewed_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  locked_by UUID,
  locked_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Training Plan Items Table
CREATE TABLE IF NOT EXISTS public.training_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id),
  item_name VARCHAR NOT NULL,
  item_name_ar VARCHAR,
  category_id UUID REFERENCES public.course_categories(id),
  training_type VARCHAR NOT NULL DEFAULT 'short_term',
  training_location VARCHAR NOT NULL DEFAULT 'local',
  delivery_mode VARCHAR DEFAULT 'classroom',
  entity_id UUID,
  department_id UUID REFERENCES public.departments(id),
  site VARCHAR,
  cost_centre VARCHAR,
  planned_participants INTEGER NOT NULL DEFAULT 0,
  planned_sessions INTEGER NOT NULL DEFAULT 1,
  max_participants_per_session INTEGER DEFAULT 20,
  provider_id UUID REFERENCES public.training_providers(id),
  provider_name VARCHAR,
  unit_cost NUMERIC DEFAULT 0,
  cost_currency VARCHAR DEFAULT 'LYD',
  target_quarter VARCHAR,
  target_month INTEGER,
  priority VARCHAR DEFAULT 'medium',
  item_status VARCHAR DEFAULT 'active',
  is_catalogue_linked BOOLEAN DEFAULT false,
  is_tna_backed BOOLEAN DEFAULT false,
  tna_item_count INTEGER DEFAULT 0,
  source_tna_ids UUID[] DEFAULT '{}',
  merged_into_id UUID,
  split_from_id UUID,
  excluded_by UUID,
  excluded_at TIMESTAMPTZ,
  exclusion_reason TEXT,
  hrbp_comments TEXT,
  finance_comments TEXT,
  l_and_d_comments TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Training Plan Audit Log
CREATE TABLE IF NOT EXISTS public.training_plan_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.training_plans(id),
  item_id UUID,
  actor_id UUID,
  action VARCHAR NOT NULL,
  field_changed VARCHAR,
  old_value TEXT,
  new_value TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_plan_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "L&D/Admin can manage plans" ON public.training_plans;
DROP POLICY IF EXISTS "HRBP can view and update plans for their scope" ON public.training_plans;
DROP POLICY IF EXISTS "Finance can view plans" ON public.training_plans;
DROP POLICY IF EXISTS "L&D/Admin can manage plan items" ON public.training_plan_items;
DROP POLICY IF EXISTS "HRBP can view plan items" ON public.training_plan_items;
DROP POLICY IF EXISTS "HRBP can update plan items in their scope" ON public.training_plan_items;
DROP POLICY IF EXISTS "Finance can view plan items" ON public.training_plan_items;
DROP POLICY IF EXISTS "Managers can view plan items for their team" ON public.training_plan_items;
DROP POLICY IF EXISTS "L&D/Admin can view audit logs" ON public.training_plan_audit_log;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.training_plan_audit_log;

-- RLS Policies for training_plans
CREATE POLICY "L&D/Admin can manage plans" ON public.training_plans
  FOR ALL USING (
    has_role(auth.uid(), 'l_and_d'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "HRBP can view plans" ON public.training_plans
  FOR SELECT USING (
    has_role(auth.uid(), 'hrbp'::app_role) OR
    has_role(auth.uid(), 'chro'::app_role) OR
    has_role(auth.uid(), 'finance'::app_role)
  );

-- RLS Policies for training_plan_items
CREATE POLICY "L&D/Admin can manage plan items" ON public.training_plan_items
  FOR ALL USING (
    has_role(auth.uid(), 'l_and_d'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "HRBP can view and update plan items" ON public.training_plan_items
  FOR ALL USING (
    has_role(auth.uid(), 'hrbp'::app_role) OR
    has_role(auth.uid(), 'chro'::app_role)
  );

CREATE POLICY "Finance can view plan items" ON public.training_plan_items
  FOR SELECT USING (
    has_role(auth.uid(), 'finance'::app_role)
  );

CREATE POLICY "Managers can view plan items" ON public.training_plan_items
  FOR SELECT USING (
    has_role(auth.uid(), 'manager'::app_role)
  );

-- RLS Policies for audit log
CREATE POLICY "L&D/Admin can view audit logs" ON public.training_plan_audit_log
  FOR SELECT USING (
    has_role(auth.uid(), 'l_and_d'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "System can insert audit logs" ON public.training_plan_audit_log
  FOR INSERT WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_training_plans_period ON public.training_plans(tna_period_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_status ON public.training_plans(status);
CREATE INDEX IF NOT EXISTS idx_plan_items_plan ON public.training_plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_items_status ON public.training_plan_items(item_status);
CREATE INDEX IF NOT EXISTS idx_plan_audit_plan ON public.training_plan_audit_log(plan_id);