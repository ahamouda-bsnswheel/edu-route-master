import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RiskScore {
  id: string;
  scholar_record_id: string;
  risk_score: number;
  risk_band: 'on_track' | 'watch' | 'at_risk' | 'critical';
  contributing_factors: Array<{
    factor: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
  }>;
  model_version: string;
  feature_snapshot: Record<string, any>;
  scored_at: string;
  is_override: boolean;
  override_by: string | null;
  override_reason: string | null;
  override_at: string | null;
  previous_band: string | null;
}

export interface RiskAlert {
  id: string;
  scholar_record_id: string;
  risk_score_id: string | null;
  previous_band: string | null;
  new_band: string;
  alert_type: 'escalation' | 'new_risk' | 'critical_threshold' | 'improvement';
  status: 'pending' | 'reviewed' | 'action_planned' | 'dismissed';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  notified_roles: string[];
  created_at: string;
}

export interface RiskConfig {
  id: string;
  config_key: string;
  config_value: Record<string, any>;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface RiskJob {
  id: string;
  job_type: 'batch' | 'single' | 'historical';
  status: 'pending' | 'running' | 'completed' | 'failed';
  total_count: number;
  processed_count: number;
  success_count: number;
  error_count: number;
  errors: any[];
  model_version: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
}

// Fetch latest risk score for a scholar
export function useScholarRiskScore(scholarRecordId: string | null) {
  return useQuery({
    queryKey: ['scholar-risk-score', scholarRecordId],
    queryFn: async () => {
      if (!scholarRecordId) return null;
      
      const { data, error } = await supabase
        .from('scholar_risk_scores')
        .select('*')
        .eq('scholar_record_id', scholarRecordId)
        .order('scored_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as unknown as RiskScore | null;
    },
    enabled: !!scholarRecordId,
  });
}

// Fetch risk score history for a scholar
export function useScholarRiskHistory(scholarRecordId: string | null) {
  return useQuery({
    queryKey: ['scholar-risk-history', scholarRecordId],
    queryFn: async () => {
      if (!scholarRecordId) return [];
      
      const { data, error } = await supabase
        .from('scholar_risk_scores')
        .select('*')
        .eq('scholar_record_id', scholarRecordId)
        .order('scored_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as unknown as RiskScore[];
    },
    enabled: !!scholarRecordId,
  });
}

// Fetch all risk alerts
export function useRiskAlerts(status?: string) {
  return useQuery({
    queryKey: ['risk-alerts', status],
    queryFn: async () => {
      let query = supabase
        .from('scholar_risk_alerts')
        .select(`
          *,
          scholar_record:scholar_records(
            id,
            employee_id,
            program_name,
            institution,
            country,
            status,
            employee:profiles!scholar_records_employee_id_fkey(
              first_name_en,
              last_name_en,
              employee_id,
              entity_id
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// Fetch risk configuration
export function useRiskConfig() {
  return useQuery({
    queryKey: ['risk-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scholar_risk_config')
        .select('*');
      
      if (error) throw error;
      
      const config: Record<string, RiskConfig> = {};
      (data as RiskConfig[]).forEach(c => {
        config[c.config_key] = c;
      });
      return config;
    },
  });
}

// Fetch risk jobs
export function useRiskJobs() {
  return useQuery({
    queryKey: ['risk-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scholar_risk_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as RiskJob[];
    },
  });
}

// Fetch risk dashboard stats
export function useRiskDashboardStats() {
  return useQuery({
    queryKey: ['risk-dashboard-stats'],
    queryFn: async () => {
      // Get latest scores for each scholar
      const { data: scores, error } = await supabase
        .from('scholar_risk_scores')
        .select(`
          risk_band,
          scholar_record:scholar_records(
            id,
            country,
            degree_level,
            status,
            employee:profiles!scholar_records_employee_id_fkey(entity_id)
          )
        `)
        .eq('is_override', false)
        .order('scored_at', { ascending: false });
      
      if (error) throw error;

      // Group by scholar to get latest score only
      const latestByScholar = new Map<string, any>();
      scores?.forEach(s => {
        const scholarId = (s.scholar_record as any)?.id;
        if (scholarId && !latestByScholar.has(scholarId)) {
          latestByScholar.set(scholarId, s);
        }
      });

      const uniqueScores = Array.from(latestByScholar.values());

      // Calculate distribution
      const distribution = {
        on_track: uniqueScores.filter(s => s.risk_band === 'on_track').length,
        watch: uniqueScores.filter(s => s.risk_band === 'watch').length,
        at_risk: uniqueScores.filter(s => s.risk_band === 'at_risk').length,
        critical: uniqueScores.filter(s => s.risk_band === 'critical').length,
      };

      // Get pending alerts count
      const { count: pendingAlerts } = await supabase
        .from('scholar_risk_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      return {
        distribution,
        total: uniqueScores.length,
        pendingAlerts: pendingAlerts || 0,
      };
    },
  });
}

// Trigger risk scoring for a single scholar
export function useTriggerRiskScoring() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (scholarRecordId: string) => {
      const { data, error } = await supabase.functions.invoke('score-scholar-risk', {
        body: { scholar_record_id: scholarRecordId, batch_mode: false },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, scholarRecordId) => {
      queryClient.invalidateQueries({ queryKey: ['scholar-risk-score', scholarRecordId] });
      queryClient.invalidateQueries({ queryKey: ['scholar-risk-history', scholarRecordId] });
      queryClient.invalidateQueries({ queryKey: ['risk-dashboard-stats'] });
      toast.success('Risk score calculated successfully');
    },
    onError: (error) => {
      toast.error('Failed to calculate risk score');
      console.error(error);
    },
  });
}

// Trigger batch risk scoring
export function useTriggerBatchScoring() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      // Create job record
      const { data: job, error: jobError } = await supabase
        .from('scholar_risk_jobs')
        .insert({
          job_type: 'batch',
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (jobError) throw jobError;

      // Trigger scoring
      const { data, error } = await supabase.functions.invoke('score-scholar-risk', {
        body: { batch_mode: true },
      });
      
      if (error) {
        await supabase
          .from('scholar_risk_jobs')
          .update({ status: 'failed', completed_at: new Date().toISOString() })
          .eq('id', job.id);
        throw error;
      }

      // Update job record
      await supabase
        .from('scholar_risk_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          total_count: data.scored + data.errors,
          processed_count: data.scored + data.errors,
          success_count: data.scored,
          error_count: data.errors,
        })
        .eq('id', job.id);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['risk-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['risk-jobs'] });
      toast.success('Batch risk scoring completed');
    },
    onError: (error) => {
      toast.error('Batch scoring failed');
      console.error(error);
    },
  });
}

// Override risk band
export function useOverrideRiskBand() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      scholarRecordId, 
      newBand, 
      reason 
    }: { 
      scholarRecordId: string; 
      newBand: string; 
      reason: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current score
      const { data: currentScore } = await supabase
        .from('scholar_risk_scores')
        .select('*')
        .eq('scholar_record_id', scholarRecordId)
        .order('scored_at', { ascending: false })
        .limit(1)
        .single();

      // Create override score
      const { data, error } = await supabase
        .from('scholar_risk_scores')
        .insert({
          scholar_record_id: scholarRecordId,
          risk_score: currentScore?.risk_score || 0,
          risk_band: newBand,
          contributing_factors: currentScore?.contributing_factors || [],
          feature_snapshot: currentScore?.feature_snapshot || {},
          model_version: 'manual-override',
          is_override: true,
          override_by: user.id,
          override_reason: reason,
          override_at: new Date().toISOString(),
          previous_band: currentScore?.risk_band,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Update scholar_records
      await supabase
        .from('scholar_records')
        .update({ 
          risk_level: newBand,
          risk_override: true,
          risk_override_by: user.id,
          risk_override_reason: reason,
          risk_override_at: new Date().toISOString(),
        })
        .eq('id', scholarRecordId);

      return data;
    },
    onSuccess: (_, { scholarRecordId }) => {
      queryClient.invalidateQueries({ queryKey: ['scholar-risk-score', scholarRecordId] });
      queryClient.invalidateQueries({ queryKey: ['scholar-risk-history', scholarRecordId] });
      queryClient.invalidateQueries({ queryKey: ['risk-dashboard-stats'] });
      toast.success('Risk status overridden successfully');
    },
    onError: (error) => {
      toast.error('Failed to override risk status');
      console.error(error);
    },
  });
}

// Update risk alert status
export function useUpdateRiskAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      alertId, 
      status, 
      notes 
    }: { 
      alertId: string; 
      status: string; 
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('scholar_risk_alerts')
        .update({
          status,
          review_notes: notes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', alertId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['risk-dashboard-stats'] });
      toast.success('Alert updated');
    },
    onError: (error) => {
      toast.error('Failed to update alert');
      console.error(error);
    },
  });
}

// Update risk configuration
export function useUpdateRiskConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      configKey, 
      configValue 
    }: { 
      configKey: string; 
      configValue: Record<string, any>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('scholar_risk_config')
        .update({
          config_value: configValue,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('config_key', configKey)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-config'] });
      toast.success('Configuration updated');
    },
    onError: (error) => {
      toast.error('Failed to update configuration');
      console.error(error);
    },
  });
}
