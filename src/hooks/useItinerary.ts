import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface FlightSegment {
  id?: string;
  itinerary_id?: string;
  segment_type: 'outbound' | 'return' | 'connection';
  segment_order: number;
  from_airport_code?: string;
  from_airport_name?: string;
  from_city?: string;
  to_airport_code?: string;
  to_airport_name?: string;
  to_city?: string;
  airline_name?: string;
  airline_code?: string;
  flight_number?: string;
  departure_datetime?: string;
  arrival_datetime?: string;
  pnr_number?: string;
  ticket_number?: string;
  booking_reference?: string;
  seat_number?: string;
  cabin_class?: string;
  data_source?: string;
  manually_edited?: boolean;
  edit_reason?: string;
}

export interface Accommodation {
  id?: string;
  itinerary_id?: string;
  hotel_name: string;
  hotel_address?: string;
  hotel_city?: string;
  hotel_country?: string;
  hotel_phone?: string;
  hotel_email?: string;
  hotel_website?: string;
  check_in_date?: string;
  check_in_time?: string;
  check_out_date?: string;
  check_out_time?: string;
  booking_reference?: string;
  confirmation_number?: string;
  room_type?: string;
  special_requests?: string;
  data_source?: string;
  manually_edited?: boolean;
  edit_reason?: string;
}

export interface GroundTransport {
  id?: string;
  itinerary_id?: string;
  transport_type: 'airport_pickup' | 'airport_dropoff' | 'hotel_shuttle' | 'venue_transfer' | 'other';
  pickup_datetime?: string;
  pickup_location?: string;
  dropoff_location?: string;
  driver_name?: string;
  driver_phone?: string;
  company_name?: string;
  company_phone?: string;
  vehicle_description?: string;
  meeting_point_description?: string;
  shuttle_id?: string;
  shuttle_route?: string;
  notes?: string;
  data_source?: string;
  manually_edited?: boolean;
}

export interface TravelItinerary {
  id: string;
  employee_id: string;
  training_request_id?: string;
  session_id?: string;
  travel_visa_request_id?: string;
  destination_country: string;
  destination_city?: string;
  status: 'draft' | 'confirmed' | 'completed' | 'cancelled';
  training_venue_name?: string;
  training_venue_address?: string;
  training_venue_map_url?: string;
  training_venue_contact_name?: string;
  training_venue_contact_phone?: string;
  training_venue_contact_email?: string;
  notes?: string;
  dietary_requirements?: string;
  mobility_needs?: string;
  safety_notes?: string;
  hse_instructions?: string;
  external_trip_id?: string;
  data_source: 'manual' | 'travel_system' | 'mixed';
  last_synced_at?: string;
  sync_status: 'not_synced' | 'synced' | 'sync_error' | 'partial';
  sync_error_message?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
  // Nested relations
  flight_segments?: FlightSegment[];
  accommodations?: Accommodation[];
  ground_transport?: GroundTransport[];
}

// Fetch itineraries for a session
export function useSessionItineraries(sessionId?: string) {
  return useQuery({
    queryKey: ['session-itineraries', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('travel_itineraries')
        .select(`
          *,
          flight_segments:itinerary_flight_segments(*),
          accommodations:itinerary_accommodations(*),
          ground_transport:itinerary_ground_transport(*)
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TravelItinerary[];
    },
    enabled: !!sessionId,
  });
}

// Fetch itinerary for an employee's training request
export function useEmployeeItinerary(employeeId?: string, trainingRequestId?: string) {
  return useQuery({
    queryKey: ['employee-itinerary', employeeId, trainingRequestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('travel_itineraries')
        .select(`
          *,
          flight_segments:itinerary_flight_segments(*),
          accommodations:itinerary_accommodations(*),
          ground_transport:itinerary_ground_transport(*)
        `)
        .eq('employee_id', employeeId)
        .eq('training_request_id', trainingRequestId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as TravelItinerary | null;
    },
    enabled: !!employeeId && !!trainingRequestId,
  });
}

// Fetch all itineraries for current employee
export function useMyItineraries(employeeId?: string) {
  return useQuery({
    queryKey: ['my-itineraries', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('travel_itineraries')
        .select(`
          *,
          flight_segments:itinerary_flight_segments(*),
          accommodations:itinerary_accommodations(*),
          ground_transport:itinerary_ground_transport(*)
        `)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TravelItinerary[];
    },
    enabled: !!employeeId,
  });
}

// Fetch single itinerary by ID
export function useItinerary(itineraryId?: string) {
  return useQuery({
    queryKey: ['itinerary', itineraryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('travel_itineraries')
        .select(`
          *,
          flight_segments:itinerary_flight_segments(*),
          accommodations:itinerary_accommodations(*),
          ground_transport:itinerary_ground_transport(*)
        `)
        .eq('id', itineraryId)
        .single();

      if (error) throw error;
      return data as TravelItinerary;
    },
    enabled: !!itineraryId,
  });
}

// Search itineraries (for logistics console)
export function useItinerarySearch(filters: {
  destination_country?: string;
  destination_city?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}) {
  return useQuery({
    queryKey: ['itinerary-search', filters],
    queryFn: async () => {
      let query = supabase
        .from('travel_itineraries')
        .select(`
          *,
          flight_segments:itinerary_flight_segments(*),
          accommodations:itinerary_accommodations(*)
        `);

      if (filters.destination_country) {
        query = query.eq('destination_country', filters.destination_country);
      }
      if (filters.destination_city) {
        query = query.eq('destination_city', filters.destination_city);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      query = query.order('created_at', { ascending: false }).limit(500);

      const { data, error } = await query;
      if (error) throw error;
      return data as TravelItinerary[];
    },
  });
}

// Create itinerary
export function useCreateItinerary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      itinerary: Partial<TravelItinerary>;
      flight_segments?: FlightSegment[];
      accommodations?: Accommodation[];
      ground_transport?: GroundTransport[];
    }) => {
      // Insert main itinerary
      const { data: itinerary, error: itineraryError } = await supabase
        .from('travel_itineraries')
        .insert(data.itinerary as any)
        .select()
        .single();

      if (itineraryError) throw itineraryError;

      const itineraryId = itinerary.id;

      // Insert flight segments
      if (data.flight_segments && data.flight_segments.length > 0) {
        const segments = data.flight_segments.map(seg => ({
          ...seg,
          itinerary_id: itineraryId,
        }));
        await supabase.from('itinerary_flight_segments').insert(segments as any);
      }

      // Insert accommodations
      if (data.accommodations && data.accommodations.length > 0) {
        const accommodations = data.accommodations.map(acc => ({
          ...acc,
          itinerary_id: itineraryId,
        }));
        await supabase.from('itinerary_accommodations').insert(accommodations as any);
      }

      // Insert ground transport
      if (data.ground_transport && data.ground_transport.length > 0) {
        const transport = data.ground_transport.map(t => ({
          ...t,
          itinerary_id: itineraryId,
        }));
        await supabase.from('itinerary_ground_transport').insert(transport as any);
      }

      return itinerary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-itineraries'] });
      queryClient.invalidateQueries({ queryKey: ['my-itineraries'] });
      queryClient.invalidateQueries({ queryKey: ['itinerary-search'] });
    },
  });
}

// Update itinerary
export function useUpdateItinerary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      itinerary_id: string;
      itinerary?: Partial<TravelItinerary>;
      flight_segments?: FlightSegment[];
      accommodations?: Accommodation[];
      ground_transport?: GroundTransport[];
    }) => {
      // Update main itinerary
      if (data.itinerary) {
        const { error } = await supabase
          .from('travel_itineraries')
          .update(data.itinerary as any)
          .eq('id', data.itinerary_id);

        if (error) throw error;
      }

      // Update flight segments (replace all)
      if (data.flight_segments !== undefined) {
        await supabase.from('itinerary_flight_segments').delete().eq('itinerary_id', data.itinerary_id);
        if (data.flight_segments.length > 0) {
          const segments = data.flight_segments.map(seg => ({
            ...seg,
            itinerary_id: data.itinerary_id,
          }));
          await supabase.from('itinerary_flight_segments').insert(segments as any);
        }
      }

      // Update accommodations (replace all)
      if (data.accommodations !== undefined) {
        await supabase.from('itinerary_accommodations').delete().eq('itinerary_id', data.itinerary_id);
        if (data.accommodations.length > 0) {
          const accommodations = data.accommodations.map(acc => ({
            ...acc,
            itinerary_id: data.itinerary_id,
          }));
          await supabase.from('itinerary_accommodations').insert(accommodations as any);
        }
      }

      // Update ground transport (replace all)
      if (data.ground_transport !== undefined) {
        await supabase.from('itinerary_ground_transport').delete().eq('itinerary_id', data.itinerary_id);
        if (data.ground_transport.length > 0) {
          const transport = data.ground_transport.map(t => ({
            ...t,
            itinerary_id: data.itinerary_id,
          }));
          await supabase.from('itinerary_ground_transport').insert(transport as any);
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-itineraries'] });
      queryClient.invalidateQueries({ queryKey: ['my-itineraries'] });
      queryClient.invalidateQueries({ queryKey: ['itinerary'] });
      queryClient.invalidateQueries({ queryKey: ['employee-itinerary'] });
    },
  });
}

// Add ground transport
export function useAddGroundTransport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transport: GroundTransport) => {
      const { data, error } = await supabase
        .from('itinerary_ground_transport')
        .insert(transport as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary'] });
      queryClient.invalidateQueries({ queryKey: ['session-itineraries'] });
    },
  });
}

// Status labels
export const itineraryStatusLabels: Record<string, string> = {
  draft: 'Draft',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const transportTypeLabels: Record<string, string> = {
  airport_pickup: 'Airport Pickup',
  airport_dropoff: 'Airport Drop-off',
  hotel_shuttle: 'Hotel Shuttle',
  venue_transfer: 'Venue Transfer',
  other: 'Other',
};
