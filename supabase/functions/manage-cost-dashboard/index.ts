import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DashboardRequest {
  action: 'get_dashboard_summary' | 'get_entity_costs' | 'get_provider_costs' | 
          'get_destination_costs' | 'get_budgets' | 'save_budget' | 'import_budgets' |
          'activate_budget' | 'get_thresholds' | 'save_threshold' | 'get_anomalies' |
          'review_anomaly' | 'get_anomaly_rules' | 'save_anomaly_rule' |
          'refresh_analytics' | 'export_costs' | 'check_budget_impact' | 'get_budget_audit';
  filters?: {
    fiscalYear?: number;
    periodType?: string;
    quarter?: number;
    month?: number;
    startDate?: string;
    endDate?: string;
    entity?: string;
    costCentre?: string;
    category?: string;
    providerId?: string;
    destination?: string;
    isAbroad?: boolean;
  };
  budgetId?: string;
  budget?: any;
  budgets?: any[];
  thresholdId?: string;
  threshold?: any;
  anomalyId?: string;
  ruleId?: string;
  rule?: any;
  reviewNotes?: string;
  reviewStatus?: string;
  exportType?: string;
  estimatedCost?: number;
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

    const body: DashboardRequest = await req.json();
    const { action } = body;

    console.log(`[manage-cost-dashboard] Action: ${action}, User: ${userId}`);

    switch (action) {
      case 'get_dashboard_summary':
        return await getDashboardSummary(supabase, body);
      case 'get_entity_costs':
        return await getEntityCosts(supabase, body);
      case 'get_provider_costs':
        return await getProviderCosts(supabase, body);
      case 'get_destination_costs':
        return await getDestinationCosts(supabase, body);
      case 'get_budgets':
        return await getBudgets(supabase, body);
      case 'save_budget':
        return await saveBudget(supabase, body, userId);
      case 'import_budgets':
        return await importBudgets(supabase, body, userId);
      case 'activate_budget':
        return await activateBudget(supabase, body, userId);
      case 'get_thresholds':
        return await getThresholds(supabase);
      case 'save_threshold':
        return await saveThreshold(supabase, body, userId);
      case 'get_anomalies':
        return await getAnomalies(supabase, body);
      case 'review_anomaly':
        return await reviewAnomaly(supabase, body, userId);
      case 'get_anomaly_rules':
        return await getAnomalyRules(supabase);
      case 'save_anomaly_rule':
        return await saveAnomalyRule(supabase, body, userId);
      case 'refresh_analytics':
        return await refreshAnalytics(supabase, body, userId);
      case 'export_costs':
        return await exportCosts(supabase, body, userId);
      case 'check_budget_impact':
        return await checkBudgetImpact(supabase, body);
      case 'get_budget_audit':
        return await getBudgetAudit(supabase, body);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('[manage-cost-dashboard] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getDashboardSummary(supabase: any, body: DashboardRequest) {
  const { filters } = body;
  const year = filters?.fiscalYear || new Date().getFullYear();

  // Get cost analytics aggregated
  let query = supabase
    .from('cost_analytics')
    .select('*')
    .eq('period_year', year);

  if (filters?.entity) query = query.eq('entity', filters.entity);
  if (filters?.category) query = query.eq('training_category', filters.category);

  const { data: analytics, error: analyticsError } = await query;
  if (analyticsError) throw analyticsError;

  // Get budgets for comparison
  const { data: budgets, error: budgetError } = await supabase
    .from('training_budgets')
    .select('*')
    .eq('fiscal_year', year)
    .eq('status', 'active');

  if (budgetError) throw budgetError;

  // Aggregate analytics
  const summary = {
    totalCost: 0,
    tuitionCost: 0,
    travelCost: 0,
    perDiemCost: 0,
    sessionCount: 0,
    participantCount: 0,
    tripCount: 0,
    abroadCost: 0,
    localCost: 0,
    totalBudget: 0,
    budgetUsedPercentage: 0,
    byCategory: {} as Record<string, number>,
    byEntity: {} as Record<string, number>,
    byMonth: {} as Record<string, number>,
  };

  for (const row of analytics || []) {
    summary.totalCost += Number(row.total_cost) || 0;
    summary.tuitionCost += Number(row.tuition_cost) || 0;
    summary.travelCost += Number(row.travel_cost) || 0;
    summary.perDiemCost += Number(row.per_diem_cost) || 0;
    summary.sessionCount += row.session_count || 0;
    summary.participantCount += row.participant_count || 0;
    summary.tripCount += row.trip_count || 0;

    if (row.is_abroad) {
      summary.abroadCost += Number(row.total_cost) || 0;
    } else {
      summary.localCost += Number(row.total_cost) || 0;
    }

    // By category
    if (row.training_category) {
      summary.byCategory[row.training_category] = 
        (summary.byCategory[row.training_category] || 0) + Number(row.total_cost);
    }

    // By entity
    if (row.entity) {
      summary.byEntity[row.entity] = 
        (summary.byEntity[row.entity] || 0) + Number(row.total_cost);
    }

    // By month
    const monthKey = `${row.period_year}-${String(row.period_month).padStart(2, '0')}`;
    summary.byMonth[monthKey] = (summary.byMonth[monthKey] || 0) + Number(row.total_cost);
  }

  // Calculate budget totals
  for (const budget of budgets || []) {
    summary.totalBudget += Number(budget.budget_amount) || 0;
  }

  summary.budgetUsedPercentage = summary.totalBudget > 0 
    ? Math.round((summary.totalCost / summary.totalBudget) * 100) 
    : 0;

  return new Response(
    JSON.stringify({ success: true, summary }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getEntityCosts(supabase: any, body: DashboardRequest) {
  const { filters } = body;
  const year = filters?.fiscalYear || new Date().getFullYear();

  // Get analytics grouped by entity
  const { data: analytics } = await supabase
    .from('cost_analytics')
    .select('*')
    .eq('period_year', year);

  // Get budgets
  const { data: budgets } = await supabase
    .from('training_budgets')
    .select('*')
    .eq('fiscal_year', year)
    .eq('status', 'active');

  // Aggregate by entity
  const entityMap = new Map<string, any>();

  for (const row of analytics || []) {
    const key = row.entity || 'Unassigned';
    if (!entityMap.has(key)) {
      entityMap.set(key, {
        entity: key,
        tuitionCost: 0,
        travelCost: 0,
        perDiemCost: 0,
        totalCost: 0,
        budget: 0,
        variance: 0,
        percentUsed: 0,
        sessionCount: 0,
        participantCount: 0,
        categories: {} as Record<string, number>,
      });
    }
    const entry = entityMap.get(key)!;
    entry.tuitionCost += Number(row.tuition_cost) || 0;
    entry.travelCost += Number(row.travel_cost) || 0;
    entry.perDiemCost += Number(row.per_diem_cost) || 0;
    entry.totalCost += Number(row.total_cost) || 0;
    entry.sessionCount += row.session_count || 0;
    entry.participantCount += row.participant_count || 0;

    if (row.training_category) {
      entry.categories[row.training_category] = 
        (entry.categories[row.training_category] || 0) + Number(row.total_cost);
    }
  }

  // Add budget info
  for (const budget of budgets || []) {
    const key = budget.entity || 'Unassigned';
    if (entityMap.has(key)) {
      const entry = entityMap.get(key)!;
      entry.budget += Number(budget.budget_amount) || 0;
    }
  }

  // Calculate variance
  const entities = Array.from(entityMap.values()).map((e: any) => ({
    ...e,
    variance: e.budget - e.totalCost,
    percentUsed: e.budget > 0 ? Math.round((e.totalCost / e.budget) * 100) : 0,
  }));

  return new Response(
    JSON.stringify({ success: true, entities }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getProviderCosts(supabase: any, body: DashboardRequest) {
  const { filters } = body;
  const year = filters?.fiscalYear || new Date().getFullYear();

  const { data: analytics } = await supabase
    .from('cost_analytics')
    .select('*')
    .eq('period_year', year)
    .not('provider_id', 'is', null);

  // Aggregate by provider
  const providerMap = new Map<string, any>();

  for (const row of analytics || []) {
    const key = row.provider_id;
    if (!providerMap.has(key)) {
      providerMap.set(key, {
        providerId: key,
        providerName: row.provider_name || 'Unknown',
        tuitionCost: 0,
        travelCost: 0,
        perDiemCost: 0,
        totalCost: 0,
        sessionCount: 0,
        participantCount: 0,
        destinations: new Set<string>(),
      });
    }
    const entry = providerMap.get(key)!;
    entry.tuitionCost += Number(row.tuition_cost) || 0;
    entry.travelCost += Number(row.travel_cost) || 0;
    entry.perDiemCost += Number(row.per_diem_cost) || 0;
    entry.totalCost += Number(row.total_cost) || 0;
    entry.sessionCount += row.session_count || 0;
    entry.participantCount += row.participant_count || 0;
    if (row.destination_country) entry.destinations.add(row.destination_country);
  }

  const providers = Array.from(providerMap.values()).map((p: any) => ({
    ...p,
    destinations: Array.from(p.destinations),
    destinationCount: p.destinations.size,
    avgCostPerParticipant: p.participantCount > 0 
      ? Math.round(p.totalCost / p.participantCount) 
      : 0,
    travelTuitionRatio: p.tuitionCost > 0 
      ? Math.round(((p.travelCost + p.perDiemCost) / p.tuitionCost) * 100) / 100 
      : 0,
  }));

  return new Response(
    JSON.stringify({ success: true, providers }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getDestinationCosts(supabase: any, body: DashboardRequest) {
  const { filters } = body;
  const year = filters?.fiscalYear || new Date().getFullYear();

  const { data: analytics } = await supabase
    .from('cost_analytics')
    .select('*')
    .eq('period_year', year)
    .not('destination_country', 'is', null);

  // Aggregate by destination
  const destMap = new Map<string, any>();

  for (const row of analytics || []) {
    const key = `${row.destination_country}|${row.destination_city || ''}`;
    if (!destMap.has(key)) {
      destMap.set(key, {
        country: row.destination_country,
        city: row.destination_city || 'Various',
        travelCost: 0,
        perDiemCost: 0,
        tuitionCost: 0,
        totalCost: 0,
        participantCount: 0,
        tripCount: 0,
      });
    }
    const entry = destMap.get(key)!;
    entry.travelCost += Number(row.travel_cost) || 0;
    entry.perDiemCost += Number(row.per_diem_cost) || 0;
    entry.tuitionCost += Number(row.tuition_cost) || 0;
    entry.totalCost += Number(row.total_cost) || 0;
    entry.participantCount += row.participant_count || 0;
    entry.tripCount += row.trip_count || 0;
  }

  const destinations = Array.from(destMap.values()).map((d: any) => ({
    ...d,
    avgCostPerParticipant: d.participantCount > 0 
      ? Math.round(d.totalCost / d.participantCount) 
      : 0,
    travelPerDiemTotal: d.travelCost + d.perDiemCost,
  }));

  return new Response(
    JSON.stringify({ success: true, destinations }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getBudgets(supabase: any, body: DashboardRequest) {
  const { filters } = body;
  
  let query = supabase.from('training_budgets').select('*').order('fiscal_year', { ascending: false });
  
  if (filters?.fiscalYear) query = query.eq('fiscal_year', filters.fiscalYear);
  if (filters?.entity) query = query.eq('entity', filters.entity);
  if (filters?.category) query = query.eq('training_category', filters.category);

  const { data, error } = await query;
  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true, budgets: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function saveBudget(supabase: any, body: DashboardRequest, userId: string | null) {
  const { budget, budgetId } = body;

  let result;
  if (budgetId) {
    // Get old values for audit
    const { data: oldBudget } = await supabase
      .from('training_budgets')
      .select('*')
      .eq('id', budgetId)
      .single();

    const { data, error } = await supabase
      .from('training_budgets')
      .update({ ...budget, updated_at: new Date().toISOString() })
      .eq('id', budgetId)
      .select()
      .single();

    if (error) throw error;
    result = data;

    // Audit log
    await supabase.from('budget_audit_log').insert({
      budget_id: budgetId,
      action: 'update',
      actor_id: userId,
      old_values: oldBudget,
      new_values: data,
    });
  } else {
    const { data, error } = await supabase
      .from('training_budgets')
      .insert({ ...budget, created_by: userId })
      .select()
      .single();

    if (error) throw error;
    result = data;

    // Audit log
    await supabase.from('budget_audit_log').insert({
      budget_id: result.id,
      action: 'create',
      actor_id: userId,
      new_values: result,
    });
  }

  return new Response(
    JSON.stringify({ success: true, budget: result }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function importBudgets(supabase: any, body: DashboardRequest, userId: string | null) {
  const { budgets } = body;

  if (!budgets || !Array.isArray(budgets)) {
    throw new Error('budgets array is required');
  }

  const toInsert = budgets.map((b: any) => ({
    ...b,
    created_by: userId,
  }));

  const { data, error } = await supabase
    .from('training_budgets')
    .insert(toInsert)
    .select();

  if (error) throw error;

  // Audit log
  await supabase.from('budget_audit_log').insert({
    action: 'import',
    actor_id: userId,
    new_values: { count: data.length, budgets: data.map((b: any) => b.id) },
  });

  return new Response(
    JSON.stringify({ success: true, imported: data.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function activateBudget(supabase: any, body: DashboardRequest, userId: string | null) {
  const { budgetId } = body;

  const { data, error } = await supabase
    .from('training_budgets')
    .update({
      status: 'active',
      activated_at: new Date().toISOString(),
      activated_by: userId,
    })
    .eq('id', budgetId)
    .select()
    .single();

  if (error) throw error;

  await supabase.from('budget_audit_log').insert({
    budget_id: budgetId,
    action: 'activate',
    actor_id: userId,
  });

  return new Response(
    JSON.stringify({ success: true, budget: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getThresholds(supabase: any) {
  const { data, error } = await supabase
    .from('budget_thresholds')
    .select('*')
    .order('threshold_percentage', { ascending: true });

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true, thresholds: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function saveThreshold(supabase: any, body: DashboardRequest, userId: string | null) {
  const { threshold, thresholdId } = body;

  let result;
  if (thresholdId) {
    const { data, error } = await supabase
      .from('budget_thresholds')
      .update({ ...threshold, updated_at: new Date().toISOString() })
      .eq('id', thresholdId)
      .select()
      .single();

    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await supabase
      .from('budget_thresholds')
      .insert({ ...threshold, created_by: userId })
      .select()
      .single();

    if (error) throw error;
    result = data;
  }

  return new Response(
    JSON.stringify({ success: true, threshold: result }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getAnomalies(supabase: any, body: DashboardRequest) {
  const { filters } = body;

  let query = supabase
    .from('cost_anomalies')
    .select('*, cost_anomaly_rules(rule_name)')
    .order('detected_at', { ascending: false });

  if (filters?.fiscalYear) query = query.eq('period_year', filters.fiscalYear);

  const { data, error } = await query.limit(100);
  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true, anomalies: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function reviewAnomaly(supabase: any, body: DashboardRequest, userId: string | null) {
  const { anomalyId, reviewStatus, reviewNotes } = body;

  const { data, error } = await supabase
    .from('cost_anomalies')
    .update({
      status: reviewStatus,
      review_notes: reviewNotes,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', anomalyId)
    .select()
    .single();

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true, anomaly: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getAnomalyRules(supabase: any) {
  const { data, error } = await supabase
    .from('cost_anomaly_rules')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true, rules: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function saveAnomalyRule(supabase: any, body: DashboardRequest, userId: string | null) {
  const { rule, ruleId } = body;

  let result;
  if (ruleId) {
    const { data, error } = await supabase
      .from('cost_anomaly_rules')
      .update(rule)
      .eq('id', ruleId)
      .select()
      .single();

    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await supabase
      .from('cost_anomaly_rules')
      .insert({ ...rule, created_by: userId })
      .select()
      .single();

    if (error) throw error;
    result = data;
  }

  return new Response(
    JSON.stringify({ success: true, rule: result }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function refreshAnalytics(supabase: any, body: DashboardRequest, userId: string | null) {
  const { filters } = body;
  const year = filters?.fiscalYear || new Date().getFullYear();

  console.log(`[refreshAnalytics] Refreshing analytics for year ${year}`);

  // Get per diem data
  const { data: perDiemData } = await supabase
    .from('per_diem_calculations')
    .select(`
      *,
      profiles:employee_id (entity, department),
      sessions:session_id (
        id,
        course:course_id (
          id,
          category_id,
          provider_id,
          training_providers (id, name_en)
        )
      )
    `)
    .gte('created_at', `${year}-01-01`)
    .lte('created_at', `${year}-12-31`)
    .in('status', ['final', 'approved']);

  // Get session data for tuition costs
  const { data: sessionData } = await supabase
    .from('sessions')
    .select(`
      id,
      start_date,
      end_date,
      location_country,
      location_city,
      is_abroad,
      total_cost,
      cost_per_participant,
      course:course_id (
        id,
        category_id,
        provider_id,
        training_providers (id, name_en)
      ),
      session_enrollments (
        id,
        employee_id,
        profiles:employee_id (entity, department)
      )
    `)
    .gte('start_date', `${year}-01-01`)
    .lte('start_date', `${year}-12-31`);

  // Delete existing analytics for the year
  await supabase
    .from('cost_analytics')
    .delete()
    .eq('period_year', year);

  // Build analytics records
  const analyticsMap = new Map<string, any>();

  // Process per diem data
  for (const pd of perDiemData || []) {
    const month = new Date(pd.created_at).getMonth() + 1;
    const entity = pd.profiles?.entity || 'Unknown';
    const costCentre = pd.profiles?.department || null;
    const category = pd.sessions?.course?.category_id || null;
    const providerId = pd.sessions?.course?.provider_id || null;
    const providerName = pd.sessions?.course?.training_providers?.name_en || null;
    const country = pd.destination_country || null;
    const city = pd.destination_city || null;
    const isAbroad = pd.is_abroad || false;

    const key = `${year}-${month}-${entity}-${costCentre}-${category}-${providerId}-${country}-${city}`;
    
    if (!analyticsMap.has(key)) {
      analyticsMap.set(key, {
        period_year: year,
        period_month: month,
        entity,
        cost_centre: costCentre,
        training_category: category,
        provider_id: providerId,
        provider_name: providerName,
        destination_country: country,
        destination_city: city,
        is_abroad: isAbroad,
        tuition_cost: 0,
        travel_cost: 0,
        per_diem_cost: 0,
        total_cost: 0,
        session_count: 0,
        participant_count: 0,
        trip_count: 0,
      });
    }

    const entry = analyticsMap.get(key)!;
    entry.per_diem_cost += Number(pd.final_amount || pd.estimated_amount) || 0;
    entry.trip_count += 1;
  }

  // Process session tuition data
  for (const session of sessionData || []) {
    const month = new Date(session.start_date).getMonth() + 1;
    const participantCount = session.session_enrollments?.length || 0;
    const entity = session.session_enrollments?.[0]?.profiles?.entity || 'Unknown';
    const costCentre = session.session_enrollments?.[0]?.profiles?.department || null;
    const category = session.course?.category_id || null;
    const providerId = session.course?.provider_id || null;
    const providerName = session.course?.training_providers?.name_en || null;
    const country = session.location_country || null;
    const city = session.location_city || null;
    const isAbroad = session.is_abroad || false;

    const key = `${year}-${month}-${entity}-${costCentre}-${category}-${providerId}-${country}-${city}`;
    
    if (!analyticsMap.has(key)) {
      analyticsMap.set(key, {
        period_year: year,
        period_month: month,
        entity,
        cost_centre: costCentre,
        training_category: category,
        provider_id: providerId,
        provider_name: providerName,
        destination_country: country,
        destination_city: city,
        is_abroad: isAbroad,
        tuition_cost: 0,
        travel_cost: 0,
        per_diem_cost: 0,
        total_cost: 0,
        session_count: 0,
        participant_count: 0,
        trip_count: 0,
      });
    }

    const entry = analyticsMap.get(key)!;
    entry.tuition_cost += Number(session.total_cost) || 0;
    entry.session_count += 1;
    entry.participant_count += participantCount;
  }

  // Calculate totals and insert
  const analyticsRecords = Array.from(analyticsMap.values()).map((a: any) => ({
    ...a,
    total_cost: a.tuition_cost + a.travel_cost + a.per_diem_cost,
    last_refreshed_at: new Date().toISOString(),
  }));

  if (analyticsRecords.length > 0) {
    const { error: insertError } = await supabase
      .from('cost_analytics')
      .insert(analyticsRecords);

    if (insertError) throw insertError;
  }

  console.log(`[refreshAnalytics] Created ${analyticsRecords.length} analytics records`);

  return new Response(
    JSON.stringify({ 
      success: true, 
      recordsCreated: analyticsRecords.length,
      year 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function exportCosts(supabase: any, body: DashboardRequest, userId: string | null) {
  const { filters, exportType } = body;
  const year = filters?.fiscalYear || new Date().getFullYear();

  let data: any[];
  let rowCount: number;

  if (exportType === 'detailed') {
    // Get detailed export records
    const { data: records, error } = await supabase
      .from('expense_export_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100000);

    if (error) throw error;
    data = records || [];
    rowCount = data.length;
  } else {
    // Summary export
    const { data: analytics, error } = await supabase
      .from('cost_analytics')
      .select('*')
      .eq('period_year', year);

    if (error) throw error;
    data = analytics || [];
    rowCount = data.length;
  }

  // Log export
  await supabase.from('cost_export_log').insert({
    export_type: exportType || 'summary',
    filters,
    row_count: rowCount,
    exported_by: userId,
  });

  return new Response(
    JSON.stringify({ success: true, data, rowCount }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function checkBudgetImpact(supabase: any, body: DashboardRequest) {
  const { filters, estimatedCost } = body;
  const year = filters?.fiscalYear || new Date().getFullYear();
  const entity = filters?.entity;
  const category = filters?.category;

  // Get current budget
  let budgetQuery = supabase
    .from('training_budgets')
    .select('*')
    .eq('fiscal_year', year)
    .eq('status', 'active');

  if (entity) budgetQuery = budgetQuery.eq('entity', entity);
  if (category) budgetQuery = budgetQuery.eq('training_category', category);

  const { data: budgets } = await budgetQuery;

  // Get current spend
  let analyticsQuery = supabase
    .from('cost_analytics')
    .select('total_cost')
    .eq('period_year', year);

  if (entity) analyticsQuery = analyticsQuery.eq('entity', entity);
  if (category) analyticsQuery = analyticsQuery.eq('training_category', category);

  const { data: analytics } = await analyticsQuery;

  const totalBudget = (budgets || []).reduce((sum: number, b: any) => sum + Number(b.budget_amount), 0);
  const currentSpend = (analytics || []).reduce((sum: number, a: any) => sum + Number(a.total_cost), 0);
  const projectedSpend = currentSpend + (estimatedCost || 0);

  // Get thresholds
  const { data: thresholds } = await supabase
    .from('budget_thresholds')
    .select('*')
    .eq('is_active', true)
    .order('threshold_percentage', { ascending: true });

  // Check which thresholds are breached
  const percentageUsed = totalBudget > 0 ? (projectedSpend / totalBudget) * 100 : 0;
  const breachedThresholds: any[] = [];

  for (const threshold of thresholds || []) {
    if (percentageUsed >= threshold.threshold_percentage) {
      breachedThresholds.push({
        ...threshold,
        currentPercentage: Math.round(percentageUsed),
      });
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      impact: {
        totalBudget,
        currentSpend,
        estimatedCost: estimatedCost || 0,
        projectedSpend,
        remainingBefore: totalBudget - currentSpend,
        remainingAfter: totalBudget - projectedSpend,
        percentageUsedBefore: totalBudget > 0 ? Math.round((currentSpend / totalBudget) * 100) : 0,
        percentageUsedAfter: Math.round(percentageUsed),
        breachedThresholds,
        requiresAdditionalApproval: breachedThresholds.some((t: any) => t.requires_approval_role),
      },
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getBudgetAudit(supabase: any, body: DashboardRequest) {
  const { budgetId } = body;

  let query = supabase
    .from('budget_audit_log')
    .select('*')
    .order('created_at', { ascending: false });

  if (budgetId) query = query.eq('budget_id', budgetId);

  const { data, error } = await query.limit(100);
  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true, auditLog: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
