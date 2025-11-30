import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IncidentRequest {
  action: 'create' | 'update' | 'get' | 'list' | 'export' | 'emergency_view';
  incident_id?: string;
  employee_id?: string;
  session_id?: string;
  data?: any;
  filters?: {
    status?: string[];
    severity?: string[];
    incident_type?: string[];
    date_from?: string;
    date_to?: string;
    location_country?: string;
    location_city?: string;
    training_impact?: string[];
    owner_role?: string;
  };
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
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    const body: IncidentRequest = await req.json();
    const { action, incident_id, employee_id, session_id, data, filters, access_reason } = body;

    console.log(`[manage-incident] Action: ${action}, User: ${userId}`);

    switch (action) {
      case 'create':
        return await createIncident(supabase, userId, data);
      case 'update':
        return await updateIncident(supabase, userId, incident_id!, data);
      case 'get':
        return await getIncident(supabase, userId, incident_id, employee_id, session_id);
      case 'list':
        return await listIncidents(supabase, userId, filters, session_id, employee_id);
      case 'export':
        return await exportIncidents(supabase, userId, filters);
      case 'emergency_view':
        return await emergencyView(supabase, userId, filters, access_reason);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('[manage-incident] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createIncident(supabase: any, userId: string | null, data: any) {
  const incidentData = {
    ...data,
    created_by: userId,
    created_at: new Date().toISOString(),
  };

  const { data: incident, error } = await supabase
    .from('travel_incidents')
    .insert(incidentData)
    .select()
    .single();

  if (error) {
    console.error('[manage-incident] Create error:', error);
    throw error;
  }

  // Log creation
  await supabase.from('incident_audit_log').insert({
    incident_id: incident.id,
    action: 'created',
    new_value: JSON.stringify(incidentData),
    actor_id: userId,
  });

  console.log(`[manage-incident] Created incident: ${incident.id}`);

  return new Response(JSON.stringify({ success: true, incident }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function updateIncident(supabase: any, userId: string | null, incidentId: string, data: any) {
  // Get current incident for audit
  const { data: currentIncident } = await supabase
    .from('travel_incidents')
    .select('*')
    .eq('id', incidentId)
    .single();

  const updateData = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  // Handle status transitions
  if (data.status && ['resolved_no_impact', 'resolved_training_adjusted', 'closed'].includes(data.status)) {
    if (!updateData.resolved_at) {
      updateData.resolved_at = new Date().toISOString();
      updateData.resolved_by = userId;
    }
  }

  if (data.status === 'escalated' && data.escalated_to) {
    updateData.escalated_at = new Date().toISOString();
    updateData.escalated_by = userId;
  }

  const { data: incident, error } = await supabase
    .from('travel_incidents')
    .update(updateData)
    .eq('id', incidentId)
    .select()
    .single();

  if (error) {
    console.error('[manage-incident] Update error:', error);
    throw error;
  }

  // Log changes
  const changedFields = Object.keys(data);
  for (const field of changedFields) {
    if (currentIncident && currentIncident[field] !== data[field]) {
      await supabase.from('incident_audit_log').insert({
        incident_id: incidentId,
        action: 'updated',
        field_changed: field,
        old_value: String(currentIncident[field] || ''),
        new_value: String(data[field] || ''),
        actor_id: userId,
      });
    }
  }

  console.log(`[manage-incident] Updated incident: ${incidentId}`);

  return new Response(JSON.stringify({ success: true, incident }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getIncident(supabase: any, userId: string | null, incidentId?: string, employeeId?: string, sessionId?: string) {
  let query = supabase.from('travel_incidents').select(`
    *,
    attachments:incident_attachments(*)
  `);

  if (incidentId) {
    query = query.eq('id', incidentId);
  } else if (employeeId && sessionId) {
    query = query.eq('employee_id', employeeId).eq('session_id', sessionId);
  } else {
    throw new Error('Either incident_id or employee_id+session_id required');
  }

  const { data: incidents, error } = await query;

  if (error) {
    console.error('[manage-incident] Get error:', error);
    throw error;
  }

  // Log view access
  if (incidents && incidents.length > 0) {
    await supabase.from('incident_audit_log').insert({
      incident_id: incidents[0].id,
      action: 'viewed',
      actor_id: userId,
    });
  }

  return new Response(JSON.stringify({ success: true, incidents }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function listIncidents(supabase: any, userId: string | null, filters?: any, sessionId?: string, employeeId?: string) {
  let query = supabase.from('travel_incidents').select(`
    *,
    attachments:incident_attachments(id, file_name)
  `).order('incident_datetime', { ascending: false });

  if (sessionId) {
    query = query.eq('session_id', sessionId);
  }

  if (employeeId) {
    query = query.eq('employee_id', employeeId);
  }

  if (filters) {
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }
    if (filters.severity && filters.severity.length > 0) {
      query = query.in('severity', filters.severity);
    }
    if (filters.incident_type && filters.incident_type.length > 0) {
      query = query.in('incident_type', filters.incident_type);
    }
    if (filters.training_impact && filters.training_impact.length > 0) {
      query = query.in('training_impact', filters.training_impact);
    }
    if (filters.date_from) {
      query = query.gte('incident_datetime', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('incident_datetime', filters.date_to);
    }
    if (filters.location_country) {
      query = query.eq('location_country', filters.location_country);
    }
    if (filters.location_city) {
      query = query.eq('location_city', filters.location_city);
    }
    if (filters.owner_role) {
      query = query.eq('owner_role', filters.owner_role);
    }
  }

  const { data: incidents, error } = await query.limit(1000);

  if (error) {
    console.error('[manage-incident] List error:', error);
    throw error;
  }

  // Log list access
  await supabase.from('incident_audit_log').insert({
    incident_id: null,
    action: 'list_viewed',
    new_value: JSON.stringify({ filters, sessionId, employeeId, count: incidents?.length || 0 }),
    actor_id: userId,
  });

  return new Response(JSON.stringify({ success: true, incidents }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function exportIncidents(supabase: any, userId: string | null, filters?: any) {
  let query = supabase.from('travel_incidents').select(`
    id,
    employee_id,
    session_id,
    incident_datetime,
    incident_timezone,
    location_country,
    location_city,
    location_detail,
    incident_type,
    secondary_type,
    severity,
    training_impact,
    days_missed,
    status,
    owner_role,
    description,
    actions_taken,
    root_cause,
    outcome,
    source,
    created_at,
    resolved_at
  `).order('incident_datetime', { ascending: false });

  if (filters) {
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }
    if (filters.severity && filters.severity.length > 0) {
      query = query.in('severity', filters.severity);
    }
    if (filters.incident_type && filters.incident_type.length > 0) {
      query = query.in('incident_type', filters.incident_type);
    }
    if (filters.date_from) {
      query = query.gte('incident_datetime', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('incident_datetime', filters.date_to);
    }
    if (filters.location_country) {
      query = query.eq('location_country', filters.location_country);
    }
  }

  const { data: incidents, error } = await query.limit(10000);

  if (error) {
    console.error('[manage-incident] Export error:', error);
    throw error;
  }

  // Log export
  await supabase.from('incident_audit_log').insert({
    incident_id: null,
    action: 'exported',
    new_value: JSON.stringify({ filters, count: incidents?.length || 0 }),
    actor_id: userId,
  });

  console.log(`[manage-incident] Exported ${incidents?.length || 0} incidents`);

  return new Response(JSON.stringify({ success: true, incidents }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function emergencyView(supabase: any, userId: string | null, filters?: any, accessReason?: string) {
  if (!accessReason) {
    throw new Error('Access reason is required for emergency view');
  }

  let query = supabase.from('travel_incidents').select(`
    id,
    employee_id,
    incident_datetime,
    location_country,
    location_city,
    location_detail,
    incident_type,
    severity,
    status,
    description
  `);

  // Filter for active/recent incidents
  if (filters) {
    if (filters.location_country) {
      query = query.eq('location_country', filters.location_country);
    }
    if (filters.location_city) {
      query = query.eq('location_city', filters.location_city);
    }
    if (filters.date_from) {
      query = query.gte('incident_datetime', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('incident_datetime', filters.date_to);
    }
  }

  // Only show non-closed incidents by default
  query = query.not('status', 'eq', 'closed');

  const { data: incidents, error } = await query.order('incident_datetime', { ascending: false }).limit(500);

  if (error) {
    console.error('[manage-incident] Emergency view error:', error);
    throw error;
  }

  // Log emergency access with reason
  await supabase.from('incident_audit_log').insert({
    incident_id: null,
    action: 'emergency_view_accessed',
    reason: accessReason,
    new_value: JSON.stringify({ filters, count: incidents?.length || 0 }),
    actor_id: userId,
  });

  console.log(`[manage-incident] Emergency view accessed by ${userId}, reason: ${accessReason}`);

  return new Response(JSON.stringify({ success: true, incidents }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
