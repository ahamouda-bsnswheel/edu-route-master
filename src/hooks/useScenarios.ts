import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface PlanScenario {
  id: string;
  name: string;
  description: string | null;
  basis_plan_id: string;
  basis_plan_version: number;
  owner_id: string;
  status: string;
  visibility_scope: string;
  global_budget_type: string | null;
  global_budget_value: number | null;
  baseline_total_cost: number | null;
  scenario_total_cost: number | null;
  baseline_total_participants: number | null;
  scenario_total_participants: number | null;
  include_priority_bands: string[] | null;
  cut_order: string[] | null;
  protected_categories: string[] | null;
  cut_abroad_first: boolean | null;
  entity_caps: Json;
  creation_progress: number | null;
  last_recalculation_at: string | null;
  promoted_to_plan_id: string | null;
  created_at: string;
  updated_at: string;
  training_plans?: { name: string; status: string } | null;
}

export interface ScenarioItem {
  id: string;
  scenario_id: string;
  course_id: string | null;
  course_name: string | null;
  entity_id: string | null;
  entity_name: string | null;
  category_id: string | null;
  category_name: string | null;
  priority_band: string | null;
  priority_score: number | null;
  baseline_volume: number;
  baseline_sessions: number;
  baseline_cost: number;
  baseline_cost_per_participant: number | null;
  scenario_volume: number;
  scenario_sessions: number;
  scenario_cost: number;
  volume_delta: number;
  cost_delta: number;
  is_locally_adjusted: boolean | null;
  local_adjustment_reason: string | null;
  is_protected: boolean | null;
  is_cut: boolean | null;
  is_abroad: boolean | null;
}

export interface ScenarioLevers {
  globalBudgetType?: 'percentage' | 'absolute';
  globalBudgetValue?: number;
  includePriorityBands?: string[];
  cutOrder?: string[];
  protectedCategories?: string[];
  cutAbroadFirst?: boolean;
  entityCaps?: Record<string, { type: 'percentage' | 'absolute'; value: number }>;
}

export function useScenarios(planId?: string) {
  return useQuery({
    queryKey: ['scenarios', planId],
    queryFn: async () => {
      let query = supabase
        .from('plan_scenarios')
        .select('*, training_plans!basis_plan_id (name, status)')
        .order('created_at', { ascending: false });

      if (planId) query = query.eq('basis_plan_id', planId);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as PlanScenario[];
    },
  });
}

export function useScenario(scenarioId: string | undefined) {
  return useQuery({
    queryKey: ['scenario', scenarioId],
    queryFn: async () => {
      if (!scenarioId) return null;
      const { data, error } = await supabase
        .from('plan_scenarios')
        .select('*, training_plans!basis_plan_id (name, status)')
        .eq('id', scenarioId)
        .single();
      if (error) throw error;
      return data as unknown as PlanScenario;
    },
    enabled: !!scenarioId,
    refetchInterval: (query) => {
      const data = query.state.data as PlanScenario | null | undefined;
      if (data?.status === 'creating') return 2000;
      return false;
    },
  });
}

export function useScenarioItems(scenarioId: string | undefined, options?: {
  page?: number;
  pageSize?: number;
  priorityBand?: string;
  showCutOnly?: boolean;
}) {
  const page = options?.page ?? 0;
  const pageSize = options?.pageSize ?? 50;

  return useQuery({
    queryKey: ['scenario-items', scenarioId, options],
    queryFn: async () => {
      if (!scenarioId) return { items: [], total: 0 };

      let query = supabase
        .from('scenario_items')
        .select('*', { count: 'exact' })
        .eq('scenario_id', scenarioId)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (options?.priorityBand) query = query.eq('priority_band', options.priorityBand);
      if (options?.showCutOnly) query = query.eq('is_cut', true);

      const { data, error, count } = await query;
      if (error) throw error;
      return { items: data as ScenarioItem[], total: count || 0 };
    },
    enabled: !!scenarioId,
  });
}

export function useCreateScenario() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { planId: string; planVersion: number; name: string; description?: string; visibilityScope?: string }) => {
      const response = await supabase.functions.invoke('manage-scenario', { body: { action: 'create', ...params } });
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      toast({ title: 'Scenario Created', description: 'Items are being copied in background.' });
    },
    onError: (error: Error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });
}

export function useRecalculateScenario() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { scenarioId: string; levers: ScenarioLevers }) => {
      const response = await supabase.functions.invoke('manage-scenario', { body: { action: 'recalculate', ...params } });
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scenario', variables.scenarioId] });
      queryClient.invalidateQueries({ queryKey: ['scenario-items', variables.scenarioId] });
      toast({ title: 'Recalculated', description: `Updated ${data.itemsUpdated} items.` });
    },
    onError: (error: Error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });
}

export function usePromoteScenario() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { scenarioId: string; newPlanName: string; newPlanDescription?: string }) => {
      const response = await supabase.functions.invoke('manage-scenario', { body: { action: 'promote', ...params } });
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      toast({ title: 'Promoted', description: `Plan "${data.newPlanName}" created.` });
    },
    onError: (error: Error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });
}

export function useLocalAdjustment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { scenarioId: string; itemId: string; newVolume: number; reason: string }) => {
      const response = await supabase.functions.invoke('manage-scenario', { body: { action: 'local_adjust', ...params } });
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scenario', variables.scenarioId] });
      queryClient.invalidateQueries({ queryKey: ['scenario-items', variables.scenarioId] });
      toast({ title: 'Adjustment Saved' });
    },
    onError: (error: Error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });
}

export function useUpdateScenarioStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { scenarioId: string; status: string }) => {
      const { error } = await supabase.from('plan_scenarios').update({ status: params.status }).eq('id', params.scenarioId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      toast({ title: 'Status Updated' });
    },
    onError: (error: Error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });
}

export function useDeleteScenario() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (scenarioId: string) => {
      const { error } = await supabase.from('plan_scenarios').delete().eq('id', scenarioId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      toast({ title: 'Scenario Deleted' });
    },
    onError: (error: Error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });
}

export function useScenarioComparison(scenarioIds: string[]) {
  return useQuery({
    queryKey: ['scenario-comparison', scenarioIds],
    queryFn: async () => {
      if (scenarioIds.length === 0) return [];
      const { data, error } = await supabase
        .from('plan_scenarios')
        .select('id, name, baseline_total_cost, scenario_total_cost, baseline_total_participants, scenario_total_participants')
        .in('id', scenarioIds);
      if (error) throw error;
      return data;
    },
    enabled: scenarioIds.length > 0,
  });
}
