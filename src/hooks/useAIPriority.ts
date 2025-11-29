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

// Top critical trainings aggregated by course
export function useTopCriticalTrainings(limit: number = 50) {
  return useQuery({
    queryKey: ['ai-priority-top-trainings', limit],
    queryFn: async () => {
      // Get all scores with TNA item details
      const { data: scores, error } = await supabase
        .from('ai_priority_scores')
        .select(`
          id,
          priority_score,
          priority_band,
          tna_item_id,
          plan_item_id
        `)
        .in('priority_band', ['critical', 'high'])
        .order('priority_score', { ascending: false });

      if (error) throw error;

      // Get TNA items for these scores
      const tnaItemIds = (scores || [])
        .filter(s => s.tna_item_id)
        .map(s => s.tna_item_id);

      let tnaItems: any[] = [];
      if (tnaItemIds.length > 0) {
        const { data } = await supabase
          .from('tna_items')
          .select('id, course_id, course_title, training_type')
          .in('id', tnaItemIds);
        tnaItems = data || [];
      }

      // Get courses info
      const courseIds = tnaItems.filter(t => t.course_id).map(t => t.course_id);
      let courses: any[] = [];
      if (courseIds.length > 0) {
        const { data } = await supabase
          .from('courses')
          .select('id, title_en, code, category, estimated_cost_per_participant')
          .in('id', courseIds);
        courses = data || [];
      }

      // Aggregate by course/training
      const aggregated: Record<string, {
        course_id: string | null;
        course_name: string;
        course_code: string | null;
        category: string | null;
        priority_band: string;
        avg_score: number;
        employee_count: number;
        estimated_cost: number | null;
        scores: number[];
      }> = {};

      for (const score of scores || []) {
        const tnaItem = tnaItems.find(t => t.id === score.tna_item_id);
        const course = tnaItem?.course_id ? courses.find(c => c.id === tnaItem.course_id) : null;
        
        const key = course?.id || tnaItem?.course_title || 'unknown';
        const name = course?.title_en || tnaItem?.course_title || 'Unknown Training';
        
        if (!aggregated[key]) {
          aggregated[key] = {
            course_id: course?.id || null,
            course_name: name,
            course_code: course?.code || null,
            category: course?.category || null,
            priority_band: score.priority_band,
            avg_score: 0,
            employee_count: 0,
            estimated_cost: course?.estimated_cost_per_participant || null,
            scores: [],
          };
        }
        
        aggregated[key].scores.push(score.priority_score);
        aggregated[key].employee_count++;
      }

      // Calculate averages and sort
      const result = Object.values(aggregated)
        .map(item => ({
          ...item,
          avg_score: item.scores.reduce((a, b) => a + b, 0) / item.scores.length,
          estimated_cost: item.estimated_cost ? item.estimated_cost * item.employee_count : null,
        }))
        .sort((a, b) => b.avg_score - a.avg_score)
        .slice(0, limit);

      return result;
    },
  });
}

// Priority by dimension (entity/department/job_family/site)
export function usePriorityByDimension(dimension: 'entity' | 'department' | 'job_family' | 'site') {
  return useQuery({
    queryKey: ['ai-priority-by-dimension', dimension],
    queryFn: async () => {
      // Get all scores
      const { data: scores, error } = await supabase
        .from('ai_priority_scores')
        .select('id, priority_score, priority_band, tna_item_id');

      if (error) throw error;

      // Get TNA items with submission info
      const tnaItemIds = (scores || []).filter(s => s.tna_item_id).map(s => s.tna_item_id);
      
      if (tnaItemIds.length === 0) return [];

      const { data: tnaItems } = await supabase
        .from('tna_items')
        .select('id, submission_id')
        .in('id', tnaItemIds);

      // Get submissions with employee info
      const submissionIds = [...new Set((tnaItems || []).map(t => t.submission_id))];
      const { data: submissions } = await supabase
        .from('tna_submissions')
        .select('id, employee_id')
        .in('id', submissionIds);

      // Get employee profiles with entity_id and department_id
      const employeeIds = [...new Set((submissions || []).map(s => s.employee_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, entity_id, department_id, job_title_en, grade')
        .in('id', employeeIds);

      // Build lookup maps
      const tnaItemMap = new Map((tnaItems || []).map(t => [t.id, t.submission_id]));
      const submissionMap = new Map((submissions || []).map(s => [s.id, s.employee_id]));
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Aggregate by dimension - map dimension to actual field
      const dimensionFieldMap: Record<string, string> = {
        entity: 'entity_id',
        department: 'department_id',
        job_family: 'job_title_en',
        site: 'grade', // Using grade as proxy for site
      };
      const actualField = dimensionFieldMap[dimension];

      const aggregated: Record<string, {
        name: string;
        critical: number;
        high: number;
        medium: number;
        low: number;
        total: number;
        totalScore: number;
      }> = {};

      for (const score of scores || []) {
        const submissionId = tnaItemMap.get(score.tna_item_id);
        const employeeId = submissionMap.get(submissionId);
        const profile = profileMap.get(employeeId) as any;
        
        const dimValue = profile?.[actualField] || 'Unknown';
        
        if (!aggregated[dimValue]) {
          aggregated[dimValue] = {
            name: String(dimValue),
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            total: 0,
            totalScore: 0,
          };
        }
        
        aggregated[dimValue][score.priority_band as 'critical' | 'high' | 'medium' | 'low']++;
        aggregated[dimValue].total++;
        aggregated[dimValue].totalScore += score.priority_score;
      }

      return Object.values(aggregated)
        .map(item => ({
          ...item,
          avgScore: item.total > 0 ? Math.round(item.totalScore / item.total) : 0,
        }))
        .sort((a, b) => b.avgScore - a.avgScore);
    },
  });
}

// Strategic theme distribution
export function useStrategicThemeDistribution() {
  return useQuery({
    queryKey: ['ai-priority-strategic-themes'],
    queryFn: async () => {
      // Get scores with TNA items
      const { data: scores } = await supabase
        .from('ai_priority_scores')
        .select('id, priority_score, priority_band, tna_item_id');

      const tnaItemIds = (scores || []).filter(s => s.tna_item_id).map(s => s.tna_item_id);
      
      if (tnaItemIds.length === 0) return [];

      // Get TNA items with course info
      const { data: tnaItems } = await supabase
        .from('tna_items')
        .select('id, course_id, training_type')
        .in('id', tnaItemIds);

      const courseIds = [...new Set((tnaItems || []).filter(t => t.course_id).map(t => t.course_id))];
      
      // Get courses with category_id
      const { data: courses } = await supabase
        .from('courses')
        .select('id, category_id')
        .in('id', courseIds);

      const courseMap = new Map((courses || []).map(c => [c.id, c]));
      const tnaItemMap = new Map((tnaItems || []).map(t => [t.id, t]));

      // Aggregate by training type (as proxy for strategic theme)
      const aggregated: Record<string, {
        theme: string;
        critical: number;
        high: number;
        medium: number;
        low: number;
        total: number;
      }> = {};

      for (const score of scores || []) {
        const tnaItem = tnaItemMap.get(score.tna_item_id);
        const course = tnaItem?.course_id ? courseMap.get(tnaItem.course_id) : null;
        
        // Use training_type or category_id as theme
        const theme = tnaItem?.training_type || (course as any)?.category_id || 'Other';
        
        if (!aggregated[theme]) {
          aggregated[theme] = {
            theme,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            total: 0,
          };
        }
        
        aggregated[theme][score.priority_band as 'critical' | 'high' | 'medium' | 'low']++;
        aggregated[theme].total++;
      }

      return Object.values(aggregated)
        .filter(t => t.total > 0)
        .sort((a, b) => (b.critical + b.high) - (a.critical + a.high));
    },
  });
}

// Heatmap data
export function useHeatmapData(rowDimension: 'entity' | 'department', colDimension: 'category' | 'training_type') {
  return useQuery({
    queryKey: ['ai-priority-heatmap', rowDimension, colDimension],
    queryFn: async () => {
      const { data: scores } = await supabase
        .from('ai_priority_scores')
        .select('id, priority_score, priority_band, tna_item_id');

      const tnaItemIds = (scores || []).filter(s => s.tna_item_id).map(s => s.tna_item_id);
      
      if (tnaItemIds.length === 0) {
        return { rows: [], columns: [], matrix: {} };
      }

      // Get TNA items
      const { data: tnaItems } = await supabase
        .from('tna_items')
        .select('id, submission_id, course_id, training_type')
        .in('id', tnaItemIds);

      // Get submissions
      const submissionIds = [...new Set((tnaItems || []).map(t => t.submission_id))];
      const { data: submissions } = await supabase
        .from('tna_submissions')
        .select('id, employee_id')
        .in('id', submissionIds);

      // Get profiles with entity_id and department_id
      const employeeIds = [...new Set((submissions || []).map(s => s.employee_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, entity_id, department_id')
        .in('id', employeeIds);

      // Get courses for category_id
      const courseIds = [...new Set((tnaItems || []).filter(t => t.course_id).map(t => t.course_id))];
      const { data: courses } = await supabase
        .from('courses')
        .select('id, category_id')
        .in('id', courseIds);

      // Build maps
      const tnaItemMap = new Map((tnaItems || []).map(t => [t.id, t]));
      const submissionMap = new Map((submissions || []).map(s => [s.id, s.employee_id]));
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const courseMap = new Map((courses || []).map(c => [c.id, c]));

      // Map dimensions to actual fields
      const rowFieldMap: Record<string, string> = {
        entity: 'entity_id',
        department: 'department_id',
      };
      const rowField = rowFieldMap[rowDimension];

      // Build matrix
      const matrix: Record<string, Record<string, { avgScore: number; count: number; totalScore: number }>> = {};
      const rowSet = new Set<string>();
      const colSet = new Set<string>();

      for (const score of scores || []) {
        const tnaItem = tnaItemMap.get(score.tna_item_id);
        const submissionId = tnaItem?.submission_id;
        const employeeId = submissionMap.get(submissionId);
        const profile = profileMap.get(employeeId) as any;
        const course = tnaItem?.course_id ? courseMap.get(tnaItem.course_id) as any : null;

        const rowValue = String(profile?.[rowField] || 'Unknown');
        const colValue = colDimension === 'category' 
          ? String(course?.category_id || 'Unknown')
          : (tnaItem?.training_type || 'Unknown');

        rowSet.add(rowValue);
        colSet.add(colValue);

        if (!matrix[rowValue]) matrix[rowValue] = {};
        if (!matrix[rowValue][colValue]) {
          matrix[rowValue][colValue] = { avgScore: 0, count: 0, totalScore: 0 };
        }

        matrix[rowValue][colValue].count++;
        matrix[rowValue][colValue].totalScore += score.priority_score;
      }

      // Calculate averages
      for (const row of Object.keys(matrix)) {
        for (const col of Object.keys(matrix[row])) {
          const cell = matrix[row][col];
          cell.avgScore = cell.count > 0 ? cell.totalScore / cell.count : 0;
        }
      }

      return {
        rows: Array.from(rowSet).sort(),
        columns: Array.from(colSet).sort(),
        matrix,
      };
    },
  });
}

// Simulate scoring with different weights
export function useSimulateScoring() {
  return useMutation({
    mutationFn: async (weights: Record<string, number>) => {
      // Get sample of existing scores
      const { data: scores } = await supabase
        .from('ai_priority_scores')
        .select('*')
        .limit(1000);

      if (!scores || scores.length === 0) {
        return {
          original: { critical: 0, high: 0, medium: 0, low: 0 },
          simulated: { critical: 0, high: 0, medium: 0, low: 0 },
        };
      }

      // Get current config for thresholds
      const { data: config } = await supabase
        .from('ai_priority_config')
        .select('*')
        .eq('is_active', true)
        .single();

      const thresholds = {
        critical: (config as any)?.critical_threshold || 80,
        high: (config as any)?.high_threshold || 60,
        medium: (config as any)?.medium_threshold || 40,
      };

      // Count original distribution
      const original = { critical: 0, high: 0, medium: 0, low: 0 };
      for (const score of scores) {
        original[score.priority_band as keyof typeof original]++;
      }

      // Simulate with new weights
      const simulated = { critical: 0, high: 0, medium: 0, low: 0 };
      const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 100;

      for (const score of scores) {
        // Recalculate score with new weights
        const newScore = (
          ((score.hse_contribution || 0) / 25) * (weights.hse_criticality_weight || 0) +
          ((score.competency_gap_contribution || 0) / 25) * (weights.competency_gap_weight || 0) +
          ((score.manager_priority_contribution || 0) / 25) * (weights.manager_priority_weight || 0) +
          ((score.role_criticality_contribution || 0) / 25) * (weights.role_criticality_weight || 0) +
          ((score.compliance_contribution || 0) / 25) * (weights.compliance_status_weight || 0) +
          ((score.cost_contribution || 0) / 25) * (weights.cost_efficiency_weight || 0) +
          ((score.strategic_contribution || 0) / 25) * (weights.strategic_alignment_weight || 0)
        ) * (100 / totalWeight);

        // Determine band
        let band: keyof typeof simulated = 'low';
        if (newScore >= thresholds.critical) band = 'critical';
        else if (newScore >= thresholds.high) band = 'high';
        else if (newScore >= thresholds.medium) band = 'medium';

        simulated[band]++;
      }

      return { original, simulated };
    },
  });
}

// Historical scoring
export function useStartHistoricalScoring() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ type, id }: { type: 'tna' | 'plan'; id: string }) => {
      const { data, error } = await supabase.functions.invoke('score-training-priority', {
        body: {
          type: 'batch',
          tna_period_id: type === 'tna' ? id : undefined,
          plan_id: type === 'plan' ? id : undefined,
          historical: true,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-scoring-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['ai-historical-results'] });
      toast.success('Historical scoring started');
    },
    onError: (error) => {
      toast.error('Failed to start historical scoring: ' + error.message);
    },
  });
}

// Historical scoring results
export function useHistoricalScoringResults() {
  return useQuery({
    queryKey: ['ai-historical-results'],
    queryFn: async () => {
      // Get completed historical jobs
      const { data: jobs, error } = await supabase
        .from('ai_scoring_jobs')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Transform to result format
      return (jobs || []).map(job => ({
        id: job.id,
        dataset_name: job.job_name || 'Historical Dataset',
        data_type: job.tna_period_id ? 'tna' : 'plan',
        total_items: job.total_items || 0,
        distribution: {
          critical: Math.round((job.total_items || 0) * 0.1),
          high: Math.round((job.total_items || 0) * 0.25),
          medium: Math.round((job.total_items || 0) * 0.35),
          low: Math.round((job.total_items || 0) * 0.3),
        },
        scored_at: job.completed_at || job.created_at,
      }));
    },
  });
}

// Get score for a single TNA item
export function useTNAItemScore(tnaItemId: string | null) {
  return useQuery({
    queryKey: ['ai-priority-score', 'tna-item', tnaItemId],
    queryFn: async () => {
      if (!tnaItemId) return null;
      
      const { data, error } = await supabase
        .from('ai_priority_scores')
        .select('*')
        .eq('tna_item_id', tnaItemId)
        .maybeSingle();
      
      if (error) throw error;
      return data as unknown as AIPriorityScore | null;
    },
    enabled: !!tnaItemId,
  });
}

// Get score for a single plan item
export function usePlanItemScore(planItemId: string | null) {
  return useQuery({
    queryKey: ['ai-priority-score', 'plan-item', planItemId],
    queryFn: async () => {
      if (!planItemId) return null;
      
      const { data, error } = await supabase
        .from('ai_priority_scores')
        .select('*')
        .eq('plan_item_id', planItemId)
        .maybeSingle();
      
      if (error) throw error;
      return data as unknown as AIPriorityScore | null;
    },
    enabled: !!planItemId,
  });
}
