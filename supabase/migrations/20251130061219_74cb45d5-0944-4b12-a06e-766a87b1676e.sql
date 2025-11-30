-- Create enum for incident types
CREATE TYPE public.incident_type AS ENUM (
  'flight_delay',
  'flight_cancellation',
  'missed_connection',
  'lost_baggage',
  'no_pickup',
  'wrong_pickup',
  'hotel_issue',
  'medical_incident',
  'accident_injury',
  'security_threat',
  'lost_stolen_documents',
  'weather_disruption',
  'strike_disruption',
  'political_event',
  'other'
);

-- Create enum for incident severity
CREATE TYPE public.incident_severity AS ENUM (
  'minor',
  'moderate',
  'major',
  'critical'
);

-- Create enum for training impact
CREATE TYPE public.training_impact AS ENUM (
  'none',
  'late_arrival',
  'missed_days',
  'complete_no_show',
  'session_cancelled',
  'session_postponed'
);

-- Create enum for incident status
CREATE TYPE public.incident_status AS ENUM (
  'open',
  'under_review',
  'resolved_no_impact',
  'resolved_training_adjusted',
  'escalated',
  'closed'
);

-- Create travel_incidents table
CREATE TABLE public.travel_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Related objects
  employee_id UUID NOT NULL,
  session_id UUID REFERENCES public.sessions(id),
  training_request_id UUID REFERENCES public.training_requests(id),
  travel_visa_request_id UUID REFERENCES public.travel_visa_requests(id),
  itinerary_id UUID REFERENCES public.travel_itineraries(id),
  
  -- Date/time and location
  incident_datetime TIMESTAMPTZ NOT NULL,
  incident_timezone VARCHAR(50) DEFAULT 'UTC',
  location_country VARCHAR(100),
  location_city VARCHAR(100),
  location_detail VARCHAR(255), -- airport, hotel name, venue, etc.
  
  -- Classification
  incident_type incident_type NOT NULL,
  secondary_type incident_type,
  severity incident_severity NOT NULL DEFAULT 'minor',
  training_impact training_impact NOT NULL DEFAULT 'none',
  days_missed INTEGER DEFAULT 0,
  
  -- Status and ownership
  status incident_status NOT NULL DEFAULT 'open',
  owner_role VARCHAR(50), -- 'travel', 'hse', 'l_and_d'
  assigned_to UUID,
  
  -- Description and notes
  description TEXT NOT NULL,
  internal_notes TEXT, -- L&D/Travel only
  confidential_notes TEXT, -- HSE/Senior HR only
  actions_taken TEXT,
  
  -- Root cause analysis
  root_cause TEXT,
  contributing_factors TEXT[],
  outcome TEXT,
  
  -- Follow-up
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_description TEXT,
  follow_up_due_date DATE,
  follow_up_completed BOOLEAN DEFAULT false,
  
  -- External references
  external_case_id VARCHAR(100), -- HSE system case ID
  travel_system_ref VARCHAR(100), -- Travel system reference
  
  -- Source tracking
  source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'employee_report', 'travel_integration', 'hse'
  
  -- Escalation
  escalated_to VARCHAR(100), -- 'risk', 'legal', 'executive'
  escalation_reason TEXT,
  escalated_at TIMESTAMPTZ,
  escalated_by UUID,
  
  -- Final resolution
  resolution_summary TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_days_missed CHECK (days_missed >= 0)
);

-- Create incident_attachments table
CREATE TABLE public.incident_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.travel_incidents(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  description TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID
);

-- Create incident_audit_log table
CREATE TABLE public.incident_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.travel_incidents(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  field_changed VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  actor_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_travel_incidents_employee ON public.travel_incidents(employee_id);
CREATE INDEX idx_travel_incidents_session ON public.travel_incidents(session_id);
CREATE INDEX idx_travel_incidents_status ON public.travel_incidents(status);
CREATE INDEX idx_travel_incidents_type ON public.travel_incidents(incident_type);
CREATE INDEX idx_travel_incidents_severity ON public.travel_incidents(severity);
CREATE INDEX idx_travel_incidents_datetime ON public.travel_incidents(incident_datetime);
CREATE INDEX idx_travel_incidents_location ON public.travel_incidents(location_country, location_city);
CREATE INDEX idx_incident_attachments_incident ON public.incident_attachments(incident_id);
CREATE INDEX idx_incident_audit_log_incident ON public.incident_audit_log(incident_id);

-- Enable RLS
ALTER TABLE public.travel_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for travel_incidents

-- Employees can view their own incidents
CREATE POLICY "Employees can view own incidents"
ON public.travel_incidents
FOR SELECT
USING (employee_id = auth.uid());

-- Employees can create incidents for themselves
CREATE POLICY "Employees can create own incidents"
ON public.travel_incidents
FOR INSERT
WITH CHECK (employee_id = auth.uid() AND source = 'employee_report');

-- Managers can view team incidents
CREATE POLICY "Managers can view team incidents"
ON public.travel_incidents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = travel_incidents.employee_id
    AND p.manager_id = auth.uid()
  )
);

-- L&D/Travel/HSE/HRBP/Admin can view all incidents
CREATE POLICY "L&D/Travel/HSE/HRBP/Admin can view all incidents"
ON public.travel_incidents
FOR SELECT
USING (
  has_role(auth.uid(), 'l_and_d') OR
  has_role(auth.uid(), 'hrbp') OR
  has_role(auth.uid(), 'chro') OR
  has_role(auth.uid(), 'admin')
);

-- L&D/Travel/HSE/Admin can manage incidents
CREATE POLICY "L&D/Travel/HSE/Admin can manage incidents"
ON public.travel_incidents
FOR ALL
USING (
  has_role(auth.uid(), 'l_and_d') OR
  has_role(auth.uid(), 'admin')
);

-- RLS Policies for incident_attachments

-- View attachments for accessible incidents
CREATE POLICY "View attachments for accessible incidents"
ON public.incident_attachments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.travel_incidents ti
    WHERE ti.id = incident_attachments.incident_id
    AND (
      ti.employee_id = auth.uid() OR
      has_role(auth.uid(), 'l_and_d') OR
      has_role(auth.uid(), 'hrbp') OR
      has_role(auth.uid(), 'admin') OR
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = ti.employee_id AND p.manager_id = auth.uid()
      )
    )
  )
);

-- L&D/Admin can manage attachments
CREATE POLICY "L&D/Admin can manage attachments"
ON public.incident_attachments
FOR ALL
USING (
  has_role(auth.uid(), 'l_and_d') OR
  has_role(auth.uid(), 'admin')
);

-- Employees can upload attachments to own incidents
CREATE POLICY "Employees can upload attachments to own incidents"
ON public.incident_attachments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.travel_incidents ti
    WHERE ti.id = incident_attachments.incident_id
    AND ti.employee_id = auth.uid()
  )
);

-- RLS Policies for incident_audit_log

-- L&D/HSE/Admin can view audit logs
CREATE POLICY "L&D/HSE/Admin can view incident audit logs"
ON public.incident_audit_log
FOR SELECT
USING (
  has_role(auth.uid(), 'l_and_d') OR
  has_role(auth.uid(), 'admin')
);

-- System can insert audit logs
CREATE POLICY "System can insert incident audit logs"
ON public.incident_audit_log
FOR INSERT
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_travel_incidents_updated_at
BEFORE UPDATE ON public.travel_incidents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();