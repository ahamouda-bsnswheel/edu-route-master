import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TravelVisaRequest {
  id: string;
  training_request_id: string | null;
  session_id: string | null;
  enrollment_id: string | null;
  employee_id: string;
  destination_country: string;
  destination_city: string | null;
  travel_start_date: string | null;
  travel_end_date: string | null;
  training_start_date: string | null;
  training_end_date: string | null;
  travel_request_id: string | null;
  travel_status: 'not_initiated' | 'requested' | 'approved' | 'ticketed' | 'completed' | 'cancelled';
  travel_status_updated_at: string | null;
  travel_booking_reference: string | null;
  travel_ticket_number: string | null;
  visa_required: boolean;
  visa_request_id: string | null;
  visa_status: 'not_required' | 'initiated' | 'submitted' | 'approved' | 'rejected' | 'cancelled';
  visa_status_updated_at: string | null;
  visa_issue_date: string | null;
  visa_expiry_date: string | null;
  visa_number: string | null;
  travel_cost_amount: number | null;
  travel_cost_currency: string | null;
  accommodation_cost: number | null;
  per_diem_amount: number | null;
  total_travel_cost: number | null;
  cost_last_updated_at: string | null;
  initiation_method: string | null;
  initiated_by: string | null;
  initiated_at: string | null;
  external_data: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TravelVisaConfig {
  id: string;
  config_name: string;
  travel_api_url: string | null;
  travel_api_auth_method: string;
  travel_api_timeout_ms: number;
  travel_api_retry_count: number;
  travel_api_retry_delay_ms: number;
  visa_api_url: string | null;
  visa_api_auth_method: string;
  visa_api_timeout_ms: number;
  field_mappings: any;
  training_purpose_code: string;
  sync_enabled: boolean;
  sync_interval_minutes: number;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  enable_bulk_initiation: boolean;
  enable_cost_display: boolean;
  enable_manual_linking: boolean;
  is_active: boolean;
}

export function useTravelVisaRequests(filters?: {
  sessionId?: string;
  trainingRequestId?: string;
  employeeId?: string;
}) {
  return useQuery({
    queryKey: ['travel-visa-requests', filters],
    queryFn: async () => {
      let query = supabase
        .from('travel_visa_requests')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (filters?.sessionId) {
        query = query.eq('session_id', filters.sessionId);
      }
      if (filters?.trainingRequestId) {
        query = query.eq('training_request_id', filters.trainingRequestId);
      }
      if (filters?.employeeId) {
        query = query.eq('employee_id', filters.employeeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TravelVisaRequest[];
    }
  });
}

export function useTravelVisaConfig() {
  return useQuery({
    queryKey: ['travel-visa-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('travel_visa_config')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data as TravelVisaConfig;
    }
  });
}

export function useInitiateTravelVisa() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      trainingRequestId?: string;
      sessionId?: string;
      enrollmentId?: string;
      employeeId: string;
      destinationCountry: string;
      destinationCity?: string;
      travelStartDate: string;
      travelEndDate: string;
      trainingStartDate: string;
      trainingEndDate: string;
      courseName: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('manage-travel-visa', {
        body: {
          action: 'initiate',
          ...params
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-visa-requests'] });
      toast({
        title: 'Travel Request Initiated',
        description: 'Your travel and visa request has been submitted successfully.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to initiate travel request',
        variant: 'destructive'
      });
    }
  });
}

export function useBulkInitiateTravelVisa() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      participantIds: string[];
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('manage-travel-visa', {
        body: {
          action: 'bulk_initiate',
          ...params
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['travel-visa-requests'] });
      toast({
        title: 'Bulk Travel Initiation Complete',
        description: `Successfully initiated ${data.summary?.succeeded || 0} of ${data.summary?.total || 0} travel requests.`
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to initiate bulk travel requests',
        variant: 'destructive'
      });
    }
  });
}

export function useManualLinkTravel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      travelVisaRequestId: string;
      travelRequestId?: string;
      visaRequestId?: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('manage-travel-visa', {
        body: {
          action: 'manual_link',
          ...params
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-visa-requests'] });
      toast({
        title: 'Travel Linked',
        description: 'External travel/visa request has been linked successfully.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to link travel request',
        variant: 'destructive'
      });
    }
  });
}

export function useSyncTravelStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (travelVisaRequestIds?: string[]) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('manage-travel-visa', {
        body: {
          action: 'sync_status',
          travelVisaRequestIds
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['travel-visa-requests'] });
      toast({
        title: 'Status Synced',
        description: `Synced ${data.synced} requests, updated ${data.updated}.`
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync travel status',
        variant: 'destructive'
      });
    }
  });
}

export function useUpdateTravelVisaConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (config: Partial<TravelVisaConfig>) => {
      const { data, error } = await supabase
        .from('travel_visa_config')
        .update(config)
        .eq('is_active', true)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-visa-config'] });
      toast({
        title: 'Configuration Updated',
        description: 'Travel & Visa integration settings saved.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update configuration',
        variant: 'destructive'
      });
    }
  });
}

export function useTravelVisaAuditLog(travelVisaRequestId?: string | null) {
  return useQuery({
    queryKey: ['travel-visa-audit', travelVisaRequestId],
    queryFn: async () => {
      let query = supabase
        .from('travel_visa_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (travelVisaRequestId) {
        query = query.eq('travel_visa_request_id', travelVisaRequestId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });
}

// Helper function to determine readiness
export function getTravelReadiness(request: TravelVisaRequest): 'ready' | 'pending' | 'critical' {
  const travelReady = request.travel_status === 'ticketed' || request.travel_status === 'completed';
  const visaReady = request.visa_status === 'not_required' || request.visa_status === 'approved';

  if (travelReady && visaReady) return 'ready';
  if (request.travel_status === 'cancelled' || request.visa_status === 'rejected' || request.visa_status === 'cancelled') {
    return 'critical';
  }
  return 'pending';
}

// Status display helpers
export const travelStatusLabels: Record<string, string> = {
  not_initiated: 'Not Initiated',
  requested: 'Requested',
  approved: 'Approved',
  ticketed: 'Ticketed',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

export const visaStatusLabels: Record<string, string> = {
  not_required: 'Not Required',
  initiated: 'Initiated',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled'
};