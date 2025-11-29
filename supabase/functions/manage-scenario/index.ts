import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateScenarioRequest {
  action: 'create';
  planId: string;
  planVersion: number;
  name: string;
  description?: string;
  visibilityScope?: 'global' | 'entity' | 'restricted';
}

interface RecalculateScenarioRequest {
  action: 'recalculate';
  scenarioId: string;
  levers: {
    globalBudgetType?: 'percentage' | 'absolute';
    globalBudgetValue?: number;
    includePriorityBands?: string[];
    cutOrder?: string[];
    protectedCategories?: string[];
    cutAbroadFirst?: boolean;
    entityCaps?: Record<string, { type: 'percentage' | 'absolute'; value: number }>;
  };
}

interface PromoteScenarioRequest {
  action: 'promote';
  scenarioId: string;
  newPlanName: string;
  newPlanDescription?: string;
}

interface LocalAdjustmentRequest {
  action: 'local_adjust';
  scenarioId: string;
  itemId: string;
  newVolume: number;
  reason: string;
}

interface ScenarioRecord {
  id: string;
  baseline_total_cost: number | null;
  scenario_total_cost: number | null;
  basis_plan_id: string;
  scenario_items?: ScenarioItemRecord[];
}

interface ScenarioItemRecord {
  id: string;
  scenario_id: string;
  course_id: string;
  priority_band: string | null;
  baseline_volume: number;
  baseline_sessions: number;
  baseline_cost: number;
  baseline_cost_per_participant: number | null;
  scenario_volume: number;
  scenario_sessions: number;
  scenario_cost: number;
  is_locally_adjusted: boolean | null;
  is_protected: boolean | null;
}

interface PlanItemRecord {
  id: string;
  course_id: string;
  planned_participants: number;
  planned_sessions: number;
  estimated_cost: number;
  cost_per_participant: number;
  priority: string;
}

interface PlanRecord {
  id: string;
  period_id: string;
  version: number;
}

type RequestBody = CreateScenarioRequest | RecalculateScenarioRequest | PromoteScenarioRequest | LocalAdjustmentRequest;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: RequestBody = await req.json();
    console.log(`[manage-scenario] Action: ${body.action}, User: ${user.id}`);

    switch (body.action) {
      case 'create':
        return await createScenario(supabase, user.id, body);
      case 'recalculate':
        return await recalculateScenario(supabase, user.id, body);
      case 'promote':
        return await promoteScenario(supabase, user.id, body);
      case 'local_adjust':
        return await localAdjustment(supabase, user.id, body);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: unknown) {
    console.error('[manage-scenario] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createScenario(supabase: any, userId: string, request: CreateScenarioRequest) {
  console.log(`[create-scenario] Creating scenario from plan ${request.planId}`);

  const { data: scenario, error: scenarioError } = await supabase
    .from('plan_scenarios')
    .insert({
      name: request.name,
      description: request.description,
      basis_plan_id: request.planId,
      basis_plan_version: request.planVersion,
      owner_id: userId,
      status: 'creating',
      visibility_scope: request.visibilityScope || 'global',
      creation_progress: 0,
    })
    .select()
    .single();

  if (scenarioError) {
    console.error('[create-scenario] Error:', scenarioError);
    throw new Error(`Failed to create scenario: ${scenarioError.message}`);
  }

  // Start background copy (fire and forget)
  copyPlanItemsToScenario(supabase, scenario.id, request.planId);

  await supabase.from('scenario_audit_log').insert({
    scenario_id: scenario.id,
    action: 'created',
    actor_id: userId,
    details: { plan_id: request.planId, plan_version: request.planVersion },
  });

  return new Response(JSON.stringify({ 
    success: true, 
    scenario: scenario,
    message: 'Scenario creation started.' 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function copyPlanItemsToScenario(supabase: any, scenarioId: string, planId: string) {
  console.log(`[copy-items] Starting copy for scenario ${scenarioId}`);
  
  try {
    const { data: planItems, error: itemsError } = await supabase
      .from('training_plan_items')
      .select('id, course_id, planned_participants, planned_sessions, estimated_cost, cost_per_participant, priority')
      .eq('plan_id', planId);

    if (itemsError) throw itemsError;

    const items: PlanItemRecord[] = planItems || [];
    let totalCost = 0;
    let totalParticipants = 0;
    const batchSize = 500;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const scenarioItems = batch.map((item) => {
        const cost = item.estimated_cost || 0;
        const volume = item.planned_participants || 0;
        totalCost += cost;
        totalParticipants += volume;

        return {
          scenario_id: scenarioId,
          source_plan_item_id: item.id,
          course_id: item.course_id,
          priority_band: item.priority || 'medium',
          baseline_volume: volume,
          baseline_sessions: item.planned_sessions || 0,
          baseline_cost: cost,
          baseline_cost_per_participant: item.cost_per_participant,
          scenario_volume: volume,
          scenario_sessions: item.planned_sessions || 0,
          scenario_cost: cost,
        };
      });

      await supabase.from('scenario_items').insert(scenarioItems);

      const progress = Math.round(((i + batch.length) / items.length) * 100);
      await supabase.from('plan_scenarios').update({ creation_progress: progress }).eq('id', scenarioId);
    }

    await supabase.from('plan_scenarios').update({
      status: 'draft',
      creation_progress: 100,
      baseline_total_cost: totalCost,
      scenario_total_cost: totalCost,
      baseline_total_participants: totalParticipants,
      scenario_total_participants: totalParticipants,
    }).eq('id', scenarioId);

    console.log(`[copy-items] Completed copying ${items.length} items`);
  } catch (error) {
    console.error('[copy-items] Failed:', error);
    await supabase.from('plan_scenarios').update({ status: 'draft', creation_progress: -1 }).eq('id', scenarioId);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recalculateScenario(supabase: any, userId: string, request: RecalculateScenarioRequest) {
  const { levers, scenarioId } = request;
  console.log(`[recalculate] Scenario ${scenarioId} with levers:`, levers);

  const { data: scenarioData, error: scenarioError } = await supabase
    .from('plan_scenarios')
    .select('*')
    .eq('id', scenarioId)
    .single();
    
  if (scenarioError || !scenarioData) throw new Error('Scenario not found');
  const scenario: ScenarioRecord = scenarioData;

  await supabase.from('plan_scenarios').update({
    global_budget_type: levers.globalBudgetType,
    global_budget_value: levers.globalBudgetValue,
    include_priority_bands: levers.includePriorityBands,
    cut_order: levers.cutOrder,
    cut_abroad_first: levers.cutAbroadFirst,
  }).eq('id', scenarioId);

  const { data: itemsData, error: itemsError } = await supabase
    .from('scenario_items')
    .select('*')
    .eq('scenario_id', scenarioId);
    
  if (itemsError) throw new Error('Failed to fetch items');
  const items: ScenarioItemRecord[] = itemsData || [];

  const includedBands = levers.includePriorityBands || ['critical', 'high', 'medium', 'low'];
  let targetBudget: number | null = null;
  if (levers.globalBudgetValue) {
    targetBudget = levers.globalBudgetType === 'percentage'
      ? (scenario.baseline_total_cost || 0) * (levers.globalBudgetValue / 100)
      : levers.globalBudgetValue;
  }

  let runningCost = 0;
  for (const item of items) {
    if (item.is_locally_adjusted) {
      runningCost += item.scenario_cost;
      continue;
    }

    if (!includedBands.includes(item.priority_band || 'low')) {
      await supabase.from('scenario_items').update({ scenario_volume: 0, scenario_cost: 0, is_cut: true }).eq('id', item.id);
      continue;
    }

    let newVolume = item.baseline_volume;
    let newCost = item.baseline_cost;

    if (targetBudget && !item.is_protected && runningCost + newCost > targetBudget) {
      const remaining = Math.max(0, targetBudget - runningCost);
      newVolume = Math.floor(remaining / (item.baseline_cost_per_participant || 1));
      newCost = newVolume * (item.baseline_cost_per_participant || 0);
    }

    runningCost += newCost;
    await supabase.from('scenario_items').update({
      scenario_volume: newVolume,
      scenario_cost: newCost,
      is_cut: newVolume < item.baseline_volume,
    }).eq('id', item.id);
  }

  const { data: updatedData } = await supabase
    .from('scenario_items')
    .select('scenario_volume, scenario_cost')
    .eq('scenario_id', scenarioId);
    
  const updated: Array<{ scenario_volume: number; scenario_cost: number }> = updatedData || [];
  const totalCost = updated.reduce((sum, i) => sum + (i.scenario_cost || 0), 0);
  const totalParticipants = updated.reduce((sum, i) => sum + (i.scenario_volume || 0), 0);

  await supabase.from('plan_scenarios').update({
    scenario_total_cost: totalCost,
    scenario_total_participants: totalParticipants,
    last_recalculation_at: new Date().toISOString(),
  }).eq('id', scenarioId);

  await supabase.from('scenario_audit_log').insert({
    scenario_id: scenarioId,
    action: 'recalculated',
    actor_id: userId,
    details: { levers },
  });

  console.log(`[recalculate] Done. Cost: ${totalCost}, Participants: ${totalParticipants}`);

  return new Response(JSON.stringify({ success: true, totalCost, totalParticipants, itemsUpdated: items.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function promoteScenario(supabase: any, userId: string, request: PromoteScenarioRequest) {
  console.log(`[promote] Scenario ${request.scenarioId}`);

  const { data: scenarioData } = await supabase
    .from('plan_scenarios')
    .select('*, scenario_items(*)')
    .eq('id', request.scenarioId)
    .single();
    
  if (!scenarioData) throw new Error('Scenario not found');
  const scenario: ScenarioRecord = scenarioData;

  const { data: basisPlanData } = await supabase
    .from('training_plans')
    .select('*')
    .eq('id', scenario.basis_plan_id)
    .single();
    
  if (!basisPlanData) throw new Error('Basis plan not found');
  const basisPlan: PlanRecord = basisPlanData;

  const { data: newPlan, error } = await supabase.from('training_plans').insert({
    name: request.newPlanName,
    description: request.newPlanDescription || `Promoted from: ${request.scenarioId}`,
    period_id: basisPlan.period_id,
    status: 'draft',
    version: (basisPlan.version || 1) + 1,
    created_by: userId,
    total_budget: scenario.scenario_total_cost,
    total_participants: scenario.scenario_items?.reduce((sum, i) => sum + i.scenario_volume, 0) || 0,
  }).select().single();

  if (error) throw new Error(error.message);

  const newItems = (scenario.scenario_items || [])
    .filter((item) => item.scenario_volume > 0)
    .map((item) => ({
      plan_id: newPlan.id,
      course_id: item.course_id,
      planned_participants: item.scenario_volume,
      planned_sessions: item.scenario_sessions,
      estimated_cost: item.scenario_cost,
      cost_per_participant: item.baseline_cost_per_participant,
      priority: item.priority_band,
      status: 'planned',
    }));

  if (newItems.length > 0) {
    await supabase.from('training_plan_items').insert(newItems);
  }

  await supabase.from('plan_scenarios').update({
    status: 'adopted',
    promoted_to_plan_id: newPlan.id,
    promoted_at: new Date().toISOString(),
    promoted_by: userId,
  }).eq('id', request.scenarioId);

  await supabase.from('scenario_audit_log').insert({
    scenario_id: request.scenarioId,
    action: 'promoted',
    actor_id: userId,
    details: { new_plan_id: newPlan.id },
  });

  return new Response(JSON.stringify({ success: true, newPlanId: newPlan.id, newPlanName: request.newPlanName }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function localAdjustment(supabase: any, userId: string, request: LocalAdjustmentRequest) {
  console.log(`[local-adjust] Item ${request.itemId}`);

  const { data: itemData } = await supabase
    .from('scenario_items')
    .select('*')
    .eq('id', request.itemId)
    .single();
    
  if (!itemData) throw new Error('Item not found');
  const item: ScenarioItemRecord = itemData;

  const newCost = request.newVolume * (item.baseline_cost_per_participant || 0);

  await supabase.from('scenario_items').update({
    scenario_volume: request.newVolume,
    scenario_cost: newCost,
    is_locally_adjusted: true,
    local_adjustment_by: userId,
    local_adjustment_reason: request.reason,
    local_adjustment_at: new Date().toISOString(),
  }).eq('id', request.itemId);

  const { data: allItemsData } = await supabase
    .from('scenario_items')
    .select('scenario_volume, scenario_cost')
    .eq('scenario_id', request.scenarioId);
    
  const allItems: Array<{ scenario_volume: number; scenario_cost: number }> = allItemsData || [];
  const totalCost = allItems.reduce((sum, i) => sum + (i.scenario_cost || 0), 0);
  const totalParticipants = allItems.reduce((sum, i) => sum + (i.scenario_volume || 0), 0);

  await supabase.from('plan_scenarios').update({ 
    scenario_total_cost: totalCost, 
    scenario_total_participants: totalParticipants 
  }).eq('id', request.scenarioId);

  await supabase.from('scenario_audit_log').insert({
    scenario_id: request.scenarioId,
    action: 'local_adjustment',
    actor_id: userId,
    details: { item_id: request.itemId, new_volume: request.newVolume, reason: request.reason },
  });

  return new Response(JSON.stringify({ success: true, newVolume: request.newVolume, newCost }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
