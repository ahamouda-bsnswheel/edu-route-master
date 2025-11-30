-- =============================================
-- Feature HR-LMS-01.05-F03: Logistics Itinerary Repository
-- =============================================

-- Main itinerary record (per participant per training trip)
CREATE TABLE public.travel_itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  training_request_id UUID REFERENCES public.training_requests(id),
  session_id UUID REFERENCES public.sessions(id),
  travel_visa_request_id UUID REFERENCES public.travel_visa_requests(id),
  
  -- Destination info
  destination_country VARCHAR NOT NULL,
  destination_city VARCHAR,
  
  -- Status
  status VARCHAR NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'completed', 'cancelled')),
  
  -- Training venue info
  training_venue_name VARCHAR,
  training_venue_address TEXT,
  training_venue_map_url TEXT,
  training_venue_contact_name VARCHAR,
  training_venue_contact_phone VARCHAR,
  training_venue_contact_email VARCHAR,
  
  -- Special instructions
  notes TEXT,
  dietary_requirements TEXT,
  mobility_needs TEXT,
  safety_notes TEXT,
  hse_instructions TEXT,
  
  -- Integration tracking
  external_trip_id VARCHAR,
  data_source VARCHAR DEFAULT 'manual' CHECK (data_source IN ('manual', 'travel_system', 'mixed')),
  last_synced_at TIMESTAMPTZ,
  sync_status VARCHAR DEFAULT 'not_synced' CHECK (sync_status IN ('not_synced', 'synced', 'sync_error', 'partial')),
  sync_error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

-- Flight segments (0..n per itinerary)
CREATE TABLE public.itinerary_flight_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES public.travel_itineraries(id) ON DELETE CASCADE,
  
  -- Segment type
  segment_type VARCHAR NOT NULL DEFAULT 'outbound' CHECK (segment_type IN ('outbound', 'return', 'connection')),
  segment_order INTEGER NOT NULL DEFAULT 1,
  
  -- Flight details
  from_airport_code VARCHAR,
  from_airport_name VARCHAR,
  from_city VARCHAR,
  to_airport_code VARCHAR,
  to_airport_name VARCHAR,
  to_city VARCHAR,
  
  airline_name VARCHAR,
  airline_code VARCHAR,
  flight_number VARCHAR,
  
  departure_datetime TIMESTAMPTZ,
  arrival_datetime TIMESTAMPTZ,
  
  -- Booking info (sensitive)
  pnr_number VARCHAR,
  ticket_number VARCHAR,
  booking_reference VARCHAR,
  seat_number VARCHAR,
  cabin_class VARCHAR,
  
  -- Source tracking
  data_source VARCHAR DEFAULT 'manual',
  manually_edited BOOLEAN DEFAULT false,
  edit_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Accommodation records (0..n per itinerary, usually 1 per city)
CREATE TABLE public.itinerary_accommodations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES public.travel_itineraries(id) ON DELETE CASCADE,
  
  -- Hotel details
  hotel_name VARCHAR NOT NULL,
  hotel_address TEXT,
  hotel_city VARCHAR,
  hotel_country VARCHAR,
  hotel_phone VARCHAR,
  hotel_email VARCHAR,
  hotel_website VARCHAR,
  
  -- Booking details
  check_in_date DATE,
  check_in_time TIME,
  check_out_date DATE,
  check_out_time TIME,
  
  booking_reference VARCHAR,
  confirmation_number VARCHAR,
  room_type VARCHAR,
  
  -- Special requests
  special_requests TEXT,
  
  -- Source tracking
  data_source VARCHAR DEFAULT 'manual',
  manually_edited BOOLEAN DEFAULT false,
  edit_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ground transport arrangements
CREATE TABLE public.itinerary_ground_transport (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES public.travel_itineraries(id) ON DELETE CASCADE,
  
  -- Transport type
  transport_type VARCHAR NOT NULL DEFAULT 'airport_pickup' 
    CHECK (transport_type IN ('airport_pickup', 'airport_dropoff', 'hotel_shuttle', 'venue_transfer', 'other')),
  
  -- Details
  pickup_datetime TIMESTAMPTZ,
  pickup_location TEXT,
  dropoff_location TEXT,
  
  -- Driver/Company info
  driver_name VARCHAR,
  driver_phone VARCHAR,
  company_name VARCHAR,
  company_phone VARCHAR,
  vehicle_description VARCHAR,
  
  -- Meeting point
  meeting_point_description TEXT,
  
  -- Shuttle/Group assignment
  shuttle_id VARCHAR,
  shuttle_route VARCHAR,
  
  -- Notes
  notes TEXT,
  
  -- Source tracking
  data_source VARCHAR DEFAULT 'manual',
  manually_edited BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Audit log for itinerary access (security requirement)
CREATE TABLE public.itinerary_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID REFERENCES public.travel_itineraries(id),
  employee_id UUID,
  session_id UUID,
  
  action VARCHAR NOT NULL, -- 'view', 'export', 'edit', 'create', 'delete', 'emergency_access'
  action_details TEXT,
  
  -- What was accessed
  fields_accessed TEXT[],
  filters_used JSONB,
  export_row_count INTEGER,
  
  -- Actor info
  actor_id UUID,
  actor_role VARCHAR,
  access_reason TEXT,
  
  -- Request info
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_travel_itineraries_employee ON public.travel_itineraries(employee_id);
CREATE INDEX idx_travel_itineraries_session ON public.travel_itineraries(session_id);
CREATE INDEX idx_travel_itineraries_training_request ON public.travel_itineraries(training_request_id);
CREATE INDEX idx_travel_itineraries_status ON public.travel_itineraries(status);
CREATE INDEX idx_travel_itineraries_destination ON public.travel_itineraries(destination_country, destination_city);
CREATE INDEX idx_flight_segments_itinerary ON public.itinerary_flight_segments(itinerary_id);
CREATE INDEX idx_accommodations_itinerary ON public.itinerary_accommodations(itinerary_id);
CREATE INDEX idx_ground_transport_itinerary ON public.itinerary_ground_transport(itinerary_id);
CREATE INDEX idx_itinerary_audit_actor ON public.itinerary_audit_log(actor_id);
CREATE INDEX idx_itinerary_audit_created ON public.itinerary_audit_log(created_at);

-- Enable RLS
ALTER TABLE public.travel_itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_flight_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_ground_transport ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for travel_itineraries
CREATE POLICY "Employees view own itineraries"
  ON public.travel_itineraries FOR SELECT
  USING (employee_id = auth.uid());

CREATE POLICY "Managers view team itineraries"
  ON public.travel_itineraries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = travel_itineraries.employee_id 
    AND p.manager_id = auth.uid()
  ));

CREATE POLICY "L&D/Travel/HSE view all itineraries"
  ON public.travel_itineraries FOR SELECT
  USING (
    has_role(auth.uid(), 'l_and_d') OR 
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'hrbp') OR
    has_role(auth.uid(), 'chro')
  );

CREATE POLICY "L&D/Travel can manage itineraries"
  ON public.travel_itineraries FOR ALL
  USING (
    has_role(auth.uid(), 'l_and_d') OR 
    has_role(auth.uid(), 'admin')
  );

-- RLS for flight segments
CREATE POLICY "View flight segments for accessible itineraries"
  ON public.itinerary_flight_segments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM travel_itineraries ti
    WHERE ti.id = itinerary_flight_segments.itinerary_id
    AND (
      ti.employee_id = auth.uid() OR
      has_role(auth.uid(), 'l_and_d') OR
      has_role(auth.uid(), 'admin') OR
      has_role(auth.uid(), 'hrbp') OR
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = ti.employee_id AND p.manager_id = auth.uid())
    )
  ));

CREATE POLICY "L&D/Travel manage flight segments"
  ON public.itinerary_flight_segments FOR ALL
  USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- RLS for accommodations
CREATE POLICY "View accommodations for accessible itineraries"
  ON public.itinerary_accommodations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM travel_itineraries ti
    WHERE ti.id = itinerary_accommodations.itinerary_id
    AND (
      ti.employee_id = auth.uid() OR
      has_role(auth.uid(), 'l_and_d') OR
      has_role(auth.uid(), 'admin') OR
      has_role(auth.uid(), 'hrbp') OR
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = ti.employee_id AND p.manager_id = auth.uid())
    )
  ));

CREATE POLICY "L&D/Travel manage accommodations"
  ON public.itinerary_accommodations FOR ALL
  USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- RLS for ground transport
CREATE POLICY "View ground transport for accessible itineraries"
  ON public.itinerary_ground_transport FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM travel_itineraries ti
    WHERE ti.id = itinerary_ground_transport.itinerary_id
    AND (
      ti.employee_id = auth.uid() OR
      has_role(auth.uid(), 'l_and_d') OR
      has_role(auth.uid(), 'admin') OR
      has_role(auth.uid(), 'hrbp') OR
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = ti.employee_id AND p.manager_id = auth.uid())
    )
  ));

CREATE POLICY "L&D/Travel manage ground transport"
  ON public.itinerary_ground_transport FOR ALL
  USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- RLS for audit log
CREATE POLICY "L&D/Admin view audit logs"
  ON public.itinerary_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs"
  ON public.itinerary_audit_log FOR INSERT
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_travel_itineraries_updated_at
  BEFORE UPDATE ON public.travel_itineraries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_flight_segments_updated_at
  BEFORE UPDATE ON public.itinerary_flight_segments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_accommodations_updated_at
  BEFORE UPDATE ON public.itinerary_accommodations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_ground_transport_updated_at
  BEFORE UPDATE ON public.itinerary_ground_transport
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();