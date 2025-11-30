import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ItineraryRequest {
  action: 'create' | 'update' | 'get' | 'list' | 'sync' | 'export' | 'emergency_access';
  itinerary_id?: string;
  employee_id?: string;
  session_id?: string;
  training_request_id?: string;
  destination_country?: string;
  destination_city?: string;
  date_from?: string;
  date_to?: string;
  status?: string;
  itinerary_data?: any;
  flight_segments?: any[];
  accommodations?: any[];
  ground_transport?: any[];
  filters?: Record<string, any>;
  access_reason?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const body: ItineraryRequest = await req.json();
    console.log('Itinerary request:', body.action, body);

    const { action } = body;

    switch (action) {
      case 'create':
        return await createItinerary(supabase, body, userId);
      case 'update':
        return await updateItinerary(supabase, body, userId);
      case 'get':
        return await getItinerary(supabase, body, userId);
      case 'list':
        return await listItineraries(supabase, body, userId);
      case 'export':
        return await exportItineraries(supabase, body, userId);
      case 'emergency_access':
        return await emergencyAccess(supabase, body, userId);
      default:
        return new Response(JSON.stringify({ success: false, error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (err) {
    const error = err as Error;
    console.error('Itinerary error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// deno-lint-ignore no-explicit-any
async function createItinerary(supabase: any, request: ItineraryRequest, userId: string | null) {
  const { itinerary_data, flight_segments, accommodations, ground_transport } = request;

  // Create main itinerary
  const { data: itinerary, error: itineraryError } = await supabase
    .from('travel_itineraries')
    .insert({
      ...itinerary_data,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();

  if (itineraryError) {
    console.error('Error creating itinerary:', itineraryError);
    return new Response(JSON.stringify({ success: false, error: itineraryError.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Add flight segments
  if (flight_segments && flight_segments.length > 0) {
    const segmentsWithItinerary = flight_segments.map((seg: any) => ({
      ...seg,
      itinerary_id: itinerary.id,
    }));
    await supabase.from('itinerary_flight_segments').insert(segmentsWithItinerary);
  }

  // Add accommodations
  if (accommodations && accommodations.length > 0) {
    const accommodationsWithItinerary = accommodations.map((acc: any) => ({
      ...acc,
      itinerary_id: itinerary.id,
    }));
    await supabase.from('itinerary_accommodations').insert(accommodationsWithItinerary);
  }

  // Add ground transport
  if (ground_transport && ground_transport.length > 0) {
    const transportWithItinerary = ground_transport.map((trans: any) => ({
      ...trans,
      itinerary_id: itinerary.id,
    }));
    await supabase.from('itinerary_ground_transport').insert(transportWithItinerary);
  }

  // Log the creation
  await supabase.from('itinerary_audit_log').insert({
    itinerary_id: itinerary.id,
    employee_id: itinerary_data.employee_id,
    session_id: itinerary_data.session_id,
    action: 'create',
    action_details: 'Itinerary created',
    actor_id: userId,
  });

  return new Response(JSON.stringify({ success: true, itinerary }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// deno-lint-ignore no-explicit-any
async function updateItinerary(supabase: any, request: ItineraryRequest, userId: string | null) {
  const { itinerary_id, itinerary_data, flight_segments, accommodations, ground_transport } = request;

  if (!itinerary_id) {
    return new Response(JSON.stringify({ success: false, error: 'itinerary_id required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Update main itinerary
  if (itinerary_data) {
    const { error } = await supabase
      .from('travel_itineraries')
      .update({
        ...itinerary_data,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itinerary_id);

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // Update flight segments (replace all)
  if (flight_segments) {
    await supabase.from('itinerary_flight_segments').delete().eq('itinerary_id', itinerary_id);
    if (flight_segments.length > 0) {
      const segmentsWithItinerary = flight_segments.map((seg: any) => ({
        ...seg,
        itinerary_id,
      }));
      await supabase.from('itinerary_flight_segments').insert(segmentsWithItinerary);
    }
  }

  // Update accommodations (replace all)
  if (accommodations) {
    await supabase.from('itinerary_accommodations').delete().eq('itinerary_id', itinerary_id);
    if (accommodations.length > 0) {
      const accommodationsWithItinerary = accommodations.map((acc: any) => ({
        ...acc,
        itinerary_id,
      }));
      await supabase.from('itinerary_accommodations').insert(accommodationsWithItinerary);
    }
  }

  // Update ground transport (replace all)
  if (ground_transport) {
    await supabase.from('itinerary_ground_transport').delete().eq('itinerary_id', itinerary_id);
    if (ground_transport.length > 0) {
      const transportWithItinerary = ground_transport.map((trans: any) => ({
        ...trans,
        itinerary_id,
      }));
      await supabase.from('itinerary_ground_transport').insert(transportWithItinerary);
    }
  }

  // Log the update
  await supabase.from('itinerary_audit_log').insert({
    itinerary_id,
    action: 'edit',
    action_details: 'Itinerary updated',
    actor_id: userId,
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// deno-lint-ignore no-explicit-any
async function getItinerary(supabase: any, request: ItineraryRequest, userId: string | null) {
  const { itinerary_id, employee_id, training_request_id, session_id } = request;

  let query = supabase
    .from('travel_itineraries')
    .select(`
      *,
      flight_segments:itinerary_flight_segments(*),
      accommodations:itinerary_accommodations(*),
      ground_transport:itinerary_ground_transport(*)
    `);

  if (itinerary_id) {
    query = query.eq('id', itinerary_id);
  } else if (employee_id && training_request_id) {
    query = query.eq('employee_id', employee_id).eq('training_request_id', training_request_id);
  } else if (employee_id && session_id) {
    query = query.eq('employee_id', employee_id).eq('session_id', session_id);
  } else {
    return new Response(JSON.stringify({ success: false, error: 'Identifier required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await query.single();

  if (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Log the view
  await supabase.from('itinerary_audit_log').insert({
    itinerary_id: data.id,
    employee_id: data.employee_id,
    session_id: data.session_id,
    action: 'view',
    action_details: 'Itinerary viewed',
    actor_id: userId,
  });

  return new Response(JSON.stringify({ success: true, itinerary: data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// deno-lint-ignore no-explicit-any
async function listItineraries(supabase: any, request: ItineraryRequest, userId: string | null) {
  const { session_id, destination_country, destination_city, date_from, date_to, status, filters } = request;

  let query = supabase
    .from('travel_itineraries')
    .select(`
      *,
      flight_segments:itinerary_flight_segments(*),
      accommodations:itinerary_accommodations(*),
      ground_transport:itinerary_ground_transport(*)
    `);

  if (session_id) {
    query = query.eq('session_id', session_id);
  }
  if (destination_country) {
    query = query.eq('destination_country', destination_country);
  }
  if (destination_city) {
    query = query.eq('destination_city', destination_city);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (filters?.employee_id) {
    query = query.eq('employee_id', filters.employee_id);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true, itineraries: data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// deno-lint-ignore no-explicit-any
async function exportItineraries(supabase: any, request: ItineraryRequest, userId: string | null) {
  const { session_id, destination_country, date_from, date_to, filters } = request;

  let query = supabase
    .from('travel_itineraries')
    .select(`
      id,
      employee_id,
      destination_country,
      destination_city,
      status,
      training_venue_name,
      training_venue_address,
      created_at,
      flight_segments:itinerary_flight_segments(
        segment_type,
        from_city,
        to_city,
        airline_name,
        flight_number,
        departure_datetime,
        arrival_datetime
      ),
      accommodations:itinerary_accommodations(
        hotel_name,
        hotel_address,
        check_in_date,
        check_out_date
      )
    `);

  if (session_id) {
    query = query.eq('session_id', session_id);
  }
  if (destination_country) {
    query = query.eq('destination_country', destination_country);
  }

  const { data, error } = await query.limit(10000);

  if (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Log the export
  await supabase.from('itinerary_audit_log').insert({
    action: 'export',
    action_details: `Exported ${data?.length || 0} itineraries`,
    filters_used: { session_id, destination_country, date_from, date_to, ...filters },
    export_row_count: data?.length || 0,
    actor_id: userId,
  });

  return new Response(JSON.stringify({ success: true, data, count: data?.length || 0 }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// deno-lint-ignore no-explicit-any
async function emergencyAccess(supabase: any, request: ItineraryRequest, userId: string | null) {
  const { destination_country, destination_city, date_from, date_to, access_reason } = request;

  if (!access_reason) {
    return new Response(JSON.stringify({ success: false, error: 'Access reason required for emergency access' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get itineraries with minimal but critical data for emergency
  let query = supabase
    .from('travel_itineraries')
    .select(`
      id,
      employee_id,
      destination_country,
      destination_city,
      status,
      training_venue_name,
      training_venue_address,
      training_venue_contact_phone,
      safety_notes,
      hse_instructions,
      flight_segments:itinerary_flight_segments(
        segment_type,
        departure_datetime,
        arrival_datetime,
        from_city,
        to_city
      ),
      accommodations:itinerary_accommodations(
        hotel_name,
        hotel_address,
        hotel_phone,
        check_in_date,
        check_out_date
      )
    `)
    .in('status', ['confirmed', 'draft']);

  if (destination_country) {
    query = query.eq('destination_country', destination_country);
  }
  if (destination_city) {
    query = query.eq('destination_city', destination_city);
  }

  const { data, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Log emergency access with details
  await supabase.from('itinerary_audit_log').insert({
    action: 'emergency_access',
    action_details: `Emergency access: ${access_reason}`,
    filters_used: { destination_country, destination_city, date_from, date_to },
    export_row_count: data?.length || 0,
    actor_id: userId,
    access_reason,
  });

  return new Response(JSON.stringify({ success: true, itineraries: data, count: data?.length || 0 }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
