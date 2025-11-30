-- Create enum for travel status
CREATE TYPE travel_status AS ENUM (
  'not_initiated',
  'requested',
  'approved',
  'ticketed',
  'completed',
  'cancelled'
);

-- Create enum for visa status
CREATE TYPE visa_status AS ENUM (
  'not_required',
  'initiated',
  'submitted',
  'approved',
  'rejected',
  'cancelled'
);

-- Travel & Visa Integration Configuration
CREATE TABLE public.travel_visa_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_name TEXT NOT NULL DEFAULT 'default',
  
  -- Travel API Configuration
  travel_api_url TEXT,
  travel_api_auth_method TEXT DEFAULT 'api_key', -- api_key, oauth2, basic
  travel_api_timeout_ms INTEGER DEFAULT 5000,
  travel_api_retry_count INTEGER DEFAULT 3,
  travel_api_retry_delay_ms INTEGER DEFAULT 1000,
  
  -- Visa API Configuration (if separate)
  visa_api_url TEXT,
  visa_api_auth_method TEXT DEFAULT 'api_key',
  visa_api_timeout_ms INTEGER DEFAULT 5000,
  
  -- Field Mappings (JSON)
  field_mappings JSONB DEFAULT '{}',
  
  -- Purpose codes
  training_purpose_code TEXT DEFAULT 'TRN',
  
  -- Sync Configuration
  sync_enabled BOOLEAN DEFAULT true,
  sync_interval_minutes INTEGER DEFAULT 60,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_error TEXT,
  
  -- Feature flags
  enable_bulk_initiation BOOLEAN DEFAULT true,
  enable_cost_display BOOLEAN DEFAULT true,
  enable_manual_linking BOOLEAN DEFAULT true,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Travel & Visa Requests table
CREATE TABLE public.travel_visa_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Link to training
  training_request_id UUID REFERENCES public.training_requests(id),
  session_id UUID REFERENCES public.sessions(id),
  enrollment_id UUID REFERENCES public.session_enrollments(id),
  employee_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Destination
  destination_country TEXT NOT NULL,
  destination_city TEXT,
  
  -- Dates
  travel_start_date DATE,
  travel_end_date DATE,
  training_start_date DATE,
  training_end_date DATE,
  
  -- Travel Request
  travel_request_id TEXT, -- External system ID
  travel_status travel_status NOT NULL DEFAULT 'not_initiated',
  travel_status_updated_at TIMESTAMPTZ,
  travel_booking_reference TEXT,
  travel_ticket_number TEXT,
  
  -- Visa Request
  visa_required BOOLEAN DEFAULT false,
  visa_request_id TEXT, -- External system ID
  visa_status visa_status NOT NULL DEFAULT 'not_required',
  visa_status_updated_at TIMESTAMPTZ,
  visa_issue_date DATE,
  visa_expiry_date DATE,
  visa_number TEXT,
  
  -- Cost Summary (from external system)
  travel_cost_amount DECIMAL(12, 2),
  travel_cost_currency TEXT DEFAULT 'SAR',
  accommodation_cost DECIMAL(12, 2),
  per_diem_amount DECIMAL(12, 2),
  total_travel_cost DECIMAL(12, 2),
  cost_last_updated_at TIMESTAMPTZ,
  
  -- Metadata
  initiation_method TEXT DEFAULT 'lms', -- lms, external, manual_link
  initiated_by UUID REFERENCES auth.users(id),
  initiated_at TIMESTAMPTZ,
  
  -- External system data
  external_data JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Travel Visa Audit Log
CREATE TABLE public.travel_visa_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  travel_visa_request_id UUID REFERENCES public.travel_visa_requests(id),
  action TEXT NOT NULL, -- initiate, status_update, manual_link, bulk_initiate, error, cost_update
  actor_id UUID REFERENCES auth.users(id),
  old_value JSONB,
  new_value JSONB,
  error_details TEXT,
  external_request_id TEXT,
  external_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Visa Requirements by Country (reference data)
CREATE TABLE public.visa_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_nationality TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  visa_required BOOLEAN NOT NULL DEFAULT true,
  visa_type TEXT,
  processing_days_estimate INTEGER,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_nationality, destination_country)
);

-- Indexes
CREATE INDEX idx_travel_visa_requests_training ON public.travel_visa_requests(training_request_id);
CREATE INDEX idx_travel_visa_requests_session ON public.travel_visa_requests(session_id);
CREATE INDEX idx_travel_visa_requests_employee ON public.travel_visa_requests(employee_id);
CREATE INDEX idx_travel_visa_requests_travel_status ON public.travel_visa_requests(travel_status);
CREATE INDEX idx_travel_visa_requests_visa_status ON public.travel_visa_requests(visa_status);
CREATE INDEX idx_travel_visa_requests_external_ids ON public.travel_visa_requests(travel_request_id, visa_request_id);
CREATE INDEX idx_travel_visa_audit_request ON public.travel_visa_audit_log(travel_visa_request_id);

-- Enable RLS
ALTER TABLE public.travel_visa_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_visa_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_visa_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visa_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for travel_visa_config (admin/IT only)
CREATE POLICY "Admin can manage travel config"
ON public.travel_visa_config
FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'l_and_d'));

-- RLS Policies for travel_visa_requests
CREATE POLICY "Users can view own travel requests"
ON public.travel_visa_requests
FOR SELECT
USING (employee_id = auth.uid());

CREATE POLICY "L&D/Admin can view all travel requests"
ON public.travel_visa_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'l_and_d') OR public.has_role(auth.uid(), 'hrbp'));

CREATE POLICY "Users can create own travel requests"
ON public.travel_visa_requests
FOR INSERT
WITH CHECK (employee_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'l_and_d'));

CREATE POLICY "L&D/Admin can update travel requests"
ON public.travel_visa_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'l_and_d'));

-- RLS for audit log (view only for authorized roles)
CREATE POLICY "Authorized roles can view audit log"
ON public.travel_visa_audit_log
FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'l_and_d'));

CREATE POLICY "System can insert audit log"
ON public.travel_visa_audit_log
FOR INSERT
WITH CHECK (true);

-- RLS for visa requirements (read by all, manage by admin)
CREATE POLICY "Anyone can view visa requirements"
ON public.visa_requirements
FOR SELECT
USING (true);

CREATE POLICY "Admin can manage visa requirements"
ON public.visa_requirements
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_travel_visa_config_updated_at
BEFORE UPDATE ON public.travel_visa_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_travel_visa_requests_updated_at
BEFORE UPDATE ON public.travel_visa_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_visa_requirements_updated_at
BEFORE UPDATE ON public.visa_requirements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Insert default config
INSERT INTO public.travel_visa_config (config_name, is_active)
VALUES ('default', true);