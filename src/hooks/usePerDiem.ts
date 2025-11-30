import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface PerDiemDestinationBand {
  id: string;
  country: string;
  city: string | null;
  band: string;
  currency: string;
  training_daily_rate: number;
  business_daily_rate: number | null;
  is_domestic: boolean;
  valid_from: string;
  valid_to: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export interface PerDiemGradeBand {
  id: string;
  band_name: string;
  grade_from: number;
  grade_to: number;
  multiplier: number;
  fixed_rate_override: number | null;
  currency: string | null;
  valid_from: string;
  valid_to: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export interface PerDiemPolicyConfig {
  id: string;
  config_key: string;
  config_value: Record<string, any>;
  description: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export interface PerDiemCalculation {
  id: string;
  employee_id: string;
  training_request_id: string | null;
  session_id: string | null;
  travel_visa_request_id: string | null;
  destination_country: string;
  destination_city: string | null;
  destination_band: string | null;
  is_domestic: boolean;
  employee_grade: number | null;
  grade_band_id: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  calculation_type: string;
  daily_rate: number;
  currency: string;
  full_days: number;
  travel_days: number;
  weekend_days: number;
  excluded_days: number;
  total_eligible_days: number;
  estimated_amount: number | null;
  final_amount: number | null;
  destination_band_id: string | null;
  policy_snapshot: Record<string, any> | null;
  status: string;
  payment_status: string;
  payment_period: string | null;
  payment_reference: string | null;
  config_missing: boolean;
  config_missing_reason: string | null;
  accommodation_covered: boolean;
  has_override: boolean;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  calculated_at: string | null;
}

export interface PerDiemOverride {
  id: string;
  per_diem_calculation_id: string;
  original_eligible_days: number;
  original_daily_rate: number;
  original_amount: number;
  override_eligible_days: number | null;
  override_daily_rate: number | null;
  override_amount: number | null;
  reason: string;
  supporting_document_url: string | null;
  approval_status: string;
  requires_approval: boolean;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Hooks for destination bands
export function usePerDiemDestinationBands() {
  return useQuery({
    queryKey: ['per-diem-destination-bands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('per_diem_destination_bands')
        .select('*')
        .order('country', { ascending: true });
      
      if (error) throw error;
      return data as PerDiemDestinationBand[];
    },
  });
}

export function useCreateDestinationBand() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (band: Omit<PerDiemDestinationBand, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('per_diem_destination_bands')
        .insert(band)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['per-diem-destination-bands'] });
    },
  });
}

export function useUpdateDestinationBand() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PerDiemDestinationBand> & { id: string }) => {
      const { data, error } = await supabase
        .from('per_diem_destination_bands')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['per-diem-destination-bands'] });
    },
  });
}

// Hooks for grade bands
export function usePerDiemGradeBands() {
  return useQuery({
    queryKey: ['per-diem-grade-bands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('per_diem_grade_bands')
        .select('*')
        .order('grade_from', { ascending: true });
      
      if (error) throw error;
      return data as PerDiemGradeBand[];
    },
  });
}

export function useCreateGradeBand() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (band: Omit<PerDiemGradeBand, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('per_diem_grade_bands')
        .insert(band)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['per-diem-grade-bands'] });
    },
  });
}

export function useUpdateGradeBand() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PerDiemGradeBand> & { id: string }) => {
      const { data, error } = await supabase
        .from('per_diem_grade_bands')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['per-diem-grade-bands'] });
    },
  });
}

// Hooks for policy config
export function usePerDiemPolicyConfig() {
  return useQuery({
    queryKey: ['per-diem-policy-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('per_diem_policy_config')
        .select('*')
        .eq('is_active', true)
        .order('config_key', { ascending: true });
      
      if (error) throw error;
      return data as PerDiemPolicyConfig[];
    },
  });
}

export function useUpdatePolicyConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, config_value }: { id: string; config_value: Record<string, any> }) => {
      const { data, error } = await supabase
        .from('per_diem_policy_config')
        .update({ config_value, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['per-diem-policy-config'] });
    },
  });
}

// Hooks for calculations
export function usePerDiemCalculations(filters?: {
  employee_id?: string;
  session_id?: string;
  training_request_id?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['per-diem-calculations', filters],
    queryFn: async () => {
      let query = supabase
        .from('per_diem_calculations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filters?.employee_id) {
        query = query.eq('employee_id', filters.employee_id);
      }
      if (filters?.session_id) {
        query = query.eq('session_id', filters.session_id);
      }
      if (filters?.training_request_id) {
        query = query.eq('training_request_id', filters.training_request_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as PerDiemCalculation[];
    },
    enabled: true,
  });
}

export function usePerDiemCalculation(id: string | undefined) {
  return useQuery({
    queryKey: ['per-diem-calculation', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('per_diem_calculations')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as PerDiemCalculation;
    },
    enabled: !!id,
  });
}

export function useCalculatePerDiem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: {
      action: 'estimate' | 'calculate_final' | 'recalculate' | 'bulk_calculate';
      employee_id: string;
      training_request_id?: string;
      session_id?: string;
      travel_visa_request_id?: string;
      destination_country: string;
      destination_city?: string;
      employee_grade?: number;
      planned_start_date?: string;
      planned_end_date?: string;
      actual_start_date?: string;
      actual_end_date?: string;
      is_domestic?: boolean;
      accommodation_covered?: boolean;
      participants?: Array<{
        employee_id: string;
        employee_grade?: number;
        is_domestic?: boolean;
      }>;
    }) => {
      const { data, error } = await supabase.functions.invoke('calculate-per-diem', {
        body: request,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['per-diem-calculations'] });
    },
  });
}

// Hooks for overrides
export function usePerDiemOverrides(calculationId?: string) {
  return useQuery({
    queryKey: ['per-diem-overrides', calculationId],
    queryFn: async () => {
      let query = supabase
        .from('per_diem_overrides')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (calculationId) {
        query = query.eq('per_diem_calculation_id', calculationId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as PerDiemOverride[];
    },
  });
}

export function useCreatePerDiemOverride() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (override: {
      per_diem_calculation_id: string;
      original_eligible_days: number;
      original_daily_rate: number;
      original_amount: number;
      override_eligible_days?: number;
      override_daily_rate?: number;
      override_amount?: number;
      reason: string;
      supporting_document_url?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('per_diem_overrides')
        .insert({
          ...override,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update calculation to mark as having override
      await supabase
        .from('per_diem_calculations')
        .update({ has_override: true })
        .eq('id', override.per_diem_calculation_id);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['per-diem-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['per-diem-calculations'] });
    },
  });
}

export function useApprovePerDiemOverride() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean; rejection_reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: any = {
        approval_status: approved ? 'approved' : 'rejected',
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from('per_diem_overrides')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['per-diem-overrides'] });
    },
  });
}

// Hooks for audit log
export function usePerDiemAuditLog(entityId?: string) {
  return useQuery({
    queryKey: ['per-diem-audit-log', entityId],
    queryFn: async () => {
      let query = supabase
        .from('per_diem_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (entityId) {
        query = query.eq('entity_id', entityId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// Helper to get effective per diem amount considering overrides
export function getEffectivePerDiemAmount(
  calculation: PerDiemCalculation,
  override?: PerDiemOverride
): number {
  if (override && override.approval_status === 'approved') {
    return override.override_amount ?? calculation.estimated_amount ?? 0;
  }
  return calculation.final_amount ?? calculation.estimated_amount ?? 0;
}
