import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AIPriorityConfig {
  id: string;
  config_name: string;
  is_active: boolean;
  hse_criticality_weight: number;
  competency_gap_weight: number;
  manager_priority_weight: number;
  role_criticality_weight: number;
  compliance_status_weight: number;
  cost_efficiency_weight: number;
  strategic_alignment_weight: number;
  critical_threshold: number;
  high_threshold: number;
  medium_threshold: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface AIPriorityScore {
  id: string;
  tna_item_id: string | null;
  plan_item_id: string | null;
  priority_score: number;
  priority_band: 'critical' | 'high' | 'medium' | 'low';
  hse_contribution: number;
  competency_gap_contribution: number;
  manager_priority_contribution: number;
  role_criticality_contribution: number;
  compliance_contribution: number;
  cost_contribution: number;
  strategic_contribution: number;
  explanation_summary: string | null;
  factor_details: any[];
  model_version: string;
  config_version: number;
  is_overridden: boolean;
  original_score: number | null;
  original_band: string | null;
  overridden_by: string | null;
  overridden_at: string | null;
  override_reason: string | null;
  scored_at: string;
}

export interface AIScoringJob {
  id: string;
  job_name: string | null;
  job_type: string;
  tna_period_id: string | null;
  plan_id: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  total_items: number;
  processed_items: number;
  success_count: number;
  error_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// Fetch active config
export function useAIPriorityConfig() {
  return useQuery({
    queryKey: ['ai-priority-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_priority_config')
        .select('*')
        .eq('is_active', true)
        .single();
      
      if (error) throw error;
      return data as unknown as AIPriorityConfig;
    },
  });
}

// Update config
export function useUpdateAIPriorityConfig() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (updates: Partial<AIPriorityConfig> & { id: string }) => {
      const { id, ...rest } = updates;
      
      // Increment version
      const { data: current } = await supabase
        .from('ai_priority_config')
        .select('version')
        .eq('id', id)
        .single();
      
      const { data, error } = await supabase
        .from('ai_priority_config')
        .update({
          ...rest,
          version: ((current as any)?.version || 1) + 1,
        } as any)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Log audit
      await supabase.from('ai_priority_audit_log').insert({
        entity_type: 'config',
        entity_id: id,
        action: 'update',
        actor_id: user?.id,
        old_value: current,
        new_value: rest,
      } as any);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-priority-config'] });
      toast.success('AI priority configuration updated');
    },
    onError: (error) => {
      toast.error('Failed to update config: ' + error.message);
    },
  });
}

// Fetch scores for TNA items
export function useTNAPriorityScores(periodId: string | null) {
  return useQuery({
    queryKey: ['ai-priority-scores', 'tna', periodId],
    queryFn: async () => {
      if (!periodId) return [];
      
      // Get TNA items for period
      const { data: submissions } = await supabase
        .from('tna_submissions')
        .select('id')
        .eq('period_id', periodId);
      
      if (!submissions || submissions.length === 0) return [];
      
      const submissionIds = submissions.map(s => s.id);
      
      const { data: items } = await supabase
        .from('tna_items')
        .select('id')
        .in('submission_id', submissionIds);
      
      if (!items || items.length === 0) return [];
      
      const itemIds = items.map(i => i.id);
      
      const { data: scores, error } = await supabase
        .from('ai_priority_scores')
        .select('*')
        .in('tna_item_id', itemIds);
      
      if (error) throw error;
      return (scores || []) as unknown as AIPriorityScore[];
    },
    enabled: !!periodId,
  });
}

// Fetch scores for plan items
export function usePlanPriorityScores(planId: string | null) {
  return useQuery({
    queryKey: ['ai-priority-scores', 'plan', planId],
    queryFn: async () => {
      if (!planId) return [];
      
      const { data: items } = await supabase
        .from('training_plan_items')
        .select('id')
        .eq('plan_id', planId);
      
      if (!items || items.length === 0) return [];
      
      const itemIds = items.map(i => i.id);
      
      const { data: scores, error } = await supabase
        .from('ai_priority_scores')
        .select('*')
        .in('plan_item_id', itemIds);
      
      if (error) throw error;
      return (scores || []) as unknown as AIPriorityScore[];
    },
    enabled: !!planId,
  });
}

// Score single item
export function useScoreSingleItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ tnaItemId, planItemId }: { tnaItemId?: string; planItemId?: string }) => {
      const { data, error } = await supabase.functions.invoke('score-training-priority', {
        body: {
          type: 'single',
          tna_item_id: tnaItemId,
          plan_item_id: planItemId,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      if (variables.tnaItemId) {
        queryClient.invalidateQueries({ queryKey: ['ai-priority-scores', 'tna'] });
      }
      if (variables.planItemId) {
        queryClient.invalidateQueries({ queryKey: ['ai-priority-scores', 'plan'] });
      }
      toast.success('Item scored successfully');
    },
    onError: (error) => {
      toast.error('Failed to score item: ' + error.message);
    },
  });
}

// Start batch scoring
export function useStartBatchScoring() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ tnaPeriodId, planId }: { tnaPeriodId?: string; planId?: string }) => {
      const { data, error } = await supabase.functions.invoke('score-training-priority', {
        body: {
          type: 'batch',
          tna_period_id: tnaPeriodId,
          plan_id: planId,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-scoring-jobs'] });
      toast.success('Batch scoring started');
    },
    onError: (error) => {
      toast.error('Failed to start batch scoring: ' + error.message);
    },
  });
}

// Fetch scoring jobs
export function useAIScoringJobs() {
  return useQuery({
    queryKey: ['ai-scoring-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_scoring_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return (data || []) as unknown as AIScoringJob[];
    },
    refetchInterval: 5000, // Poll for updates
  });
}

// Override priority
export function useOverridePriority() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      scoreId,
      newBand,
      newScore,
      reason,
    }: {
      scoreId: string;
      newBand: string;
      newScore?: number;
      reason: string;
    }) => {
      // Get current score
      const { data: current, error: fetchError } = await supabase
        .from('ai_priority_scores')
        .select('priority_score, priority_band')
        .eq('id', scoreId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const { data, error } = await supabase
        .from('ai_priority_scores')
        .update({
          priority_band: newBand,
          priority_score: newScore || (current as any).priority_score,
          is_overridden: true,
          original_score: (current as any).priority_score,
          original_band: (current as any).priority_band,
          overridden_by: user?.id,
          overridden_at: new Date().toISOString(),
          override_reason: reason,
        } as any)
        .eq('id', scoreId)
        .select()
        .single();
      
      if (error) throw error;
      
      // Log audit
      await supabase.from('ai_priority_audit_log').insert({
        entity_type: 'override',
        entity_id: scoreId,
        action: 'override',
        actor_id: user?.id,
        old_value: { score: (current as any).priority_score, band: (current as any).priority_band },
        new_value: { score: newScore || (current as any).priority_score, band: newBand, reason },
      } as any);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-priority-scores'] });
      toast.success('Priority overridden successfully');
    },
    onError: (error) => {
      toast.error('Failed to override priority: ' + error.message);
    },
  });
}

// Get priority distribution summary
export function usePriorityDistribution(periodId?: string, planId?: string) {
  return useQuery({
    queryKey: ['ai-priority-distribution', periodId, planId],
    queryFn: async () => {
      let query = supabase
        .from('ai_priority_scores')
        .select('priority_band, priority_score, is_overridden');
      
      // This is a simplified version - in production would need better filtering
      const { data, error } = await query;
      
      if (error) throw error;
      
      const distribution = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        overridden: 0,
        total: 0,
        avgScore: 0,
      };
      
      let totalScore = 0;
      for (const score of (data || []) as any[]) {
        distribution[score.priority_band as keyof typeof distribution]++;
        distribution.total++;
        totalScore += score.priority_score;
        if (score.is_overridden) distribution.overridden++;
      }
      
      distribution.avgScore = distribution.total > 0 
        ? Math.round(totalScore / distribution.total) 
        : 0;
      
      return distribution;
    },
  });
}
