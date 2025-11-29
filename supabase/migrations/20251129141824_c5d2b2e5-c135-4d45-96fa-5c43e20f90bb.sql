-- Bond policy templates table
CREATE TABLE public.bond_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_name VARCHAR NOT NULL,
  program_type VARCHAR NOT NULL, -- masters, phd, professional_cert, etc.
  training_location VARCHAR, -- local, abroad
  min_funding_amount NUMERIC,
  max_funding_amount NUMERIC,
  bond_type VARCHAR NOT NULL DEFAULT 'time_based', -- time_based, amount_based, mixed
  bond_duration_months INTEGER NOT NULL DEFAULT 36,
  repayment_formula VARCHAR, -- pro_rata, fixed, custom
  repayment_percentage NUMERIC DEFAULT 100, -- percentage of funded amount
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Service bonds table (main bond records)
CREATE TABLE public.service_bonds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scholar_record_id UUID NOT NULL REFERENCES public.scholar_records(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.scholarship_applications(id),
  policy_id UUID REFERENCES public.bond_policies(id),
  
  -- Bond terms
  bond_type VARCHAR NOT NULL DEFAULT 'time_based', -- time_based, amount_based, mixed
  bond_duration_months INTEGER NOT NULL DEFAULT 36,
  funded_amount NUMERIC,
  currency VARCHAR DEFAULT 'LYD',
  
  -- Bond dates
  expected_return_date DATE,
  actual_return_date DATE,
  bond_start_date DATE,
  bond_end_date DATE,
  
  -- Return to work details
  return_entity_id UUID REFERENCES public.entities(id),
  return_department_id UUID REFERENCES public.departments(id),
  return_position VARCHAR,
  return_manager_id UUID,
  
  -- Status tracking
  status VARCHAR NOT NULL DEFAULT 'pending', -- pending, active, fulfilled, broken, waived_partial, waived_full, cancelled
  time_served_months INTEGER DEFAULT 0,
  time_suspended_months INTEGER DEFAULT 0,
  
  -- Repayment (if bond broken)
  repayment_required BOOLEAN DEFAULT false,
  calculated_repayment_amount NUMERIC,
  final_repayment_amount NUMERIC,
  repayment_status VARCHAR, -- pending, partial, completed, waived
  
  -- Legal reference
  legal_agreement_reference VARCHAR,
  legal_agreement_url TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  fulfilled_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  
  -- Historical import flag
  is_historical_import BOOLEAN DEFAULT false,
  import_source VARCHAR
);

-- Bond events table (suspensions, waivers, terminations, etc.)
CREATE TABLE public.bond_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bond_id UUID NOT NULL REFERENCES public.service_bonds(id) ON DELETE CASCADE,
  
  event_type VARCHAR NOT NULL, -- suspension, resumption, early_termination, waiver_request, waiver_approved, waiver_rejected, extension, adjustment
  event_date DATE NOT NULL,
  end_date DATE, -- for suspensions
  
  -- Event details
  reason TEXT,
  description TEXT,
  
  -- For waivers
  waiver_type VARCHAR, -- full, partial
  waiver_amount NUMERIC,
  waiver_time_months INTEGER,
  
  -- Approval chain
  approval_status VARCHAR, -- pending, approved, rejected
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  approval_chain JSONB DEFAULT '[]'::jsonb,
  
  -- Supporting documents
  document_url TEXT,
  
  -- Impact
  days_affected INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Bond repayments table
CREATE TABLE public.bond_repayments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bond_id UUID NOT NULL REFERENCES public.service_bonds(id) ON DELETE CASCADE,
  
  amount NUMERIC NOT NULL,
  currency VARCHAR DEFAULT 'LYD',
  payment_date DATE,
  payment_method VARCHAR, -- salary_deduction, direct_payment, bank_transfer
  reference_number VARCHAR,
  
  status VARCHAR DEFAULT 'pending', -- pending, confirmed, cancelled
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ
);

-- Bond audit log
CREATE TABLE public.bond_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bond_id UUID REFERENCES public.service_bonds(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.bond_events(id) ON DELETE SET NULL,
  repayment_id UUID REFERENCES public.bond_repayments(id) ON DELETE SET NULL,
  
  action VARCHAR NOT NULL,
  field_changed VARCHAR,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  
  actor_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.bond_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_bonds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bond_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bond_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bond_audit_log ENABLE ROW LEVEL SECURITY;

-- Bond policies RLS
CREATE POLICY "Everyone can view active policies" ON public.bond_policies
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "L&D can manage policies" ON public.bond_policies
  FOR ALL USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- Service bonds RLS
CREATE POLICY "Employees can view own bonds" ON public.service_bonds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM scholar_records sr 
      WHERE sr.id = service_bonds.scholar_record_id 
      AND sr.employee_id = auth.uid()
    )
  );

CREATE POLICY "Managers can view team bonds" ON public.service_bonds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM scholar_records sr
      JOIN profiles p ON p.id = sr.employee_id
      WHERE sr.id = service_bonds.scholar_record_id
      AND p.manager_id = auth.uid()
    )
  );

CREATE POLICY "L&D/HRBP/CHRO can view all bonds" ON public.service_bonds
  FOR SELECT USING (
    has_role(auth.uid(), 'l_and_d') OR 
    has_role(auth.uid(), 'hrbp') OR 
    has_role(auth.uid(), 'chro') OR 
    has_role(auth.uid(), 'admin')
  );

CREATE POLICY "L&D can manage bonds" ON public.service_bonds
  FOR ALL USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "HRBP can update bonds" ON public.service_bonds
  FOR UPDATE USING (has_role(auth.uid(), 'hrbp'));

-- Bond events RLS
CREATE POLICY "View events for accessible bonds" ON public.bond_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM service_bonds sb
      JOIN scholar_records sr ON sr.id = sb.scholar_record_id
      WHERE sb.id = bond_events.bond_id
      AND (
        sr.employee_id = auth.uid() OR
        has_role(auth.uid(), 'l_and_d') OR
        has_role(auth.uid(), 'hrbp') OR
        has_role(auth.uid(), 'chro') OR
        has_role(auth.uid(), 'admin') OR
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = sr.employee_id AND p.manager_id = auth.uid())
      )
    )
  );

CREATE POLICY "L&D/HRBP can manage events" ON public.bond_events
  FOR ALL USING (
    has_role(auth.uid(), 'l_and_d') OR 
    has_role(auth.uid(), 'hrbp') OR 
    has_role(auth.uid(), 'admin')
  );

-- Bond repayments RLS (more restricted)
CREATE POLICY "Finance/L&D can view repayments" ON public.bond_repayments
  FOR SELECT USING (
    has_role(auth.uid(), 'l_and_d') OR 
    has_role(auth.uid(), 'hrbp') OR
    has_role(auth.uid(), 'chro') OR
    has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Finance/L&D can manage repayments" ON public.bond_repayments
  FOR ALL USING (
    has_role(auth.uid(), 'l_and_d') OR 
    has_role(auth.uid(), 'admin')
  );

-- Bond audit log RLS
CREATE POLICY "L&D can view audit logs" ON public.bond_audit_log
  FOR SELECT USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs" ON public.bond_audit_log
  FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_service_bonds_scholar ON public.service_bonds(scholar_record_id);
CREATE INDEX idx_service_bonds_status ON public.service_bonds(status);
CREATE INDEX idx_service_bonds_bond_end ON public.service_bonds(bond_end_date);
CREATE INDEX idx_bond_events_bond ON public.bond_events(bond_id);
CREATE INDEX idx_bond_repayments_bond ON public.bond_repayments(bond_id);

-- Insert default bond policies
INSERT INTO public.bond_policies (policy_name, program_type, training_location, bond_type, bond_duration_months, repayment_formula, repayment_percentage) VALUES
  ('Masters Local - Standard', 'masters', 'local', 'time_based', 36, 'pro_rata', 100),
  ('Masters Abroad - Standard', 'masters', 'abroad', 'mixed', 48, 'pro_rata', 100),
  ('PhD Local - Standard', 'phd', 'local', 'time_based', 48, 'pro_rata', 100),
  ('PhD Abroad - Standard', 'phd', 'abroad', 'mixed', 60, 'pro_rata', 100),
  ('Professional Certification', 'professional_cert', NULL, 'time_based', 24, 'pro_rata', 100);

-- Create updated_at trigger
CREATE TRIGGER update_service_bonds_updated_at
  BEFORE UPDATE ON public.service_bonds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_bond_policies_updated_at
  BEFORE UPDATE ON public.bond_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();