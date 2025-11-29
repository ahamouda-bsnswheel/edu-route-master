import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface TNAPeriod {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  submission_start_date: string;
  submission_end_date: string;
  status: 'draft' | 'active' | 'closed' | 'archived';
  allow_employee_submission: boolean;
  allow_manager_submission: boolean;
  created_at: string;
}

export interface TNASubmission {
  id: string;
  period_id: string;
  employee_id: string;
  submitted_by: string | null;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  return_comments: string | null;
  total_estimated_cost?: number | null;
  created_at: string;
  updated_at?: string;
  employee?: {
    id: string;
    first_name_en: string;
    last_name_en: string;
    employee_id: string;
    job_title_en: string;
    department_id: string;
  } | null;
  period?: TNAPeriod;
  items_count?: number;
}

export interface TNAItem {
  id: string;
  submission_id: string;
  competency_id: string | null;
  competency_text: string | null;
  training_type: string | null;
  training_location: string | null;
  course_id: string | null;
  course_text: string | null;
  justification: string | null;
  priority: string | null;
  target_quarter: string | null;
  target_start_date?: string | null;
  target_end_date?: string | null;
  estimated_cost: number | null;
  cost_currency?: string | null;
  custom_fields?: Record<string, any>;
  created_at: string;
  competency?: { id: string; name_en: string; code: string } | null;
  course?: { id: string; name_en: string; code: string | null; cost_amount: number | null } | null;
}

// Fetch all TNA periods
export function useTNAPeriods() {
  return useQuery({
    queryKey: ['tna-periods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tna_periods')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data as TNAPeriod[];
    },
  });
}

// Fetch active TNA periods only
export function useActiveTNAPeriods() {
  return useQuery({
    queryKey: ['tna-periods', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tna_periods')
        .select('*')
        .eq('status', 'active')
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data as TNAPeriod[];
    },
  });
}

// Fetch single TNA period
export function useTNAPeriod(periodId: string | null) {
  return useQuery({
    queryKey: ['tna-period', periodId],
    queryFn: async () => {
      if (!periodId) return null;
      const { data, error } = await supabase
        .from('tna_periods')
        .select('*')
        .eq('id', periodId)
        .single();
      
      if (error) throw error;
      return data as TNAPeriod;
    },
    enabled: !!periodId,
  });
}

// Fetch my TNA submission for a period
export function useMyTNASubmission(periodId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['tna-submission', 'my', periodId],
    queryFn: async () => {
      if (!periodId || !user?.id) return null;
      
      const { data, error } = await supabase
        .from('tna_submissions')
        .select('*')
        .eq('period_id', periodId)
        .eq('employee_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as TNASubmission | null;
    },
    enabled: !!periodId && !!user?.id,
  });
}

// Fetch team TNA submissions for a period (manager view)
export function useTeamTNASubmissions(periodId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['tna-submissions', 'team', periodId],
    queryFn: async () => {
      if (!periodId || !user?.id) return [];
      
      // First get team members
      const { data: teamMembers, error: teamError } = await supabase
        .from('profiles')
        .select('id, first_name_en, last_name_en, employee_id, job_title_en, department_id')
        .eq('manager_id', user.id);
      
      if (teamError) throw teamError;
      if (!teamMembers || teamMembers.length === 0) return [];
      
      const teamIds = teamMembers.map(m => m.id);
      
      // Get submissions for team members
      const { data: submissions, error: subError } = await supabase
        .from('tna_submissions')
        .select('*')
        .eq('period_id', periodId)
        .in('employee_id', teamIds);
      
      if (subError) throw subError;
      
      // Merge team members with submissions
      return teamMembers.map(member => {
        const submission = submissions?.find(s => s.employee_id === member.id);
        return {
          ...member,
          submission: submission || null,
          status: submission?.status || 'not_started',
        };
      });
    },
    enabled: !!periodId && !!user?.id,
  });
}

// Fetch all TNA submissions (L&D/HRBP view)
export function useAllTNASubmissions(periodId: string | null, filters?: { status?: string; departmentId?: string }) {
  return useQuery({
    queryKey: ['tna-submissions', 'all', periodId, filters],
    queryFn: async () => {
      if (!periodId) return [];
      
      let query = supabase
        .from('tna_submissions')
        .select('*')
        .eq('period_id', periodId);
      
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      
      const { data: submissions, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch employee profiles
      if (submissions && submissions.length > 0) {
        const employeeIds = [...new Set(submissions.map(s => s.employee_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name_en, last_name_en, employee_id, job_title_en, department_id')
          .in('id', employeeIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        // Get item counts
        const { data: itemCounts } = await supabase
          .from('tna_items')
          .select('submission_id')
          .in('submission_id', submissions.map(s => s.id));
        
        const countMap = new Map<string, number>();
        itemCounts?.forEach(item => {
          countMap.set(item.submission_id, (countMap.get(item.submission_id) || 0) + 1);
        });
        
        return submissions.map(sub => ({
          ...sub,
          employee: profileMap.get(sub.employee_id) || null,
          items_count: countMap.get(sub.id) || 0,
        })) as TNASubmission[];
      }
      
      return submissions as TNASubmission[];
    },
    enabled: !!periodId,
  });
}

// Fetch TNA items for a submission
export function useTNAItems(submissionId: string | null) {
  return useQuery({
    queryKey: ['tna-items', submissionId],
    queryFn: async () => {
      if (!submissionId) return [];
      
      const { data, error } = await supabase
        .from('tna_items')
        .select(`
          *,
          competency:competencies(id, name_en, code),
          course:courses(id, name_en, code, cost_amount)
        `)
        .eq('submission_id', submissionId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data || []) as unknown as TNAItem[];
    },
    enabled: !!submissionId,
  });
}

// Create TNA submission
export function useCreateTNASubmission() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ periodId, employeeId }: { periodId: string; employeeId: string }) => {
      const { data, error } = await supabase
        .from('tna_submissions')
        .insert({
          period_id: periodId,
          employee_id: employeeId,
          status: 'draft',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tna-submission'] });
      queryClient.invalidateQueries({ queryKey: ['tna-submissions'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create TNA submission',
        variant: 'destructive',
      });
    },
  });
}

// Save TNA item
export function useSaveTNAItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (item: Partial<TNAItem> & { submission_id: string }) => {
      if (item.id) {
        const { data, error } = await supabase
          .from('tna_items')
          .update({
            competency_id: item.competency_id,
            competency_text: item.competency_text,
            training_type: item.training_type,
            training_location: item.training_location,
            course_id: item.course_id,
            course_text: item.course_text,
            justification: item.justification,
            priority: item.priority,
            target_quarter: item.target_quarter,
            target_start_date: item.target_start_date,
            target_end_date: item.target_end_date,
            estimated_cost: item.estimated_cost,
            cost_currency: item.cost_currency,
          })
          .eq('id', item.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('tna_items')
          .insert({
            submission_id: item.submission_id,
            competency_id: item.competency_id,
            competency_text: item.competency_text,
            training_type: item.training_type || 'short_term',
            training_location: item.training_location || 'local',
            course_id: item.course_id,
            course_text: item.course_text,
            justification: item.justification,
            priority: item.priority || 'medium',
            target_quarter: item.target_quarter,
            target_start_date: item.target_start_date,
            target_end_date: item.target_end_date,
            estimated_cost: item.estimated_cost,
            cost_currency: item.cost_currency || 'LYD',
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tna-items', variables.submission_id] });
      toast({
        title: 'Saved',
        description: 'Training need saved successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save training need',
        variant: 'destructive',
      });
    },
  });
}

// Delete TNA item
export function useDeleteTNAItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ itemId, submissionId }: { itemId: string; submissionId: string }) => {
      const { error } = await supabase
        .from('tna_items')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
      return { itemId, submissionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tna-items', data.submissionId] });
      toast({
        title: 'Deleted',
        description: 'Training need removed',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete training need',
        variant: 'destructive',
      });
    },
  });
}

// Submit TNA for approval
export function useSubmitTNA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (submissionId: string) => {
      const { data, error } = await supabase
        .from('tna_submissions')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          submitted_by: user?.id,
        })
        .eq('id', submissionId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tna-submission'] });
      queryClient.invalidateQueries({ queryKey: ['tna-submissions'] });
      toast({
        title: 'Submitted',
        description: 'TNA submitted for approval',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit TNA',
        variant: 'destructive',
      });
    },
  });
}

// Approve/Return TNA
export function useApproveTNA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ submissionId, action, comments }: { 
      submissionId: string; 
      action: 'approve' | 'return' | 'lock';
      comments?: string;
    }) => {
      const statusMap = {
        approve: 'approved',
        return: 'returned',
        lock: 'locked',
      };
      
      const updateData: any = {
        status: statusMap[action],
      };
      
      if (action === 'approve' || action === 'lock') {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = user?.id;
      }
      
      if (action === 'return' && comments) {
        updateData.return_comments = comments;
      }
      
      const { data, error } = await supabase
        .from('tna_submissions')
        .update(updateData)
        .eq('id', submissionId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tna-submission'] });
      queryClient.invalidateQueries({ queryKey: ['tna-submissions'] });
      
      const messages = {
        approve: 'TNA approved successfully',
        return: 'TNA returned for revision',
        lock: 'TNA locked successfully',
      };
      
      toast({
        title: 'Success',
        description: messages[variables.action],
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process TNA',
        variant: 'destructive',
      });
    },
  });
}

// Create TNA period (L&D admin)
export function useCreateTNAPeriod() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (period: Partial<TNAPeriod>) => {
      const { data, error } = await supabase
        .from('tna_periods')
        .insert({
          name: period.name,
          description: period.description,
          start_date: period.start_date,
          end_date: period.end_date,
          submission_start_date: period.submission_start_date,
          submission_end_date: period.submission_end_date,
          status: period.status || 'draft',
          allow_employee_submission: period.allow_employee_submission ?? false,
          allow_manager_submission: period.allow_manager_submission ?? true,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tna-periods'] });
      toast({
        title: 'Created',
        description: 'TNA period created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create TNA period',
        variant: 'destructive',
      });
    },
  });
}

// Update TNA period
export function useUpdateTNAPeriod() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TNAPeriod> & { id: string }) => {
      const { data, error } = await supabase
        .from('tna_periods')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tna-periods'] });
      queryClient.invalidateQueries({ queryKey: ['tna-period'] });
      toast({
        title: 'Updated',
        description: 'TNA period updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update TNA period',
        variant: 'destructive',
      });
    },
  });
}
