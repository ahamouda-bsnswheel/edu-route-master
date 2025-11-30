import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InitiateTravelRequest {
  action: 'initiate';
  trainingRequestId?: string;
  sessionId?: string;
  enrollmentId?: string;
  employeeId: string;
  destinationCountry: string;
  destinationCity?: string;
  travelStartDate: string;
  travelEndDate: string;
  trainingStartDate: string;
  trainingEndDate: string;
  courseName: string;
}

interface BulkInitiateRequest {
  action: 'bulk_initiate';
  sessionId: string;
  participantIds: string[];
}

interface ManualLinkRequest {
  action: 'manual_link';
  travelVisaRequestId: string;
  travelRequestId?: string;
  visaRequestId?: string;
}

interface SyncStatusRequest {
  action: 'sync_status';
  travelVisaRequestIds?: string[];
}

interface GetCostsRequest {
  action: 'get_costs';
  travelRequestIds: string[];
}

type RequestBody = InitiateTravelRequest | BulkInitiateRequest | ManualLinkRequest | SyncStatusRequest | GetCostsRequest;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: RequestBody = await req.json();
    console.log('Travel/Visa request:', body.action, JSON.stringify(body));

    // Get integration config
    const { data: config } = await supabase
      .from('travel_visa_config')
      .select('*')
      .eq('is_active', true)
      .single();

    switch (body.action) {
      case 'initiate':
        return await handleInitiate(supabase, body as InitiateTravelRequest, user.id, config);
      
      case 'bulk_initiate':
        return await handleBulkInitiate(supabase, body as BulkInitiateRequest, user.id, config);
      
      case 'manual_link':
        return await handleManualLink(supabase, body as ManualLinkRequest, user.id);
      
      case 'sync_status':
        return await handleSyncStatus(supabase, body as SyncStatusRequest, config);
      
      case 'get_costs':
        return await handleGetCosts(supabase, body as GetCostsRequest, config);
      
      default:
        throw new Error('Invalid action');
    }
  } catch (error: unknown) {
    console.error('Error in manage-travel-visa:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleInitiate(
  supabase: any,
  body: InitiateTravelRequest,
  userId: string,
  config: any
) {
  // Check if travel request already exists
  const { data: existing } = await supabase
    .from('travel_visa_requests')
    .select('id, travel_request_id')
    .eq('employee_id', body.employeeId)
    .eq('training_request_id', body.trainingRequestId)
    .eq('is_active', true)
    .maybeSingle();

  if (existing?.travel_request_id) {
    return new Response(
      JSON.stringify({ 
        error: 'Travel already initiated',
        travelRequestId: existing.travel_request_id,
        id: existing.id
      }),
      { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check visa requirements
  const { data: profile } = await supabase
    .from('profiles')
    .select('nationality')
    .eq('id', body.employeeId)
    .single();

  const { data: visaReq } = await supabase
    .from('visa_requirements')
    .select('*')
    .eq('employee_nationality', profile?.nationality || 'SA')
    .eq('destination_country', body.destinationCountry)
    .maybeSingle();

  const visaRequired = visaReq?.visa_required ?? true;

  // Simulate external travel API call
  // In production, this would call the actual travel system API
  const externalTravelResult = await simulateExternalTravelApi(body, config);

  // Create or update travel visa request
  const travelVisaData = {
    training_request_id: body.trainingRequestId,
    session_id: body.sessionId,
    enrollment_id: body.enrollmentId,
    employee_id: body.employeeId,
    destination_country: body.destinationCountry,
    destination_city: body.destinationCity,
    travel_start_date: body.travelStartDate,
    travel_end_date: body.travelEndDate,
    training_start_date: body.trainingStartDate,
    training_end_date: body.trainingEndDate,
    travel_request_id: externalTravelResult.travelRequestId,
    travel_status: externalTravelResult.success ? 'requested' : 'not_initiated',
    travel_status_updated_at: new Date().toISOString(),
    visa_required: visaRequired,
    visa_status: visaRequired ? 'initiated' : 'not_required',
    visa_request_id: visaRequired ? externalTravelResult.visaRequestId : null,
    visa_status_updated_at: visaRequired ? new Date().toISOString() : null,
    initiation_method: 'lms',
    initiated_by: userId,
    initiated_at: new Date().toISOString(),
    external_data: externalTravelResult.externalData || {}
  };

  let result;
  if (existing) {
    const { data, error } = await supabase
      .from('travel_visa_requests')
      .update(travelVisaData)
      .eq('id', existing.id)
      .select()
      .single();
    
    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await supabase
      .from('travel_visa_requests')
      .insert(travelVisaData)
      .select()
      .single();
    
    if (error) throw error;
    result = data;
  }

  // Log audit
  await supabase.from('travel_visa_audit_log').insert({
    travel_visa_request_id: result.id,
    action: 'initiate',
    actor_id: userId,
    new_value: travelVisaData,
    external_request_id: externalTravelResult.travelRequestId,
    external_response: externalTravelResult
  });

  console.log('Travel initiated successfully:', result.id);

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: result,
      travelRequestId: externalTravelResult.travelRequestId,
      visaRequestId: externalTravelResult.visaRequestId
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleBulkInitiate(
  supabase: any,
  body: BulkInitiateRequest,
  userId: string,
  config: any
) {
  // Get session details
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select(`
      *,
      courses (
        id,
        name_en,
        abroad_country,
        abroad_city,
        training_location
      )
    `)
    .eq('id', body.sessionId)
    .single();

  if (sessionError || !session) {
    throw new Error('Session not found');
  }

  const results: any[] = [];
  const errors: any[] = [];

  for (const participantId of body.participantIds) {
    try {
      // Get enrollment
      const { data: enrollment } = await supabase
        .from('session_enrollments')
        .select('id')
        .eq('session_id', body.sessionId)
        .eq('employee_id', participantId)
        .maybeSingle();

      const initiateBody: InitiateTravelRequest = {
        action: 'initiate',
        sessionId: body.sessionId,
        enrollmentId: enrollment?.id,
        employeeId: participantId,
        destinationCountry: session.courses?.abroad_country || session.location_country || '',
        destinationCity: session.courses?.abroad_city || session.location_city,
        travelStartDate: session.start_date,
        travelEndDate: session.end_date,
        trainingStartDate: session.start_date,
        trainingEndDate: session.end_date,
        courseName: session.courses?.name_en || ''
      };

      const result = await handleInitiate(supabase, initiateBody, userId, config);
      const resultData = await result.json();
      
      if (result.ok) {
        results.push({ participantId, success: true, data: resultData });
      } else {
        errors.push({ participantId, success: false, error: resultData.error });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push({ participantId, success: false, error: message });
    }
  }

  // Log bulk operation
  await supabase.from('travel_visa_audit_log').insert({
    action: 'bulk_initiate',
    actor_id: userId,
    new_value: { sessionId: body.sessionId, participantCount: body.participantIds.length, successCount: results.length, errorCount: errors.length }
  });

  return new Response(
    JSON.stringify({ 
      success: true, 
      results,
      errors,
      summary: {
        total: body.participantIds.length,
        succeeded: results.length,
        failed: errors.length
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleManualLink(
  supabase: any,
  body: ManualLinkRequest,
  userId: string
) {
  const updateData: any = {
    initiation_method: 'external'
  };

  if (body.travelRequestId) {
    updateData.travel_request_id = body.travelRequestId;
    updateData.travel_status = 'requested';
    updateData.travel_status_updated_at = new Date().toISOString();
  }

  if (body.visaRequestId) {
    updateData.visa_request_id = body.visaRequestId;
    updateData.visa_status = 'submitted';
    updateData.visa_status_updated_at = new Date().toISOString();
  }

  const { data: existing } = await supabase
    .from('travel_visa_requests')
    .select('*')
    .eq('id', body.travelVisaRequestId)
    .single();

  const { data, error } = await supabase
    .from('travel_visa_requests')
    .update(updateData)
    .eq('id', body.travelVisaRequestId)
    .select()
    .single();

  if (error) throw error;

  await supabase.from('travel_visa_audit_log').insert({
    travel_visa_request_id: body.travelVisaRequestId,
    action: 'manual_link',
    actor_id: userId,
    old_value: existing,
    new_value: updateData,
    external_request_id: body.travelRequestId || body.visaRequestId
  });

  return new Response(
    JSON.stringify({ success: true, data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleSyncStatus(
  supabase: any,
  body: SyncStatusRequest,
  config: any
) {
  // Get all open travel requests needing sync
  let query = supabase
    .from('travel_visa_requests')
    .select('*')
    .eq('is_active', true)
    .not('travel_request_id', 'is', null)
    .in('travel_status', ['requested', 'approved']);

  if (body.travelVisaRequestIds?.length) {
    query = query.in('id', body.travelVisaRequestIds);
  }

  const { data: requests, error } = await query.limit(5000);

  if (error) throw error;

  const updates: any[] = [];

  for (const request of requests || []) {
    // Simulate status check from external system
    const statusResult = await simulateStatusCheck(request, config);
    
    if (statusResult.changed) {
      const updateData: any = {};
      
      if (statusResult.travelStatus && statusResult.travelStatus !== request.travel_status) {
        updateData.travel_status = statusResult.travelStatus;
        updateData.travel_status_updated_at = new Date().toISOString();
        if (statusResult.bookingReference) {
          updateData.travel_booking_reference = statusResult.bookingReference;
        }
        if (statusResult.ticketNumber) {
          updateData.travel_ticket_number = statusResult.ticketNumber;
        }
      }

      if (statusResult.visaStatus && statusResult.visaStatus !== request.visa_status) {
        updateData.visa_status = statusResult.visaStatus;
        updateData.visa_status_updated_at = new Date().toISOString();
        if (statusResult.visaNumber) {
          updateData.visa_number = statusResult.visaNumber;
        }
      }

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('travel_visa_requests')
          .update(updateData)
          .eq('id', request.id);

        await supabase.from('travel_visa_audit_log').insert({
          travel_visa_request_id: request.id,
          action: 'status_update',
          old_value: { travel_status: request.travel_status, visa_status: request.visa_status },
          new_value: updateData
        });

        updates.push({ id: request.id, ...updateData });
      }
    }
  }

  // Update last sync time
  await supabase
    .from('travel_visa_config')
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: 'success',
      last_sync_error: null
    })
    .eq('is_active', true);

  return new Response(
    JSON.stringify({ 
      success: true, 
      synced: requests?.length || 0,
      updated: updates.length,
      updates
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleGetCosts(
  supabase: any,
  body: GetCostsRequest,
  config: any
) {
  // Simulate fetching costs from external system
  const costData: any[] = [];

  for (const travelRequestId of body.travelRequestIds) {
    const cost = await simulateCostFetch(travelRequestId, config);
    
    if (cost) {
      // Update the record with cost data
      await supabase
        .from('travel_visa_requests')
        .update({
          travel_cost_amount: cost.travelCost,
          accommodation_cost: cost.accommodationCost,
          per_diem_amount: cost.perDiem,
          total_travel_cost: cost.totalCost,
          travel_cost_currency: cost.currency,
          cost_last_updated_at: new Date().toISOString()
        })
        .eq('travel_request_id', travelRequestId);

      costData.push({ travelRequestId, ...cost });
    }
  }

  return new Response(
    JSON.stringify({ success: true, costs: costData }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Simulation functions - replace with actual API calls in production
async function simulateExternalTravelApi(body: InitiateTravelRequest, config: any) {
  // Simulate latency
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Generate mock IDs
  const travelRequestId = `TR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  const visaRequestId = `VR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  return {
    success: true,
    travelRequestId,
    visaRequestId,
    externalData: {
      submittedAt: new Date().toISOString(),
      destination: `${body.destinationCity || ''}, ${body.destinationCountry}`,
      purpose: 'Training',
      courseName: body.courseName
    }
  };
}

async function simulateStatusCheck(request: any, config: any) {
  // Simulate random status progression
  const random = Math.random();
  
  let travelStatus = request.travel_status;
  let visaStatus = request.visa_status;
  let changed = false;

  // 20% chance of status change per sync
  if (random < 0.2) {
    if (travelStatus === 'requested') {
      travelStatus = 'approved';
      changed = true;
    } else if (travelStatus === 'approved') {
      travelStatus = 'ticketed';
      changed = true;
    }

    if (visaStatus === 'initiated' || visaStatus === 'submitted') {
      visaStatus = 'approved';
      changed = true;
    }
  }

  return {
    changed,
    travelStatus,
    visaStatus,
    bookingReference: changed && travelStatus === 'ticketed' ? `BK-${Math.random().toString(36).substr(2, 8).toUpperCase()}` : null,
    ticketNumber: changed && travelStatus === 'ticketed' ? `TKT-${Math.random().toString(36).substr(2, 10).toUpperCase()}` : null,
    visaNumber: changed && visaStatus === 'approved' ? `V-${Math.random().toString(36).substr(2, 8).toUpperCase()}` : null
  };
}

async function simulateCostFetch(travelRequestId: string, config: any) {
  // Simulate cost data
  const travelCost = Math.floor(Math.random() * 5000) + 1000;
  const accommodationCost = Math.floor(Math.random() * 3000) + 500;
  const perDiem = Math.floor(Math.random() * 1000) + 200;

  return {
    travelCost,
    accommodationCost,
    perDiem,
    totalCost: travelCost + accommodationCost + perDiem,
    currency: 'SAR'
  };
}