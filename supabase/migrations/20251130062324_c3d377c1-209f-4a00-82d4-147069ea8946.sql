-- Create enums for expense export feature
CREATE TYPE export_batch_status AS ENUM (
  'draft',
  'validated',
  'exported',
  're_exported',
  'closed',
  'error'
);

CREATE TYPE export_type AS ENUM (
  'per_diem',
  'tuition',
  'travel_cost',
  'combined'
);

CREATE TYPE export_format AS ENUM (
  'csv',
  'json',
  'xml'
);

CREATE TYPE delivery_method AS ENUM (
  'file_download',
  'sftp',
  'api'
);

CREATE TYPE export_record_status AS ENUM (
  'pending',
  'included',
  'exported',
  'failed',
  'deferred',
  'posted'
);

-- Export configuration table
CREATE TABLE public.expense_export_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_name VARCHAR NOT NULL,
  export_type export_type NOT NULL,
  export_format export_format NOT NULL DEFAULT 'csv',
  delivery_method delivery_method NOT NULL DEFAULT 'file_download',
  
  -- Field mappings (JSON array of {lms_field, target_field, transform})
  field_mappings JSONB DEFAULT '[]'::jsonb,
  
  -- Default filters
  default_entity_filter VARCHAR[] DEFAULT NULL,
  default_cost_centre_filter VARCHAR[] DEFAULT NULL,
  date_basis VARCHAR DEFAULT 'travel_completion', -- travel_completion, training_completion, posting_period
  
  -- Delivery settings
  sftp_host VARCHAR,
  sftp_port INTEGER DEFAULT 22,
  sftp_path VARCHAR,
  api_endpoint VARCHAR,
  api_auth_type VARCHAR, -- oauth2, api_key, client_cert
  
  -- GL/Cost mappings
  default_gl_account VARCHAR,
  default_cost_element VARCHAR,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Export batches table
CREATE TABLE public.expense_export_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_number VARCHAR NOT NULL UNIQUE,
  config_id UUID REFERENCES public.expense_export_config(id),
  
  export_type export_type NOT NULL,
  status export_batch_status NOT NULL DEFAULT 'draft',
  
  -- Period and scope
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  entity_filter VARCHAR[] DEFAULT NULL,
  cost_centre_filter VARCHAR[] DEFAULT NULL,
  
  -- Summary
  total_records INTEGER DEFAULT 0,
  total_amount NUMERIC(15,2) DEFAULT 0,
  currency VARCHAR DEFAULT 'LYD',
  
  -- Validation results
  valid_records INTEGER DEFAULT 0,
  error_records INTEGER DEFAULT 0,
  deferred_records INTEGER DEFAULT 0,
  validation_errors JSONB DEFAULT '[]'::jsonb,
  
  -- Export details
  exported_at TIMESTAMPTZ,
  exported_by UUID,
  export_file_name VARCHAR,
  export_file_path VARCHAR,
  target_system VARCHAR,
  external_batch_id VARCHAR, -- ID returned by ERP/Finance system
  
  -- Re-export tracking
  original_batch_id UUID REFERENCES public.expense_export_batches(id),
  re_export_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Export batch records (line items)
CREATE TABLE public.expense_export_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.expense_export_batches(id) ON DELETE CASCADE,
  
  -- Source reference
  source_type VARCHAR NOT NULL, -- per_diem, tuition, travel_cost
  source_id UUID NOT NULL, -- ID of the source record (per_diem_calculation, session_enrollment, etc.)
  
  -- Employee info
  employee_id UUID NOT NULL,
  employee_payroll_id VARCHAR, -- HR/Payroll ID for export
  employee_name VARCHAR,
  
  -- Training/Trip reference
  training_request_id UUID,
  session_id UUID,
  trip_id UUID,
  course_name VARCHAR,
  
  -- Financial data
  expense_type VARCHAR NOT NULL, -- PER_DIEM_TRAINING, TUITION_TRAINING, etc.
  amount NUMERIC(15,2) NOT NULL,
  currency VARCHAR DEFAULT 'LYD',
  cost_centre VARCHAR,
  gl_account VARCHAR,
  
  -- Period
  expense_date DATE,
  posting_period VARCHAR, -- e.g., "2026-05"
  
  -- Destination (for per diem/travel)
  destination_country VARCHAR,
  destination_city VARCHAR,
  
  -- Status
  status export_record_status NOT NULL DEFAULT 'pending',
  validation_errors JSONB DEFAULT '[]'::jsonb,
  
  -- Export tracking
  export_key VARCHAR NOT NULL, -- Unique idempotent key for ERP
  first_exported_at TIMESTAMPTZ,
  last_exported_at TIMESTAMPTZ,
  external_status VARCHAR, -- Status from ERP (posted, rejected, etc.)
  external_reference VARCHAR, -- Document ID from ERP
  
  -- Incident flag
  has_incident_adjustment BOOLEAN DEFAULT false,
  incident_ids UUID[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Export audit log
CREATE TABLE public.expense_export_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID REFERENCES public.expense_export_batches(id),
  record_id UUID REFERENCES public.expense_export_records(id),
  
  action VARCHAR NOT NULL, -- create_batch, validate, export, re_export, mark_posted, error
  actor_id UUID,
  
  old_status VARCHAR,
  new_status VARCHAR,
  
  details JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  
  -- Technical details for integration
  endpoint_called VARCHAR,
  http_status INTEGER,
  response_snippet TEXT, -- Masked for PII
  file_path VARCHAR,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_export_batches_status ON public.expense_export_batches(status);
CREATE INDEX idx_export_batches_period ON public.expense_export_batches(period_start, period_end);
CREATE INDEX idx_export_batches_created ON public.expense_export_batches(created_at DESC);
CREATE INDEX idx_export_records_batch ON public.expense_export_records(batch_id);
CREATE INDEX idx_export_records_source ON public.expense_export_records(source_type, source_id);
CREATE INDEX idx_export_records_employee ON public.expense_export_records(employee_id);
CREATE INDEX idx_export_records_status ON public.expense_export_records(status);
CREATE INDEX idx_export_records_export_key ON public.expense_export_records(export_key);
CREATE INDEX idx_export_audit_batch ON public.expense_export_audit_log(batch_id);

-- Generate batch number function
CREATE OR REPLACE FUNCTION public.generate_export_batch_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE 
  year_part VARCHAR(4);
  seq_num INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(batch_number FROM 5 FOR 6) AS INTEGER)), 0) + 1 
  INTO seq_num
  FROM public.expense_export_batches 
  WHERE batch_number LIKE 'EXP-' || year_part || '%';
  NEW.batch_number := 'EXP-' || year_part || '-' || LPAD(seq_num::TEXT, 6, '0');
  RETURN NEW;
END;
$function$;

CREATE TRIGGER set_export_batch_number
  BEFORE INSERT ON public.expense_export_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_export_batch_number();

-- Enable RLS
ALTER TABLE public.expense_export_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_export_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_export_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_export_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expense_export_config
CREATE POLICY "Finance/Admin can manage export config"
  ON public.expense_export_config
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "L&D can view export config"
  ON public.expense_export_config
  FOR SELECT
  USING (has_role(auth.uid(), 'l_and_d'::app_role));

-- RLS Policies for expense_export_batches
CREATE POLICY "Finance/Admin can manage batches"
  ON public.expense_export_batches
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "L&D/HRBP can view batches"
  ON public.expense_export_batches
  FOR SELECT
  USING (has_role(auth.uid(), 'l_and_d'::app_role) OR has_role(auth.uid(), 'hrbp'::app_role));

-- RLS Policies for expense_export_records
CREATE POLICY "Finance/Admin can manage records"
  ON public.expense_export_records
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "L&D/HRBP can view records"
  ON public.expense_export_records
  FOR SELECT
  USING (has_role(auth.uid(), 'l_and_d'::app_role) OR has_role(auth.uid(), 'hrbp'::app_role));

-- RLS Policies for expense_export_audit_log
CREATE POLICY "Finance/Admin can view audit logs"
  ON public.expense_export_audit_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert audit logs"
  ON public.expense_export_audit_log
  FOR INSERT
  WITH CHECK (true);