import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TrainingPlan {
  id: string;
  name: string;
  description: string | null;
  tna_period_id: string | null;
  fiscal_year: string;
  version: number;
  status: 'draft' | 'under_area_review' | 'under_corporate_review' | 'approved' | 'locked';
  is_historical_import: boolean;
  total_participants: number;
  total_sessions: number;
  total_estimated_cost: number;
  cost_currency: string;
  area_reviewed_by: string | null;
  area_reviewed_at: string | null;
  corporate_reviewed_by: string | null;
  corporate_reviewed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  locked_by: string | null;
  locked_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  tna_period?: {
    id: string;
    name: string;
  };
}

export interface TrainingPlanItem {
  id: string;
  plan_id: string;
  course_id: string | null;
  item_name: string;
  item_name_ar: string | null;
  category_id: string | null;
  training_type: 'short_term' | 'long_term';
  training_location: 'local' | 'abroad';
  delivery_mode: string | null;
  entity_id: string | null;
  department_id: string | null;
  site: string | null;
  cost_centre: string | null;
  planned_participants: number;
  planned_sessions: number;
  max_participants_per_session: number;
  provider_id: string | null;
  provider_name: string | null;
  unit_cost: number;
  cost_currency: string;
  target_quarter: string | null;
  target_month: number | null;
  priority: 'high' | 'medium' | 'low';
  item_status: 'active' | 'excluded' | 'merged' | 'split_source';
  is_catalogue_linked: boolean;
  is_tna_backed: boolean;
  tna_item_count: number;
  source_tna_ids: string[];
  merged_into_id: string | null;
  split_from_id: string | null;
  excluded_by: string | null;
  excluded_at: string | null;
  exclusion_reason: string | null;
  hrbp_comments: string | null;
  finance_comments: string | null;
  l_and_d_comments: string | null;
  created_at: string;
  updated_at: string;
  // Computed
  total_cost?: number;
  // Joined data
  course?: {
    id: string;
    name_en: string;
    code: string | null;
  };
  category?: {
    id: string;
    name_en: string;
  };
  department?: {
    id: string;
    name_en: string;
  };
  provider?: {
    id: string;
    name_en: string;
  };
}

// Fetch all training plans
export function useTrainingPlans() {
  return useQuery({
    queryKey: ['training-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_plans')
        .select(`
          *,
          tna_period:tna_periods(id, name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as TrainingPlan[];
    },
  });
}

// Fetch single training plan
export function useTrainingPlan(planId: string | null) {
  return useQuery({
    queryKey: ['training-plan', planId],
    queryFn: async () => {
      if (!planId) return null;
      
      const { data, error } = await supabase
        .from('training_plans')
        .select(`
          *,
          tna_period:tna_periods(id, name)
        `)
        .eq('id', planId)
        .single();
      
      if (error) throw error;
      return data as unknown as TrainingPlan;
    },
    enabled: !!planId,
  });
}

// Fetch plan items with filters
export function useTrainingPlanItems(
  planId: string | null,
  filters?: {
    status?: string;
    priority?: string;
    training_type?: string;
    training_location?: string;
    department_id?: string;
    quarter?: string;
    search?: string;
  }
) {
  return useQuery({
    queryKey: ['training-plan-items', planId, filters],
    queryFn: async () => {
      if (!planId) return [];
      
      let query = supabase
        .from('training_plan_items')
        .select(`
          *,
          course:courses(id, name_en, code),
          category:course_categories(id, name_en),
          department:departments(id, name_en),
          provider:training_providers(id, name_en)
        `)
        .eq('plan_id', planId)
        .order('item_name');
      
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('item_status', filters.status);
      }
      if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.training_type && filters.training_type !== 'all') {
        query = query.eq('training_type', filters.training_type);
      }
      if (filters?.training_location && filters.training_location !== 'all') {
        query = query.eq('training_location', filters.training_location);
      }
      if (filters?.department_id && filters.department_id !== 'all') {
        query = query.eq('department_id', filters.department_id);
      }
      if (filters?.quarter && filters.quarter !== 'all') {
        query = query.eq('target_quarter', filters.quarter);
      }
      if (filters?.search) {
        query = query.ilike('item_name', `%${filters.search}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Calculate total_cost for each item
      const items = (data || []).map((item: any) => ({
        ...item,
        total_cost: (item.unit_cost || 0) * (item.planned_participants || 0),
      }));
      
      return items as TrainingPlanItem[];
    },
    enabled: !!planId,
  });
}

// Create training plan
export function useCreateTrainingPlan() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (plan: Partial<TrainingPlan>) => {
      const { data, error } = await supabase
        .from('training_plans')
        .insert({
          name: plan.name!,
          fiscal_year: plan.fiscal_year!,
          description: plan.description,
          tna_period_id: plan.tna_period_id,
          created_by: user?.id,
        } as any)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-plans'] });
      toast.success('Training plan created');
    },
    onError: (error) => {
      toast.error('Failed to create plan: ' + error.message);
    },
  });
}

// Update training plan
export function useUpdateTrainingPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainingPlan> & { id: string }) => {
      const { data, error } = await supabase
        .from('training_plans')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['training-plans'] });
      queryClient.invalidateQueries({ queryKey: ['training-plan', data.id] });
      toast.success('Plan updated');
    },
    onError: (error) => {
      toast.error('Failed to update plan: ' + error.message);
    },
  });
}

// Update plan item (inline edit)
export function useUpdatePlanItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, planId, ...updates }: Partial<TrainingPlanItem> & { id: string; planId: string }) => {
      const { data, error } = await supabase
        .from('training_plan_items')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Log audit
      await supabase.from('training_plan_audit_log').insert({
        plan_id: planId,
        item_id: id,
        action: 'update',
        details: updates,
      } as any);
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['training-plan-items', variables.planId] });
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });
}

// Merge plan items
export function useMergePlanItems() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      planId,
      itemIds,
      mergedItem,
    }: {
      planId: string;
      itemIds: string[];
      mergedItem: Partial<TrainingPlanItem>;
    }) => {
      // Create new merged item
      const { data: newItem, error: createError } = await supabase
        .from('training_plan_items')
        .insert({
          ...mergedItem,
          plan_id: planId,
          item_name: mergedItem.item_name!,
          item_status: 'active',
        } as any)
        .select()
        .single();
      
      if (createError) throw createError;
      
      // Mark source items as merged
      const { error: updateError } = await supabase
        .from('training_plan_items')
        .update({
          item_status: 'merged',
          merged_into_id: (newItem as any).id,
        } as any)
        .in('id', itemIds);
      
      if (updateError) throw updateError;
      
      // Log audit
      await supabase.from('training_plan_audit_log').insert({
        plan_id: planId,
        item_id: (newItem as any).id,
        action: 'merge',
        details: { merged_from: itemIds },
      } as any);
      
      return newItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['training-plan-items', variables.planId] });
      toast.success('Items merged successfully');
    },
    onError: (error) => {
      toast.error('Failed to merge: ' + error.message);
    },
  });
}

// Split plan item
export function useSplitPlanItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      planId,
      sourceItemId,
      splitItems,
    }: {
      planId: string;
      sourceItemId: string;
      splitItems: Partial<TrainingPlanItem>[];
    }) => {
      // Create split items
      const itemsToInsert = splitItems.map(item => ({
        ...item,
        plan_id: planId,
        item_name: item.item_name!,
        split_from_id: sourceItemId,
        item_status: 'active',
      }));
      
      const { data: newItems, error: createError } = await supabase
        .from('training_plan_items')
        .insert(itemsToInsert as any)
        .select();
      
      if (createError) throw createError;
      
      // Mark source as split
      const { error: updateError } = await supabase
        .from('training_plan_items')
        .update({ item_status: 'split_source' } as any)
        .eq('id', sourceItemId);
      
      if (updateError) throw updateError;
      
      // Log audit
      await supabase.from('training_plan_audit_log').insert({
        plan_id: planId,
        item_id: sourceItemId,
        action: 'split',
        details: { split_into: (newItems as any[])?.map(i => i.id) },
      } as any);
      
      return newItems;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['training-plan-items', variables.planId] });
      toast.success('Item split successfully');
    },
    onError: (error) => {
      toast.error('Failed to split: ' + error.message);
    },
  });
}

// Exclude plan item
export function useExcludePlanItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      planId,
      itemId,
      reason,
    }: {
      planId: string;
      itemId: string;
      reason: string;
    }) => {
      const { data, error } = await supabase
        .from('training_plan_items')
        .update({
          item_status: 'excluded',
          excluded_by: user?.id,
          excluded_at: new Date().toISOString(),
          exclusion_reason: reason,
        } as any)
        .eq('id', itemId)
        .select()
        .single();
      
      if (error) throw error;
      
      // Log audit
      await supabase.from('training_plan_audit_log').insert({
        plan_id: planId,
        item_id: itemId,
        action: 'exclude',
        details: { reason },
      } as any);
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['training-plan-items', variables.planId] });
      toast.success('Item excluded from plan');
    },
    onError: (error) => {
      toast.error('Failed to exclude: ' + error.message);
    },
  });
}

// Generate plan from TNAs
export function useGeneratePlanFromTNA() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      planId,
      periodId,
    }: {
      planId: string;
      periodId: string;
    }) => {
      // Fetch approved TNA items for the period
      const { data: tnaItems, error: tnaError } = await supabase
        .from('tna_items')
        .select(`
          *,
          submission:tna_submissions!inner(
            id,
            period_id,
            status,
            employee_id
          ),
          course:courses(id, name_en, code, provider_id, cost_amount, cost_currency),
          competency:competencies(id, name_en)
        `)
        .eq('submission.period_id', periodId)
        .in('submission.status', ['approved', 'locked']);
      
      if (tnaError) throw tnaError;
      
      // Get employee department info separately
      const employeeIds = [...new Set((tnaItems || []).map((item: any) => item.submission?.employee_id).filter(Boolean))];
      const { data: employees } = await supabase
        .from('profiles')
        .select('id, department_id')
        .in('id', employeeIds);
      
      const employeeMap = new Map((employees || []).map(e => [e.id, e]));
      
      // Aggregate TNA items by course/topic and training type
      const aggregated = new Map<string, {
        item_name: string;
        course_id: string | null;
        training_type: string;
        training_location: string;
        department_ids: Set<string>;
        provider_id: string | null;
        unit_cost: number;
        cost_currency: string;
        participants: number;
        tna_ids: string[];
      }>();
      
      for (const item of (tnaItems || []) as any[]) {
        const trainingType = item.training_type || 'short_term';
        const trainingLocation = item.training_location || 'local';
        const key = `${item.course_id || item.competency_text || item.course_text}-${trainingType}-${trainingLocation}`;
        
        if (!aggregated.has(key)) {
          aggregated.set(key, {
            item_name: item.course?.name_en || item.competency?.name_en || item.competency_text || item.course_text || 'Unknown',
            course_id: item.course_id,
            training_type: trainingType,
            training_location: trainingLocation,
            department_ids: new Set(),
            provider_id: item.course?.provider_id || null,
            unit_cost: item.course?.cost_amount || item.estimated_cost || 0,
            cost_currency: item.course?.cost_currency || item.cost_currency || 'LYD',
            participants: 0,
            tna_ids: [],
          });
        }
        
        const agg = aggregated.get(key)!;
        agg.participants += 1;
        agg.tna_ids.push(item.id);
        
        const employee = employeeMap.get(item.submission?.employee_id);
        if (employee?.department_id) {
          agg.department_ids.add(employee.department_id);
        }
      }
      
      // Create plan items
      const planItems = Array.from(aggregated.values()).map(agg => ({
        plan_id: planId,
        item_name: agg.item_name,
        course_id: agg.course_id,
        training_type: agg.training_type,
        training_location: agg.training_location,
        department_id: agg.department_ids.size === 1 ? Array.from(agg.department_ids)[0] : null,
        provider_id: agg.provider_id,
        unit_cost: agg.unit_cost,
        cost_currency: agg.cost_currency,
        planned_participants: agg.participants,
        planned_sessions: Math.ceil(agg.participants / 20),
        is_catalogue_linked: !!agg.course_id,
        is_tna_backed: true,
        tna_item_count: agg.tna_ids.length,
        source_tna_ids: agg.tna_ids,
        created_by: user?.id,
      }));
      
      if (planItems.length > 0) {
        const { error: insertError } = await supabase
          .from('training_plan_items')
          .insert(planItems as any);
        
        if (insertError) throw insertError;
      }
      
      // Update plan totals
      const totalParticipants = planItems.reduce((sum, item) => sum + item.planned_participants, 0);
      const totalSessions = planItems.reduce((sum, item) => sum + item.planned_sessions, 0);
      const totalCost = planItems.reduce((sum, item) => sum + (item.unit_cost * item.planned_participants), 0);
      
      await supabase
        .from('training_plans')
        .update({
          total_participants: totalParticipants,
          total_sessions: totalSessions,
          total_estimated_cost: totalCost,
        } as any)
        .eq('id', planId);
      
      // Log audit
      await supabase.from('training_plan_audit_log').insert({
        plan_id: planId,
        action: 'generate_from_tna',
        details: { period_id: periodId, items_created: planItems.length },
      } as any);
      
      return { itemsCreated: planItems.length };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['training-plan', variables.planId] });
      queryClient.invalidateQueries({ queryKey: ['training-plan-items', variables.planId] });
      toast.success(`Generated ${result.itemsCreated} plan items from TNA`);
    },
    onError: (error) => {
      toast.error('Failed to generate plan: ' + error.message);
    },
  });
}

// Update plan status
export function useUpdatePlanStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      planId,
      status,
    }: {
      planId: string;
      status: TrainingPlan['status'];
    }) => {
      const updates: any = { status };
      
      // Set approval timestamps based on status
      if (status === 'under_corporate_review') {
        updates.area_reviewed_by = user?.id;
        updates.area_reviewed_at = new Date().toISOString();
      } else if (status === 'approved') {
        updates.corporate_reviewed_by = user?.id;
        updates.corporate_reviewed_at = new Date().toISOString();
        updates.approved_by = user?.id;
        updates.approved_at = new Date().toISOString();
      } else if (status === 'locked') {
        updates.locked_by = user?.id;
        updates.locked_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('training_plans')
        .update(updates)
        .eq('id', planId)
        .select()
        .single();
      
      if (error) throw error;
      
      // Log audit
      await supabase.from('training_plan_audit_log').insert({
        plan_id: planId,
        action: 'status_change',
        new_value: status,
      } as any);
      
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['training-plans'] });
      queryClient.invalidateQueries({ queryKey: ['training-plan', data.id] });
      toast.success('Plan status updated');
    },
    onError: (error) => {
      toast.error('Failed to update status: ' + error.message);
    },
  });
}

// Get plan summary statistics
export function usePlanSummary(planId: string | null) {
  return useQuery({
    queryKey: ['training-plan-summary', planId],
    queryFn: async () => {
      if (!planId) return null;
      
      const { data: items, error } = await supabase
        .from('training_plan_items')
        .select(`
          *,
          category:course_categories(id, name_en),
          department:departments(id, name_en)
        `)
        .eq('plan_id', planId)
        .eq('item_status', 'active');
      
      if (error) throw error;
      
      // Calculate summaries
      const byCategory = new Map<string, { name: string; participants: number; cost: number }>();
      const byDepartment = new Map<string, { name: string; participants: number; cost: number }>();
      const byQuarter = new Map<string, { participants: number; cost: number }>();
      const byType = { local: { participants: 0, cost: 0 }, abroad: { participants: 0, cost: 0 } };
      
      let totalParticipants = 0;
      let totalSessions = 0;
      let totalCost = 0;
      
      for (const item of (items || []) as any[]) {
        const itemCost = (item.unit_cost || 0) * (item.planned_participants || 0);
        
        totalParticipants += item.planned_participants || 0;
        totalSessions += item.planned_sessions || 0;
        totalCost += itemCost;
        
        // By category
        const catKey = item.category_id || 'uncategorized';
        const catName = item.category?.name_en || 'Uncategorized';
        if (!byCategory.has(catKey)) {
          byCategory.set(catKey, { name: catName, participants: 0, cost: 0 });
        }
        byCategory.get(catKey)!.participants += item.planned_participants || 0;
        byCategory.get(catKey)!.cost += itemCost;
        
        // By department
        const deptKey = item.department_id || 'unassigned';
        const deptName = item.department?.name_en || 'Unassigned';
        if (!byDepartment.has(deptKey)) {
          byDepartment.set(deptKey, { name: deptName, participants: 0, cost: 0 });
        }
        byDepartment.get(deptKey)!.participants += item.planned_participants || 0;
        byDepartment.get(deptKey)!.cost += itemCost;
        
        // By quarter
        const quarter = item.target_quarter || 'Unscheduled';
        if (!byQuarter.has(quarter)) {
          byQuarter.set(quarter, { participants: 0, cost: 0 });
        }
        byQuarter.get(quarter)!.participants += item.planned_participants || 0;
        byQuarter.get(quarter)!.cost += itemCost;
        
        // By location type
        if (item.training_location === 'abroad') {
          byType.abroad.participants += item.planned_participants || 0;
          byType.abroad.cost += itemCost;
        } else {
          byType.local.participants += item.planned_participants || 0;
          byType.local.cost += itemCost;
        }
      }
      
      return {
        totalParticipants,
        totalSessions,
        totalCost,
        totalItems: items?.length || 0,
        byCategory: Array.from(byCategory.values()),
        byDepartment: Array.from(byDepartment.values()),
        byQuarter: Array.from(byQuarter.entries()).map(([q, data]) => ({ quarter: q, ...data })),
        byType,
      };
    },
    enabled: !!planId,
  });
}

// Create new plan version (for scenarios like reduced budget)
export function useCreatePlanVersion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      sourcePlanId,
      versionName,
    }: {
      sourcePlanId: string;
      versionName: string;
    }) => {
      // Fetch source plan
      const { data: sourcePlan, error: sourceError } = await supabase
        .from('training_plans')
        .select('*')
        .eq('id', sourcePlanId)
        .single();
      
      if (sourceError) throw sourceError;
      
      // Get max version for this fiscal year
      const { data: existingPlans } = await supabase
        .from('training_plans')
        .select('version')
        .eq('fiscal_year', (sourcePlan as any).fiscal_year)
        .order('version', { ascending: false })
        .limit(1);
      
      const nextVersion = ((existingPlans as any)?.[0]?.version || 1) + 1;
      
      // Create new plan
      const { data: newPlan, error: createError } = await supabase
        .from('training_plans')
        .insert({
          name: versionName,
          description: `Version ${nextVersion} - based on ${(sourcePlan as any).name}`,
          fiscal_year: (sourcePlan as any).fiscal_year,
          tna_period_id: (sourcePlan as any).tna_period_id,
          version: nextVersion,
          status: 'draft',
          cost_currency: (sourcePlan as any).cost_currency,
          created_by: user?.id,
        } as any)
        .select()
        .single();
      
      if (createError) throw createError;
      
      // Copy plan items
      const { data: sourceItems, error: itemsError } = await supabase
        .from('training_plan_items')
        .select('*')
        .eq('plan_id', sourcePlanId)
        .eq('item_status', 'active');
      
      if (itemsError) throw itemsError;
      
      if (sourceItems && sourceItems.length > 0) {
        const newItems = (sourceItems as any[]).map(item => ({
          ...item,
          id: undefined, // Let DB generate new ID
          plan_id: (newPlan as any).id,
          created_at: undefined,
          updated_at: undefined,
        }));
        
        const { error: copyError } = await supabase
          .from('training_plan_items')
          .insert(newItems as any);
        
        if (copyError) throw copyError;
      }
      
      // Log audit
      await supabase.from('training_plan_audit_log').insert({
        plan_id: (newPlan as any).id,
        action: 'create_version',
        details: { source_plan_id: sourcePlanId, version: nextVersion },
      } as any);
      
      return newPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-plans'] });
      toast.success('Plan version created');
    },
    onError: (error) => {
      toast.error('Failed to create version: ' + error.message);
    },
  });
}

// Get plan versions
export function usePlanVersions(fiscalYear: string | null) {
  return useQuery({
    queryKey: ['training-plan-versions', fiscalYear],
    queryFn: async () => {
      if (!fiscalYear) return [];
      
      const { data, error } = await supabase
        .from('training_plans')
        .select('id, name, version, status, created_at')
        .eq('fiscal_year', fiscalYear)
        .order('version', { ascending: false });
      
      if (error) throw error;
      return data as { id: string; name: string; version: number; status: string; created_at: string }[];
    },
    enabled: !!fiscalYear,
  });
}
