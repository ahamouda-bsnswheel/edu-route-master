-- Create plan_scenarios table
CREATE TABLE public.plan_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  basis_plan_id UUID NOT NULL REFERENCES public.training_plans(id),
  basis_plan_version INTEGER NOT NULL DEFAULT 1,
  owner_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('creating', 'draft', 'under_review', 'approved', 'adopted', 'archived')),
  visibility_scope TEXT NOT NULL DEFAULT 'global' CHECK (visibility_scope IN ('global', 'entity', 'restricted')),
  visibility_entities TEXT[] DEFAULT '{}',
  visibility_users UUID[] DEFAULT '{}',
  
  -- Global levers
  global_budget_type TEXT DEFAULT 'percentage' CHECK (global_budget_type IN ('percentage', 'absolute')),
  global_budget_value NUMERIC,
  baseline_total_cost NUMERIC,
  scenario_total_cost NUMERIC,
  baseline_total_participants INTEGER,
  scenario_total_participants INTEGER,
  
  -- Priority rules
  include_priority_bands TEXT[] DEFAULT ARRAY['critical', 'high', 'medium', 'low'],
  cut_order TEXT[] DEFAULT ARRAY['low', 'medium', 'high', 'critical'],
  
  -- Category rules
  protected_categories UUID[] DEFAULT '{}',
  cut_abroad_first BOOLEAN DEFAULT false,
  
  -- Entity-specific caps (JSONB: { entity_id: { type: 'percentage'|'absolute', value: number } })
  entity_caps JSONB DEFAULT '{}',
  
  -- Job tracking
  creation_job_id UUID,
  creation_progress INTEGER DEFAULT 0,
  last_recalculation_at TIMESTAMP WITH TIME ZONE,
  
  -- Promoted plan info
  promoted_to_plan_id UUID REFERENCES public.training_plans(id),
  promoted_at TIMESTAMP WITH TIME ZONE,
  promoted_by UUID,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scenario_items table (copy of plan items with scenario adjustments)
CREATE TABLE public.scenario_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES public.plan_scenarios(id) ON DELETE CASCADE,
  source_plan_item_id UUID REFERENCES public.training_plan_items(id),
  
  -- Copied from plan item
  course_id UUID REFERENCES public.courses(id),
  course_name TEXT,
  entity_id UUID,
  entity_name TEXT,
  department_id UUID,
  department_name TEXT,
  category_id UUID,
  category_name TEXT,
  provider_id UUID,
  provider_name TEXT,
  is_abroad BOOLEAN DEFAULT false,
  is_hse_mandatory BOOLEAN DEFAULT false,
  priority_band TEXT,
  priority_score NUMERIC,
  
  -- Baseline values (from original plan)
  baseline_volume INTEGER NOT NULL DEFAULT 0,
  baseline_sessions INTEGER NOT NULL DEFAULT 0,
  baseline_cost NUMERIC NOT NULL DEFAULT 0,
  baseline_cost_per_participant NUMERIC,
  
  -- Scenario adjusted values
  scenario_volume INTEGER NOT NULL DEFAULT 0,
  scenario_sessions INTEGER NOT NULL DEFAULT 0,
  scenario_cost NUMERIC NOT NULL DEFAULT 0,
  
  -- Delta tracking
  volume_delta INTEGER GENERATED ALWAYS AS (scenario_volume - baseline_volume) STORED,
  cost_delta NUMERIC GENERATED ALWAYS AS (scenario_cost - baseline_cost) STORED,
  
  -- Local adjustments by HRBP
  is_locally_adjusted BOOLEAN DEFAULT false,
  local_adjustment_by UUID,
  local_adjustment_reason TEXT,
  local_adjustment_at TIMESTAMP WITH TIME ZONE,
  
  -- Flags
  is_protected BOOLEAN DEFAULT false,
  is_cut BOOLEAN DEFAULT false,
  cut_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scenario_audit_log table
CREATE TABLE public.scenario_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID REFERENCES public.plan_scenarios(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  actor_id UUID,
  details JSONB,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_plan_scenarios_basis_plan ON public.plan_scenarios(basis_plan_id);
CREATE INDEX idx_plan_scenarios_owner ON public.plan_scenarios(owner_id);
CREATE INDEX idx_plan_scenarios_status ON public.plan_scenarios(status);
CREATE INDEX idx_scenario_items_scenario ON public.scenario_items(scenario_id);
CREATE INDEX idx_scenario_items_entity ON public.scenario_items(entity_id);
CREATE INDEX idx_scenario_items_category ON public.scenario_items(category_id);
CREATE INDEX idx_scenario_items_priority ON public.scenario_items(priority_band);
CREATE INDEX idx_scenario_audit_scenario ON public.scenario_audit_log(scenario_id);

-- Enable RLS
ALTER TABLE public.plan_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for plan_scenarios
CREATE POLICY "Users can view scenarios based on visibility" ON public.plan_scenarios
  FOR SELECT USING (
    visibility_scope = 'global' 
    OR owner_id = auth.uid()
    OR auth.uid() = ANY(visibility_users)
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'l_and_d')
    OR has_role(auth.uid(), 'chro')
    OR has_role(auth.uid(), 'finance')
  );

CREATE POLICY "L&D and authorized users can create scenarios" ON public.plan_scenarios
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'l_and_d')
    OR has_role(auth.uid(), 'hrbp')
    OR has_role(auth.uid(), 'chro')
    OR has_role(auth.uid(), 'finance')
  );

CREATE POLICY "Owners and L&D can update draft scenarios" ON public.plan_scenarios
  FOR UPDATE USING (
    (owner_id = auth.uid() AND status IN ('draft', 'under_review'))
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'l_and_d')
  );

CREATE POLICY "Only admins and owners can delete draft scenarios" ON public.plan_scenarios
  FOR DELETE USING (
    (owner_id = auth.uid() AND status = 'draft')
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'chro')
  );

-- RLS Policies for scenario_items
CREATE POLICY "Users can view scenario items for accessible scenarios" ON public.scenario_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.plan_scenarios ps 
      WHERE ps.id = scenario_id 
      AND (
        ps.visibility_scope = 'global' 
        OR ps.owner_id = auth.uid()
        OR auth.uid() = ANY(ps.visibility_users)
        OR has_role(auth.uid(), 'admin')
        OR has_role(auth.uid(), 'l_and_d')
      )
    )
  );

CREATE POLICY "System can manage scenario items" ON public.scenario_items
  FOR ALL USING (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'l_and_d')
    OR EXISTS (
      SELECT 1 FROM public.plan_scenarios ps 
      WHERE ps.id = scenario_id AND ps.owner_id = auth.uid()
    )
  );

-- RLS Policies for scenario_audit_log
CREATE POLICY "L&D and admins can view scenario audit logs" ON public.scenario_audit_log
  FOR SELECT USING (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'l_and_d')
    OR has_role(auth.uid(), 'chro')
  );

CREATE POLICY "System can insert audit logs" ON public.scenario_audit_log
  FOR INSERT WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_plan_scenarios_updated_at
  BEFORE UPDATE ON public.plan_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_scenario_items_updated_at
  BEFORE UPDATE ON public.scenario_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();