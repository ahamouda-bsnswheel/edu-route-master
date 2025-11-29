-- Scholar Records - main tracking record linked to scholarship application
CREATE TABLE public.scholar_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.scholarship_applications(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL,
  program_name VARCHAR NOT NULL,
  institution VARCHAR NOT NULL,
  country VARCHAR NOT NULL,
  degree_level VARCHAR NOT NULL, -- bachelor, master, phd, diploma, professional_cert
  actual_start_date DATE,
  expected_end_date DATE,
  actual_end_date DATE,
  total_credits_required INTEGER,
  credits_completed INTEGER DEFAULT 0,
  cumulative_gpa NUMERIC(3,2),
  gpa_scale NUMERIC(3,1) DEFAULT 4.0,
  status VARCHAR DEFAULT 'not_enrolled', -- not_enrolled, active, on_leave, suspended, completed, withdrawn, failed
  risk_level VARCHAR DEFAULT 'on_track', -- on_track, watch, at_risk, critical
  risk_override BOOLEAN DEFAULT false,
  risk_override_reason TEXT,
  risk_override_by UUID,
  risk_override_at TIMESTAMP WITH TIME ZONE,
  current_term_number INTEGER DEFAULT 0,
  total_terms INTEGER,
  term_structure VARCHAR DEFAULT 'semester', -- semester, trimester, quarter, year
  notes_internal TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(application_id)
);

-- Academic Terms - semester/year data
CREATE TABLE public.academic_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scholar_record_id UUID NOT NULL REFERENCES public.scholar_records(id) ON DELETE CASCADE,
  term_number INTEGER NOT NULL,
  term_name VARCHAR NOT NULL, -- e.g., "Year 1 - Semester 1"
  start_date DATE,
  end_date DATE,
  credits_attempted INTEGER DEFAULT 0,
  credits_earned INTEGER DEFAULT 0,
  term_gpa NUMERIC(3,2),
  status VARCHAR DEFAULT 'planned', -- planned, in_progress, completed, failed, repeated
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  UNIQUE(scholar_record_id, term_number)
);

-- Academic Modules - course/module results per term
CREATE TABLE public.academic_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  module_code VARCHAR,
  module_name VARCHAR NOT NULL,
  module_type VARCHAR DEFAULT 'core', -- core, elective, prerequisite
  credits INTEGER NOT NULL,
  grade VARCHAR,
  grade_points NUMERIC(3,2),
  passed BOOLEAN,
  exam_attempts INTEGER DEFAULT 1,
  is_retake BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Academic Events - leave, suspension, warnings, etc.
CREATE TABLE public.academic_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scholar_record_id UUID NOT NULL REFERENCES public.scholar_records(id) ON DELETE CASCADE,
  event_type VARCHAR NOT NULL, -- academic_warning, probation, suspension, leave, extension, program_transfer, graduation, withdrawal
  event_date DATE NOT NULL,
  end_date DATE,
  description TEXT,
  reason TEXT,
  document_url TEXT,
  impact_on_completion BOOLEAN DEFAULT false,
  new_expected_end_date DATE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Academic Documents - transcripts, grade reports
CREATE TABLE public.academic_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scholar_record_id UUID NOT NULL REFERENCES public.scholar_records(id) ON DELETE CASCADE,
  term_id UUID REFERENCES public.academic_terms(id) ON DELETE SET NULL,
  document_type VARCHAR NOT NULL, -- transcript, grade_report, official_letter, certificate
  file_name VARCHAR NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR,
  academic_year VARCHAR,
  verification_status VARCHAR DEFAULT 'pending', -- pending, verified, rejected
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  uploaded_by UUID,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT
);

-- Academic Risk Rules - configurable risk calculation
CREATE TABLE public.academic_risk_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name VARCHAR NOT NULL,
  condition_type VARCHAR NOT NULL, -- gpa_below, failed_modules, credits_behind, term_extended
  condition_value JSONB NOT NULL, -- e.g., {"threshold": 2.0, "consecutive_terms": 2}
  risk_level VARCHAR NOT NULL, -- watch, at_risk, critical
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Academic Audit Log
CREATE TABLE public.academic_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scholar_record_id UUID REFERENCES public.scholar_records(id) ON DELETE SET NULL,
  term_id UUID REFERENCES public.academic_terms(id) ON DELETE SET NULL,
  module_id UUID,
  action VARCHAR NOT NULL,
  field_changed VARCHAR,
  old_value TEXT,
  new_value TEXT,
  actor_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scholar_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_risk_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scholar_records
CREATE POLICY "Employees can view own records" ON public.scholar_records
  FOR SELECT USING (employee_id = auth.uid());

CREATE POLICY "Managers can view team records" ON public.scholar_records
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = scholar_records.employee_id AND p.manager_id = auth.uid()
  ));

CREATE POLICY "L&D/HRBP/CHRO can view all records" ON public.scholar_records
  FOR SELECT USING (
    has_role(auth.uid(), 'l_and_d') OR 
    has_role(auth.uid(), 'hrbp') OR 
    has_role(auth.uid(), 'chro') OR 
    has_role(auth.uid(), 'admin')
  );

CREATE POLICY "L&D can manage records" ON public.scholar_records
  FOR ALL USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for academic_terms
CREATE POLICY "View terms for accessible records" ON public.academic_terms
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM scholar_records sr WHERE sr.id = academic_terms.scholar_record_id AND (
      sr.employee_id = auth.uid() OR
      has_role(auth.uid(), 'l_and_d') OR 
      has_role(auth.uid(), 'hrbp') OR 
      has_role(auth.uid(), 'chro') OR 
      has_role(auth.uid(), 'admin') OR
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = sr.employee_id AND p.manager_id = auth.uid())
    )
  ));

CREATE POLICY "L&D can manage terms" ON public.academic_terms
  FOR ALL USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for academic_modules
CREATE POLICY "View modules for accessible terms" ON public.academic_modules
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM academic_terms at
    JOIN scholar_records sr ON sr.id = at.scholar_record_id
    WHERE at.id = academic_modules.term_id AND (
      has_role(auth.uid(), 'l_and_d') OR 
      has_role(auth.uid(), 'hrbp') OR 
      has_role(auth.uid(), 'chro') OR 
      has_role(auth.uid(), 'admin')
    )
  ));

CREATE POLICY "L&D can manage modules" ON public.academic_modules
  FOR ALL USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for academic_events
CREATE POLICY "View events for accessible records" ON public.academic_events
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM scholar_records sr WHERE sr.id = academic_events.scholar_record_id AND (
      sr.employee_id = auth.uid() OR
      has_role(auth.uid(), 'l_and_d') OR 
      has_role(auth.uid(), 'hrbp') OR 
      has_role(auth.uid(), 'chro') OR 
      has_role(auth.uid(), 'admin')
    )
  ));

CREATE POLICY "L&D can manage events" ON public.academic_events
  FOR ALL USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for academic_documents
CREATE POLICY "View documents for accessible records" ON public.academic_documents
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM scholar_records sr WHERE sr.id = academic_documents.scholar_record_id AND (
      sr.employee_id = auth.uid() OR
      has_role(auth.uid(), 'l_and_d') OR 
      has_role(auth.uid(), 'hrbp') OR 
      has_role(auth.uid(), 'chro') OR 
      has_role(auth.uid(), 'admin')
    )
  ));

CREATE POLICY "L&D can manage documents" ON public.academic_documents
  FOR ALL USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees can upload documents" ON public.academic_documents
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM scholar_records sr WHERE sr.id = academic_documents.scholar_record_id AND sr.employee_id = auth.uid()
  ));

-- RLS Policies for academic_risk_rules
CREATE POLICY "Everyone can view active rules" ON public.academic_risk_rules
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "L&D can manage rules" ON public.academic_risk_rules
  FOR ALL USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for academic_audit_log
CREATE POLICY "L&D can view audit logs" ON public.academic_audit_log
  FOR SELECT USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs" ON public.academic_audit_log
  FOR INSERT WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_scholar_records_updated_at
  BEFORE UPDATE ON public.scholar_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_academic_terms_updated_at
  BEFORE UPDATE ON public.academic_terms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_academic_modules_updated_at
  BEFORE UPDATE ON public.academic_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create storage bucket for academic documents
INSERT INTO storage.buckets (id, name, public) VALUES ('academic-documents', 'academic-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for academic documents
CREATE POLICY "Authenticated users can upload academic docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'academic-documents' AND auth.role() = 'authenticated');

CREATE POLICY "View academic docs for authorized users"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'academic-documents' AND auth.role() = 'authenticated');

CREATE POLICY "L&D can delete academic docs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'academic-documents' AND (
    has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin')
  ));