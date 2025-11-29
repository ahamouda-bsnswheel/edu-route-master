-- Create scholarship_programs table (catalog)
CREATE TABLE public.scholarship_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en VARCHAR NOT NULL,
  name_ar VARCHAR,
  institution_en VARCHAR NOT NULL,
  institution_ar VARCHAR,
  country VARCHAR NOT NULL,
  city VARCHAR,
  program_type VARCHAR NOT NULL,
  study_mode VARCHAR DEFAULT 'full_time',
  duration_months INTEGER,
  description_en TEXT,
  description_ar TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create scholarship_applications table
CREATE TABLE public.scholarship_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number VARCHAR UNIQUE,
  applicant_id UUID NOT NULL,
  
  -- Program details
  program_id UUID REFERENCES public.scholarship_programs(id),
  program_name_custom VARCHAR,
  institution_custom VARCHAR,
  program_type VARCHAR NOT NULL,
  country VARCHAR NOT NULL,
  city VARCHAR,
  study_mode VARCHAR DEFAULT 'full_time',
  start_date DATE,
  end_date DATE,
  duration_months INTEGER,
  
  -- Cost & Funding
  tuition_per_year NUMERIC,
  tuition_total NUMERIC,
  living_allowance NUMERIC,
  travel_cost NUMERIC,
  visa_insurance_cost NUMERIC,
  total_estimated_cost NUMERIC,
  currency VARCHAR DEFAULT 'LYD',
  funding_source VARCHAR DEFAULT 'company_100',
  company_percentage INTEGER DEFAULT 100,
  
  -- Justification
  justification TEXT,
  competency_gaps TEXT,
  target_role VARCHAR,
  career_path_notes TEXT,
  
  -- Manager assessment
  operational_impact VARCHAR,
  impact_description TEXT,
  replacement_plan TEXT,
  risk_assessment VARCHAR,
  risk_comments TEXT,
  manager_comments TEXT,
  
  -- HRBP/L&D pre-screen
  eligibility_check BOOLEAN,
  eligibility_notes TEXT,
  alignment_check BOOLEAN,
  alignment_notes TEXT,
  policy_compliance BOOLEAN,
  policy_notes TEXT,
  hrbp_recommendation VARCHAR,
  hrbp_comments TEXT,
  ld_recommendation VARCHAR,
  ld_comments TEXT,
  internal_notes TEXT,
  
  -- Committee decision
  committee_decision VARCHAR,
  committee_remarks TEXT,
  committee_score_total NUMERIC,
  
  -- Finance
  budget_status VARCHAR,
  approved_amount NUMERIC,
  cost_centre VARCHAR,
  finance_comments TEXT,
  
  -- Final approval
  final_decision VARCHAR,
  final_comments TEXT,
  final_approved_by UUID,
  final_approved_at TIMESTAMPTZ,
  
  -- Bond/Commitment
  service_commitment_months INTEGER,
  bond_amount NUMERIC,
  
  -- Acceptance
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,
  
  -- Workflow
  status VARCHAR DEFAULT 'draft',
  current_approver_id UUID,
  current_approval_level INTEGER DEFAULT 0,
  
  -- Metadata
  is_historical_import BOOLEAN DEFAULT false,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create scholarship_documents table
CREATE TABLE public.scholarship_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.scholarship_applications(id) ON DELETE CASCADE,
  document_type VARCHAR NOT NULL,
  file_name VARCHAR NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR,
  is_required BOOLEAN DEFAULT false,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Create scholarship_approvals table
CREATE TABLE public.scholarship_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.scholarship_applications(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL,
  approver_role app_role NOT NULL,
  approval_level INTEGER NOT NULL,
  status approval_status DEFAULT 'pending',
  decision VARCHAR,
  comments TEXT,
  delegated_from UUID,
  decision_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create scholarship_committee_scores table
CREATE TABLE public.scholarship_committee_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.scholarship_applications(id) ON DELETE CASCADE,
  committee_member_id UUID NOT NULL,
  candidate_quality_score INTEGER CHECK (candidate_quality_score >= 1 AND candidate_quality_score <= 5),
  business_relevance_score INTEGER CHECK (business_relevance_score >= 1 AND business_relevance_score <= 5),
  urgency_score INTEGER CHECK (urgency_score >= 1 AND urgency_score <= 5),
  cost_benefit_score INTEGER CHECK (cost_benefit_score >= 1 AND cost_benefit_score <= 5),
  total_score NUMERIC,
  comments TEXT,
  has_conflict_of_interest BOOLEAN DEFAULT false,
  abstained BOOLEAN DEFAULT false,
  scored_at TIMESTAMPTZ DEFAULT now()
);

-- Create scholarship_audit_log table
CREATE TABLE public.scholarship_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.scholarship_applications(id) ON DELETE CASCADE,
  actor_id UUID,
  action VARCHAR NOT NULL,
  old_status VARCHAR,
  new_status VARCHAR,
  old_values JSONB,
  new_values JSONB,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Generate application number function
CREATE OR REPLACE FUNCTION public.generate_scholarship_application_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE 
  year_part VARCHAR(4);
  seq_num INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(application_number FROM 10 FOR 6) AS INTEGER)), 0) + 1 
  INTO seq_num
  FROM public.scholarship_applications 
  WHERE application_number LIKE 'SCH-' || year_part || '%';
  NEW.application_number := 'SCH-' || year_part || '-' || LPAD(seq_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_scholarship_app_number
  BEFORE INSERT ON public.scholarship_applications
  FOR EACH ROW
  WHEN (NEW.application_number IS NULL)
  EXECUTE FUNCTION public.generate_scholarship_application_number();

-- Update timestamp triggers
CREATE TRIGGER update_scholarship_applications_updated_at
  BEFORE UPDATE ON public.scholarship_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_scholarship_programs_updated_at
  BEFORE UPDATE ON public.scholarship_programs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Enable RLS
ALTER TABLE public.scholarship_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarship_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarship_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarship_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarship_committee_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarship_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scholarship_programs
CREATE POLICY "Everyone can view active programs" ON public.scholarship_programs
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "L&D can manage programs" ON public.scholarship_programs
  FOR ALL USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for scholarship_applications
CREATE POLICY "Users can view own applications" ON public.scholarship_applications
  FOR SELECT USING (
    applicant_id = auth.uid() OR
    current_approver_id = auth.uid() OR
    has_role(auth.uid(), 'l_and_d') OR
    has_role(auth.uid(), 'hrbp') OR
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'finance') OR
    has_role(auth.uid(), 'chro') OR
    has_role(auth.uid(), 'committee') OR
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = scholarship_applications.applicant_id 
      AND p.manager_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own applications" ON public.scholarship_applications
  FOR INSERT WITH CHECK (applicant_id = auth.uid());

CREATE POLICY "Users can update applications" ON public.scholarship_applications
  FOR UPDATE USING (
    (applicant_id = auth.uid() AND status IN ('draft', 'returned_to_employee')) OR
    current_approver_id = auth.uid() OR
    has_role(auth.uid(), 'l_and_d') OR
    has_role(auth.uid(), 'hrbp') OR
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'finance') OR
    has_role(auth.uid(), 'chro') OR
    has_role(auth.uid(), 'committee')
  );

-- RLS Policies for scholarship_documents
CREATE POLICY "View documents for accessible applications" ON public.scholarship_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM scholarship_applications sa
      WHERE sa.id = scholarship_documents.application_id
      AND (
        sa.applicant_id = auth.uid() OR
        sa.current_approver_id = auth.uid() OR
        has_role(auth.uid(), 'l_and_d') OR
        has_role(auth.uid(), 'hrbp') OR
        has_role(auth.uid(), 'admin') OR
        has_role(auth.uid(), 'finance') OR
        has_role(auth.uid(), 'chro') OR
        has_role(auth.uid(), 'committee') OR
        EXISTS (
          SELECT 1 FROM profiles p 
          WHERE p.id = sa.applicant_id 
          AND p.manager_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can upload documents to own applications" ON public.scholarship_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM scholarship_applications sa
      WHERE sa.id = scholarship_documents.application_id
      AND sa.applicant_id = auth.uid()
      AND sa.status IN ('draft', 'returned_to_employee')
    )
  );

CREATE POLICY "Users can delete own documents" ON public.scholarship_documents
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM scholarship_applications sa
      WHERE sa.id = scholarship_documents.application_id
      AND sa.applicant_id = auth.uid()
      AND sa.status IN ('draft', 'returned_to_employee')
    )
  );

-- RLS Policies for scholarship_approvals
CREATE POLICY "View approvals for accessible applications" ON public.scholarship_approvals
  FOR SELECT USING (
    approver_id = auth.uid() OR
    has_role(auth.uid(), 'l_and_d') OR
    has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM scholarship_applications sa
      WHERE sa.id = scholarship_approvals.application_id
      AND sa.applicant_id = auth.uid()
    )
  );

CREATE POLICY "System can create approvals" ON public.scholarship_approvals
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Approvers can update own approvals" ON public.scholarship_approvals
  FOR UPDATE USING (approver_id = auth.uid() AND status = 'pending');

-- RLS Policies for scholarship_committee_scores
CREATE POLICY "Committee members can manage own scores" ON public.scholarship_committee_scores
  FOR ALL USING (
    committee_member_id = auth.uid() OR
    has_role(auth.uid(), 'l_and_d') OR
    has_role(auth.uid(), 'admin')
  );

CREATE POLICY "View scores for committee review" ON public.scholarship_committee_scores
  FOR SELECT USING (
    has_role(auth.uid(), 'l_and_d') OR
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'chro') OR
    has_role(auth.uid(), 'committee')
  );

-- RLS Policies for scholarship_audit_log
CREATE POLICY "View audit logs" ON public.scholarship_audit_log
  FOR SELECT USING (
    has_role(auth.uid(), 'l_and_d') OR
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'hrbp')
  );

CREATE POLICY "System can insert audit logs" ON public.scholarship_audit_log
  FOR INSERT WITH CHECK (true);

-- Create storage bucket for scholarship documents
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('scholarship-documents', 'scholarship-documents', false, 31457280)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for scholarship documents
CREATE POLICY "Users can upload scholarship documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'scholarship-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view scholarship documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'scholarship-documents' AND
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      has_role(auth.uid(), 'l_and_d') OR
      has_role(auth.uid(), 'hrbp') OR
      has_role(auth.uid(), 'admin') OR
      has_role(auth.uid(), 'finance') OR
      has_role(auth.uid(), 'chro') OR
      has_role(auth.uid(), 'committee')
    )
  );

CREATE POLICY "Users can delete own scholarship documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'scholarship-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );