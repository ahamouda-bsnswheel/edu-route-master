import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type IncidentType =
  | 'flight_delay'
  | 'flight_cancellation'
  | 'missed_connection'
  | 'lost_baggage'
  | 'no_pickup'
  | 'wrong_pickup'
  | 'hotel_issue'
  | 'medical_incident'
  | 'accident_injury'
  | 'security_threat'
  | 'lost_stolen_documents'
  | 'weather_disruption'
  | 'strike_disruption'
  | 'political_event'
  | 'other';

export type IncidentSeverity = 'minor' | 'moderate' | 'major' | 'critical';

export type TrainingImpact =
  | 'none'
  | 'late_arrival'
  | 'missed_days'
  | 'complete_no_show'
  | 'session_cancelled'
  | 'session_postponed';

export type IncidentStatus =
  | 'open'
  | 'under_review'
  | 'resolved_no_impact'
  | 'resolved_training_adjusted'
  | 'escalated'
  | 'closed';

export interface TravelIncident {
  id: string;
  employee_id: string;
  session_id?: string;
  training_request_id?: string;
  travel_visa_request_id?: string;
  itinerary_id?: string;
  incident_datetime: string;
  incident_timezone?: string;
  location_country?: string;
  location_city?: string;
  location_detail?: string;
  incident_type: IncidentType;
  secondary_type?: IncidentType;
  severity: IncidentSeverity;
  training_impact: TrainingImpact;
  days_missed?: number;
  status: IncidentStatus;
  owner_role?: string;
  assigned_to?: string;
  description: string;
  internal_notes?: string;
  confidential_notes?: string;
  actions_taken?: string;
  root_cause?: string;
  contributing_factors?: string[];
  outcome?: string;
  follow_up_required?: boolean;
  follow_up_description?: string;
  follow_up_due_date?: string;
  follow_up_completed?: boolean;
  external_case_id?: string;
  travel_system_ref?: string;
  source?: string;
  escalated_to?: string;
  escalation_reason?: string;
  escalated_at?: string;
  escalated_by?: string;
  resolution_summary?: string;
  resolved_at?: string;
  resolved_by?: string;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  attachments?: IncidentAttachment[];
}

export interface IncidentAttachment {
  id: string;
  incident_id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  uploaded_at?: string;
  uploaded_by?: string;
}

export interface IncidentFilters {
  status?: IncidentStatus[];
  severity?: IncidentSeverity[];
  incident_type?: IncidentType[];
  training_impact?: TrainingImpact[];
  date_from?: string;
  date_to?: string;
  location_country?: string;
  location_city?: string;
  owner_role?: string;
}

// Fetch incidents for a session
export function useSessionIncidents(sessionId?: string) {
  return useQuery({
    queryKey: ['incidents', 'session', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      const { data, error } = await supabase.functions.invoke('manage-incident', {
        body: { action: 'list', session_id: sessionId },
      });

      if (error) throw error;
      return (data?.incidents || []) as TravelIncident[];
    },
    enabled: !!sessionId,
  });
}

// Fetch incidents for an employee
export function useEmployeeIncidents(employeeId?: string) {
  return useQuery({
    queryKey: ['incidents', 'employee', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];

      const { data, error } = await supabase.functions.invoke('manage-incident', {
        body: { action: 'list', employee_id: employeeId },
      });

      if (error) throw error;
      return (data?.incidents || []) as TravelIncident[];
    },
    enabled: !!employeeId,
  });
}

// Fetch all incidents with filters
export function useIncidents(filters?: IncidentFilters) {
  return useQuery({
    queryKey: ['incidents', 'all', filters],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-incident', {
        body: { action: 'list', filters },
      });

      if (error) throw error;
      return (data?.incidents || []) as TravelIncident[];
    },
  });
}

// Get single incident
export function useIncident(incidentId?: string) {
  return useQuery({
    queryKey: ['incidents', incidentId],
    queryFn: async () => {
      if (!incidentId) return null;

      const { data, error } = await supabase.functions.invoke('manage-incident', {
        body: { action: 'get', incident_id: incidentId },
      });

      if (error) throw error;
      return (data?.incidents?.[0] || null) as TravelIncident | null;
    },
    enabled: !!incidentId,
  });
}

// Create incident
export function useCreateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (incidentData: Partial<TravelIncident>) => {
      const { data, error } = await supabase.functions.invoke('manage-incident', {
        body: { action: 'create', data: incidentData },
      });

      if (error) throw error;
      return data?.incident as TravelIncident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}

// Update incident
export function useUpdateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ incidentId, data }: { incidentId: string; data: Partial<TravelIncident> }) => {
      const { data: response, error } = await supabase.functions.invoke('manage-incident', {
        body: { action: 'update', incident_id: incidentId, data },
      });

      if (error) throw error;
      return response?.incident as TravelIncident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}

// Export incidents
export function useExportIncidents() {
  return useMutation({
    mutationFn: async (filters?: IncidentFilters) => {
      const { data, error } = await supabase.functions.invoke('manage-incident', {
        body: { action: 'export', filters },
      });

      if (error) throw error;
      return (data?.incidents || []) as TravelIncident[];
    },
  });
}

// Emergency view
export function useEmergencyView() {
  return useMutation({
    mutationFn: async ({ filters, accessReason }: { filters?: IncidentFilters; accessReason: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-incident', {
        body: { action: 'emergency_view', filters, access_reason: accessReason },
      });

      if (error) throw error;
      return (data?.incidents || []) as TravelIncident[];
    },
  });
}

// Fetch audit log for an incident
export function useIncidentAuditLog(incidentId?: string) {
  return useQuery({
    queryKey: ['incident-audit', incidentId],
    queryFn: async () => {
      if (!incidentId) return [];

      const { data, error } = await supabase
        .from('incident_audit_log')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!incidentId,
  });
}

// Label mappings
export const incidentTypeLabels: Record<IncidentType, string> = {
  flight_delay: 'Flight Delay',
  flight_cancellation: 'Flight Cancellation',
  missed_connection: 'Missed Connection',
  lost_baggage: 'Lost Baggage',
  no_pickup: 'No Pick-up',
  wrong_pickup: 'Wrong Pick-up',
  hotel_issue: 'Hotel Issue',
  medical_incident: 'Medical Incident',
  accident_injury: 'Accident / Injury',
  security_threat: 'Security Threat',
  lost_stolen_documents: 'Lost/Stolen Documents',
  weather_disruption: 'Weather Disruption',
  strike_disruption: 'Strike Disruption',
  political_event: 'Political Event',
  other: 'Other',
};

export const severityLabels: Record<IncidentSeverity, string> = {
  minor: 'Minor',
  moderate: 'Moderate',
  major: 'Major',
  critical: 'Critical',
};

export const trainingImpactLabels: Record<TrainingImpact, string> = {
  none: 'No Impact',
  late_arrival: 'Late Arrival',
  missed_days: 'Missed Day(s)',
  complete_no_show: 'Complete No-Show',
  session_cancelled: 'Session Cancelled',
  session_postponed: 'Session Postponed',
};

export const incidentStatusLabels: Record<IncidentStatus, string> = {
  open: 'Open',
  under_review: 'Under Review',
  resolved_no_impact: 'Resolved - No Impact',
  resolved_training_adjusted: 'Resolved - Training Adjusted',
  escalated: 'Escalated',
  closed: 'Closed',
};

export const severityColors: Record<IncidentSeverity, string> = {
  minor: 'bg-blue-100 text-blue-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  major: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

export const statusColors: Record<IncidentStatus, string> = {
  open: 'bg-red-100 text-red-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  resolved_no_impact: 'bg-green-100 text-green-800',
  resolved_training_adjusted: 'bg-green-100 text-green-800',
  escalated: 'bg-purple-100 text-purple-800',
  closed: 'bg-gray-100 text-gray-800',
};
