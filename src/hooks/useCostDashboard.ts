import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type BudgetStatus = 'draft' | 'active' | 'revised' | 'closed';
export type BudgetPeriodType = 'annual' | 'quarterly' | 'monthly';

export interface TrainingBudget {
  id: string;
  fiscal_year: number;
  period_type: BudgetPeriodType;
  period_number: number;
  entity: string | null;
  cost_centre: string | null;
  training_category: string | null;
  budget_type: string;
  budget_amount: number;
  currency: string;
  version: number;
  version_name: string;
  status: BudgetStatus;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  activated_at: string | null;
}

export interface CostSummary {
  totalCost: number;
  tuitionCost: number;
  travelCost: number;
  perDiemCost: number;
  sessionCount: number;
  participantCount: number;
  tripCount: number;
  abroadCost: number;
  localCost: number;
  totalBudget: number;
  budgetUsedPercentage: number;
  byCategory: Record<string, number>;
  byEntity: Record<string, number>;
  byMonth: Record<string, number>;
}

export interface EntityCost {
  entity: string;
  tuitionCost: number;
  travelCost: number;
  perDiemCost: number;
  totalCost: number;
  budget: number;
  variance: number;
  percentUsed: number;
  sessionCount: number;
  participantCount: number;
  categories: Record<string, number>;
}

export interface ProviderCost {
  providerId: string;
  providerName: string;
  tuitionCost: number;
  travelCost: number;
  perDiemCost: number;
  totalCost: number;
  sessionCount: number;
  participantCount: number;
  destinations: string[];
  destinationCount: number;
  avgCostPerParticipant: number;
  travelTuitionRatio: number;
}

export interface DestinationCost {
  country: string;
  city: string;
  travelCost: number;
  perDiemCost: number;
  tuitionCost: number;
  totalCost: number;
  participantCount: number;
  tripCount: number;
  avgCostPerParticipant: number;
  travelPerDiemTotal: number;
}

export interface BudgetThreshold {
  id: string;
  threshold_name: string;
  threshold_type: string;
  threshold_percentage: number;
  applies_to: string;
  entity_filter: string[] | null;
  category_filter: string[] | null;
  requires_approval_role: string | null;
  is_active: boolean;
}

export interface CostAnomaly {
  id: string;
  rule_id: string;
  detected_at: string;
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  expected_value: number | null;
  actual_value: number | null;
  variance_percentage: number | null;
  severity: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  cost_anomaly_rules?: { rule_name: string };
}

export interface BudgetImpact {
  totalBudget: number;
  currentSpend: number;
  estimatedCost: number;
  projectedSpend: number;
  remainingBefore: number;
  remainingAfter: number;
  percentageUsedBefore: number;
  percentageUsedAfter: number;
  breachedThresholds: any[];
  requiresAdditionalApproval: boolean;
}

// Dashboard Summary
export function useDashboardSummary(filters?: { fiscalYear?: number; entity?: string; category?: string }) {
  return useQuery({
    queryKey: ['cost-dashboard-summary', filters],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-cost-dashboard', {
        body: { action: 'get_dashboard_summary', filters },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.summary as CostSummary;
    },
  });
}

// Entity Costs
export function useEntityCosts(filters?: { fiscalYear?: number }) {
  return useQuery({
    queryKey: ['cost-entity-costs', filters],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-cost-dashboard', {
        body: { action: 'get_entity_costs', filters },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.entities as EntityCost[];
    },
  });
}

// Provider Costs
export function useProviderCosts(filters?: { fiscalYear?: number }) {
  return useQuery({
    queryKey: ['cost-provider-costs', filters],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-cost-dashboard', {
        body: { action: 'get_provider_costs', filters },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.providers as ProviderCost[];
    },
  });
}

// Destination Costs
export function useDestinationCosts(filters?: { fiscalYear?: number }) {
  return useQuery({
    queryKey: ['cost-destination-costs', filters],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-cost-dashboard', {
        body: { action: 'get_destination_costs', filters },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.destinations as DestinationCost[];
    },
  });
}

// Budgets
export function useBudgets(filters?: { fiscalYear?: number; entity?: string; category?: string }) {
  return useQuery({
    queryKey: ['cost-budgets', filters],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-cost-dashboard', {
        body: { action: 'get_budgets', filters },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.budgets as TrainingBudget[];
    },
  });
}

// Save Budget
export function useSaveBudget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { budget: Partial<TrainingBudget>; budgetId?: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-cost-dashboard', {
        body: { action: 'save_budget', ...params },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.budget as TrainingBudget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['cost-dashboard-summary'] });
      toast({ title: 'Budget saved successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error saving budget', description: error.message, variant: 'destructive' });
    },
  });
}

// Import Budgets
export function useImportBudgets() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (budgets: Partial<TrainingBudget>[]) => {
      const { data, error } = await supabase.functions.invoke('manage-cost-dashboard', {
        body: { action: 'import_budgets', budgets },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.imported as number;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['cost-budgets'] });
      toast({ title: `Imported ${count} budgets successfully` });
    },
    onError: (error: Error) => {
      toast({ title: 'Error importing budgets', description: error.message, variant: 'destructive' });
    },
  });
}

// Activate Budget
export function useActivateBudget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (budgetId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-cost-dashboard', {
        body: { action: 'activate_budget', budgetId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.budget as TrainingBudget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['cost-dashboard-summary'] });
      toast({ title: 'Budget activated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error activating budget', description: error.message, variant: 'destructive' });
    },
  });
}

// Thresholds
export function useThresholds() {
  return useQuery({
    queryKey: ['cost-thresholds'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-cost-dashboard', {
        body: { action: 'get_thresholds' },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.thresholds as BudgetThreshold[];
    },
  });
}

// Save Threshold
export function useSaveThreshold() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { threshold: Partial<BudgetThreshold>; thresholdId?: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-cost-dashboard', {
        body: { action: 'save_threshold', ...params },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.threshold as BudgetThreshold;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-thresholds'] });
      toast({ title: 'Threshold saved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error saving threshold', description: error.message, variant: 'destructive' });
    },
  });
}

// Anomalies
export function useAnomalies(filters?: { fiscalYear?: number }) {
  return useQuery({
    queryKey: ['cost-anomalies', filters],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-cost-dashboard', {
        body: { action: 'get_anomalies', filters },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.anomalies as CostAnomaly[];
    },
  });
}

// Review Anomaly
export function useReviewAnomaly() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { anomalyId: string; reviewStatus: string; reviewNotes?: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-cost-dashboard', {
        body: { action: 'review_anomaly', ...params },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.anomaly as CostAnomaly;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-anomalies'] });
      toast({ title: 'Anomaly reviewed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error reviewing anomaly', description: error.message, variant: 'destructive' });
    },
  });
}

// Refresh Analytics
export function useRefreshAnalytics() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (filters?: { fiscalYear?: number }) => {
      const { data, error } = await supabase.functions.invoke('manage-cost-dashboard', {
        body: { action: 'refresh_analytics', filters },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cost-dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['cost-entity-costs'] });
      queryClient.invalidateQueries({ queryKey: ['cost-provider-costs'] });
      queryClient.invalidateQueries({ queryKey: ['cost-destination-costs'] });
      toast({ title: `Analytics refreshed: ${data.recordsCreated} records` });
    },
    onError: (error: Error) => {
      toast({ title: 'Error refreshing analytics', description: error.message, variant: 'destructive' });
    },
  });
}

// Export Costs
export function useExportCosts() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { filters?: any; exportType?: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-cost-dashboard', {
        body: { action: 'export_costs', ...params },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({ title: `Exported ${data.rowCount} rows` });
    },
    onError: (error: Error) => {
      toast({ title: 'Error exporting data', description: error.message, variant: 'destructive' });
    },
  });
}

// Check Budget Impact
export function useBudgetImpact(filters?: { fiscalYear?: number; entity?: string; category?: string }, estimatedCost?: number) {
  return useQuery({
    queryKey: ['cost-budget-impact', filters, estimatedCost],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-cost-dashboard', {
        body: { action: 'check_budget_impact', filters, estimatedCost },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.impact as BudgetImpact;
    },
    enabled: estimatedCost !== undefined && estimatedCost > 0,
  });
}

// Budget Audit Log
export function useBudgetAudit(budgetId?: string) {
  return useQuery({
    queryKey: ['cost-budget-audit', budgetId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-cost-dashboard', {
        body: { action: 'get_budget_audit', budgetId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.auditLog;
    },
  });
}

// Status labels and colors
export const budgetStatusLabels: Record<BudgetStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  revised: 'Revised',
  closed: 'Closed',
};

export const budgetStatusColors: Record<BudgetStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-green-100 text-green-800',
  revised: 'bg-amber-100 text-amber-800',
  closed: 'bg-gray-100 text-gray-800',
};
