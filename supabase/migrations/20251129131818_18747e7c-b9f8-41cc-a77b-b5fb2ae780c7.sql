-- Certificate Templates Table
CREATE TABLE public.certificate_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  language VARCHAR DEFAULT 'en', -- 'en', 'ar', 'bilingual'
  page_size VARCHAR DEFAULT 'A4', -- 'A4', 'Letter'
  orientation VARCHAR DEFAULT 'landscape', -- 'portrait', 'landscape'
  background_url TEXT,
  header_logo_url TEXT,
  footer_logo_url TEXT,
  signature_image_url TEXT,
  primary_color VARCHAR DEFAULT '#1a365d',
  secondary_color VARCHAR DEFAULT '#d4af37',
  font_family VARCHAR DEFAULT 'Arial',
  custom_css TEXT,
  placeholders JSONB DEFAULT '[]'::jsonb, -- Array of placeholder configs
  is_default BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  version INTEGER DEFAULT 1,
  status VARCHAR DEFAULT 'draft', -- 'draft', 'approved', 'archived'
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Course to Template Assignment
CREATE TABLE public.course_certificate_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.course_categories(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.certificate_templates(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0, -- Higher priority wins
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_course_template UNIQUE (course_id, template_id),
  CONSTRAINT unique_category_template UNIQUE (category_id, template_id),
  CONSTRAINT course_or_category CHECK (
    (course_id IS NOT NULL AND category_id IS NULL) OR 
    (course_id IS NULL AND category_id IS NOT NULL) OR
    (course_id IS NULL AND category_id IS NULL) -- Global default
  )
);

-- Certificates Table
CREATE TABLE public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_number VARCHAR NOT NULL UNIQUE,
  employee_id UUID NOT NULL,
  enrollment_id UUID REFERENCES public.session_enrollments(id),
  session_id UUID REFERENCES public.sessions(id),
  course_id UUID NOT NULL REFERENCES public.courses(id),
  template_id UUID REFERENCES public.certificate_templates(id),
  template_version INTEGER,
  
  -- Certificate data snapshot
  participant_name_en VARCHAR,
  participant_name_ar VARCHAR,
  participant_employee_id VARCHAR,
  course_name_en VARCHAR,
  course_name_ar VARCHAR,
  session_start_date DATE,
  session_end_date DATE,
  completion_date DATE,
  duration_hours INTEGER,
  cpd_hours NUMERIC,
  provider_name VARCHAR,
  trainer_name VARCHAR,
  assessment_score NUMERIC,
  
  -- Status
  status VARCHAR DEFAULT 'valid', -- 'valid', 'expired', 'revoked'
  issued_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID,
  revocation_reason TEXT,
  
  -- Storage
  pdf_url TEXT,
  verification_token VARCHAR UNIQUE,
  
  -- Metadata
  is_historical_import BOOLEAN DEFAULT false,
  import_source VARCHAR,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Certificate Generation Jobs (for bulk operations)
CREATE TABLE public.certificate_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id),
  job_type VARCHAR NOT NULL, -- 'session_completion', 'bulk_regenerate', 'import'
  status VARCHAR DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  total_count INTEGER DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Certificate Audit Log
CREATE TABLE public.certificate_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_id UUID REFERENCES public.certificates(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.certificate_templates(id) ON DELETE SET NULL,
  action VARCHAR NOT NULL, -- 'generated', 'downloaded', 'revoked', 'expired', 'template_created', 'template_approved'
  actor_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for certificate_templates
CREATE POLICY "L&D can manage templates"
ON public.certificate_templates FOR ALL
USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view approved templates"
ON public.certificate_templates FOR SELECT
USING (status = 'approved' OR has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for course_certificate_templates
CREATE POLICY "L&D can manage template assignments"
ON public.course_certificate_templates FOR ALL
USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view template assignments"
ON public.course_certificate_templates FOR SELECT
USING (true);

-- RLS Policies for certificates
CREATE POLICY "Employees can view own certificates"
ON public.certificates FOR SELECT
USING (employee_id = auth.uid());

CREATE POLICY "Managers can view team certificates"
ON public.certificates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = certificates.employee_id 
    AND p.manager_id = auth.uid()
  )
);

CREATE POLICY "L&D can manage all certificates"
ON public.certificates FOR ALL
USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hrbp'));

-- RLS Policies for certificate_jobs
CREATE POLICY "L&D can manage jobs"
ON public.certificate_jobs FOR ALL
USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for certificate_audit_log
CREATE POLICY "L&D can view audit logs"
ON public.certificate_audit_log FOR SELECT
USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs"
ON public.certificate_audit_log FOR INSERT
WITH CHECK (true);

-- Indexes
CREATE INDEX idx_certificates_employee ON public.certificates(employee_id);
CREATE INDEX idx_certificates_course ON public.certificates(course_id);
CREATE INDEX idx_certificates_session ON public.certificates(session_id);
CREATE INDEX idx_certificates_status ON public.certificates(status);
CREATE INDEX idx_certificates_verification ON public.certificates(verification_token);
CREATE INDEX idx_certificate_jobs_status ON public.certificate_jobs(status);

-- Function to generate certificate number
CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS TRIGGER AS $$
DECLARE 
  year_part VARCHAR(4);
  seq_num INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(certificate_number FROM 6 FOR 8) AS INTEGER)), 0) + 1 
  INTO seq_num
  FROM public.certificates 
  WHERE certificate_number LIKE 'CERT-' || year_part || '%';
  NEW.certificate_number := 'CERT-' || year_part || '-' || LPAD(seq_num::TEXT, 8, '0');
  NEW.verification_token := encode(gen_random_bytes(32), 'hex');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER generate_certificate_number_trigger
BEFORE INSERT ON public.certificates
FOR EACH ROW
EXECUTE FUNCTION public.generate_certificate_number();

-- Trigger for updated_at
CREATE TRIGGER update_certificates_updated_at
BEFORE UPDATE ON public.certificates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_certificate_templates_updated_at
BEFORE UPDATE ON public.certificate_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();