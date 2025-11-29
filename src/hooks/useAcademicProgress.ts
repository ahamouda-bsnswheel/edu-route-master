import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ScholarRecord {
  id: string;
  application_id: string;
  employee_id: string;
  program_name: string;
  institution: string;
  country: string;
  degree_level: string;
  actual_start_date?: string;
  expected_end_date?: string;
  actual_end_date?: string;
  total_credits_required?: number;
  credits_completed: number;
  cumulative_gpa?: number;
  gpa_scale: number;
  status: string;
  risk_level: string;
  risk_override: boolean;
  risk_override_reason?: string;
  current_term_number: number;
  total_terms?: number;
  term_structure: string;
  notes_internal?: string;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    first_name_en?: string;
    last_name_en?: string;
    employee_id?: string;
    job_title_en?: string;
    grade?: string;
    entity_id?: string;
    department_id?: string;
    manager_id?: string;
  };
}

export interface AcademicTerm {
  id: string;
  scholar_record_id: string;
  term_number: number;
  term_name: string;
  start_date?: string;
  end_date?: string;
  credits_attempted: number;
  credits_earned: number;
  term_gpa?: number;
  status: string;
  notes?: string;
  created_at: string;
  modules?: AcademicModule[];
}

export interface AcademicModule {
  id: string;
  term_id: string;
  module_code?: string;
  module_name: string;
  module_type: string;
  credits: number;
  grade?: string;
  grade_points?: number;
  passed?: boolean;
  exam_attempts: number;
  is_retake: boolean;
  notes?: string;
}

export interface AcademicEvent {
  id: string;
  scholar_record_id: string;
  event_type: string;
  event_date: string;
  end_date?: string;
  description?: string;
  reason?: string;
  document_url?: string;
  impact_on_completion: boolean;
  new_expected_end_date?: string;
  created_by?: string;
  created_at: string;
}

export interface AcademicDocument {
  id: string;
  scholar_record_id: string;
  term_id?: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  academic_year?: string;
  verification_status: string;
  verified_by?: string;
  verified_at?: string;
  uploaded_by?: string;
  uploaded_at: string;
  notes?: string;
}

// Fetch all scholar records (L&D view)
export function useScholarRecords() {
  return useQuery({
    queryKey: ['scholar-records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scholar_records')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch employee profiles separately
      if (data && data.length > 0) {
        const employeeIds = [...new Set(data.map(r => r.employee_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name_en, last_name_en, employee_id, job_title_en, grade, entity_id, department_id, manager_id')
          .in('id', employeeIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        return data.map(record => ({
          ...record,
          employee: profileMap.get(record.employee_id)
        })) as ScholarRecord[];
      }
      
      return data as ScholarRecord[];
    },
  });
}

// Fetch single scholar record
export function useScholarRecord(recordId: string | null) {
  return useQuery({
    queryKey: ['scholar-record', recordId],
    queryFn: async () => {
      if (!recordId) return null;
      
      const { data, error } = await supabase
        .from('scholar_records')
        .select('*')
        .eq('id', recordId)
        .single();
      
      if (error) throw error;
      
      // Fetch employee profile
      if (data?.employee_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, first_name_en, last_name_en, employee_id, job_title_en, grade, entity_id, department_id, manager_id')
          .eq('id', data.employee_id)
          .single();
        return { ...data, employee: profile } as ScholarRecord;
      }
      
      return data as ScholarRecord;
    },
    enabled: !!recordId,
  });
}

// Fetch terms for a scholar
export function useAcademicTerms(scholarRecordId: string | null) {
  return useQuery({
    queryKey: ['academic-terms', scholarRecordId],
    queryFn: async () => {
      if (!scholarRecordId) return [];
      
      const { data, error } = await supabase
        .from('academic_terms')
        .select('*')
        .eq('scholar_record_id', scholarRecordId)
        .order('term_number', { ascending: true });
      
      if (error) throw error;
      return data as AcademicTerm[];
    },
    enabled: !!scholarRecordId,
  });
}

// Fetch modules for a term
export function useAcademicModules(termId: string | null) {
  return useQuery({
    queryKey: ['academic-modules', termId],
    queryFn: async () => {
      if (!termId) return [];
      
      const { data, error } = await supabase
        .from('academic_modules')
        .select('*')
        .eq('term_id', termId)
        .order('module_code', { ascending: true });
      
      if (error) throw error;
      return data as AcademicModule[];
    },
    enabled: !!termId,
  });
}

// Fetch events for a scholar
export function useAcademicEvents(scholarRecordId: string | null) {
  return useQuery({
    queryKey: ['academic-events', scholarRecordId],
    queryFn: async () => {
      if (!scholarRecordId) return [];
      
      const { data, error } = await supabase
        .from('academic_events')
        .select('*')
        .eq('scholar_record_id', scholarRecordId)
        .order('event_date', { ascending: false });
      
      if (error) throw error;
      return data as AcademicEvent[];
    },
    enabled: !!scholarRecordId,
  });
}

// Fetch documents for a scholar
export function useAcademicDocuments(scholarRecordId: string | null) {
  return useQuery({
    queryKey: ['academic-documents', scholarRecordId],
    queryFn: async () => {
      if (!scholarRecordId) return [];
      
      const { data, error } = await supabase
        .from('academic_documents')
        .select('*')
        .eq('scholar_record_id', scholarRecordId)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      return data as AcademicDocument[];
    },
    enabled: !!scholarRecordId,
  });
}

// Create scholar record mutation
export function useCreateScholarRecord() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: Partial<ScholarRecord>) => {
      const { data: newRecord, error } = await supabase
        .from('scholar_records')
        .insert(data as any)
        .select('id')
        .single();
      
      if (error) throw error;
      return newRecord.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scholar-records'] });
      toast.success('Scholar record created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create scholar record: ' + error.message);
    },
  });
}

// Update scholar record mutation
export function useUpdateScholarRecord() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ScholarRecord> & { id: string }) => {
      const { error } = await supabase
        .from('scholar_records')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
      
      // Log to audit
      await supabase.from('academic_audit_log').insert({
        scholar_record_id: id,
        action: 'update_record',
        actor_id: user?.id,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scholar-record', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['scholar-records'] });
      toast.success('Scholar record updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update scholar record: ' + error.message);
    },
  });
}

// Create/Update term mutation
export function useTermMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: Partial<AcademicTerm> & { id?: string }) => {
      const { id, modules, ...termData } = data as any;
      
      if (id) {
        const { error } = await supabase
          .from('academic_terms')
          .update(termData)
          .eq('id', id);
        if (error) throw error;
        
        await supabase.from('academic_audit_log').insert({
          term_id: id,
          action: 'update_term',
          actor_id: user?.id,
        });
        
        return id;
      } else {
        const { data: newTerm, error } = await supabase
          .from('academic_terms')
          .insert({ ...termData, created_by: user?.id })
          .select('id')
          .single();
        if (error) throw error;
        return newTerm.id;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['academic-terms'] });
      toast.success('Term saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save term: ' + error.message);
    },
  });
}

// Create/Update module mutation
export function useModuleMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: Partial<AcademicModule> & { id?: string }) => {
      const { id, ...moduleData } = data;
      
      if (id) {
        const { error } = await supabase
          .from('academic_modules')
          .update(moduleData)
          .eq('id', id);
        if (error) throw error;
        
        await supabase.from('academic_audit_log').insert({
          module_id: id,
          action: 'update_module',
          actor_id: user?.id,
        });
        
        return id;
      } else {
        const { data: newModule, error } = await supabase
          .from('academic_modules')
          .insert(moduleData as any)
          .select('id')
          .single();
        if (error) throw error;
        return newModule.id;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['academic-modules'] });
      toast.success('Module saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save module: ' + error.message);
    },
  });
}

// Delete module mutation
export function useDeleteModule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (moduleId: string) => {
      const { error } = await supabase
        .from('academic_modules')
        .delete()
        .eq('id', moduleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-modules'] });
      toast.success('Module deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete module: ' + error.message);
    },
  });
}

// Create event mutation
export function useCreateEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: Partial<AcademicEvent>) => {
      const { data: newEvent, error } = await supabase
        .from('academic_events')
        .insert({ ...data, created_by: user?.id } as any)
        .select('id')
        .single();
      if (error) throw error;
      return newEvent.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-events'] });
      toast.success('Event recorded successfully');
    },
    onError: (error) => {
      toast.error('Failed to record event: ' + error.message);
    },
  });
}

// Override risk level mutation
export function useOverrideRiskLevel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      recordId, 
      riskLevel, 
      reason 
    }: { 
      recordId: string; 
      riskLevel: string; 
      reason: string;
    }) => {
      const { error } = await supabase
        .from('scholar_records')
        .update({
          risk_level: riskLevel,
          risk_override: true,
          risk_override_reason: reason,
          risk_override_by: user?.id,
          risk_override_at: new Date().toISOString(),
        })
        .eq('id', recordId);
      
      if (error) throw error;
      
      await supabase.from('academic_audit_log').insert({
        scholar_record_id: recordId,
        action: 'risk_override',
        field_changed: 'risk_level',
        new_value: riskLevel,
        actor_id: user?.id,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scholar-record', variables.recordId] });
      queryClient.invalidateQueries({ queryKey: ['scholar-records'] });
      toast.success('Risk level updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update risk level: ' + error.message);
    },
  });
}

// Team scholars (for managers)
export function useTeamScholars() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['team-scholars', user?.id],
    queryFn: async () => {
      // Get team member IDs
      const { data: teamMembers } = await supabase
        .from('profiles')
        .select('id')
        .eq('manager_id', user?.id);
      
      if (!teamMembers || teamMembers.length === 0) return [];
      
      const teamIds = teamMembers.map(m => m.id);
      
      const { data, error } = await supabase
        .from('scholar_records')
        .select('*')
        .in('employee_id', teamIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch profiles
      if (data && data.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name_en, last_name_en, employee_id, job_title_en')
          .in('id', teamIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        return data.map(record => ({
          ...record,
          employee: profileMap.get(record.employee_id)
        })) as ScholarRecord[];
      }
      
      return data as ScholarRecord[];
    },
    enabled: !!user?.id,
  });
}

// Dashboard stats
export function useScholarDashboardStats() {
  return useQuery({
    queryKey: ['scholar-dashboard-stats'],
    queryFn: async () => {
      const { data: records } = await supabase
        .from('scholar_records')
        .select('status, risk_level, country, degree_level');
      
      if (!records) return null;
      
      return {
        total: records.length,
        active: records.filter(r => r.status === 'active').length,
        onTrack: records.filter(r => r.risk_level === 'on_track').length,
        atRisk: records.filter(r => ['at_risk', 'critical'].includes(r.risk_level)).length,
        watch: records.filter(r => r.risk_level === 'watch').length,
        completed: records.filter(r => r.status === 'completed').length,
        byCountry: records.reduce((acc, r) => {
          acc[r.country] = (acc[r.country] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byDegree: records.reduce((acc, r) => {
          acc[r.degree_level] = (acc[r.degree_level] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };
    },
  });
}
