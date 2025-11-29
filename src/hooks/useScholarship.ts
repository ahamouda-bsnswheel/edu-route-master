import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ScholarshipApplication {
  id: string;
  application_number: string;
  applicant_id: string;
  program_id?: string;
  program_name_custom?: string;
  institution_custom?: string;
  program_type: string;
  country: string;
  city?: string;
  study_mode: string;
  start_date?: string;
  end_date?: string;
  duration_months?: number;
  tuition_per_year?: number;
  tuition_total?: number;
  living_allowance?: number;
  travel_cost?: number;
  visa_insurance_cost?: number;
  total_estimated_cost?: number;
  currency: string;
  funding_source: string;
  company_percentage: number;
  justification?: string;
  competency_gaps?: string;
  target_role?: string;
  career_path_notes?: string;
  operational_impact?: string;
  impact_description?: string;
  replacement_plan?: string;
  risk_assessment?: string;
  risk_comments?: string;
  manager_comments?: string;
  eligibility_check?: boolean;
  eligibility_notes?: string;
  alignment_check?: boolean;
  alignment_notes?: string;
  policy_compliance?: boolean;
  policy_notes?: string;
  hrbp_recommendation?: string;
  hrbp_comments?: string;
  ld_recommendation?: string;
  ld_comments?: string;
  internal_notes?: string;
  committee_decision?: string;
  committee_remarks?: string;
  committee_score_total?: number;
  budget_status?: string;
  approved_amount?: number;
  cost_centre?: string;
  finance_comments?: string;
  final_decision?: string;
  final_comments?: string;
  final_approved_by?: string;
  final_approved_at?: string;
  service_commitment_months?: number;
  bond_amount?: number;
  accepted_at?: string;
  declined_at?: string;
  decline_reason?: string;
  status: string;
  current_approver_id?: string;
  current_approval_level: number;
  is_historical_import: boolean;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
  applicant?: {
    id: string;
    first_name_en?: string;
    last_name_en?: string;
    first_name_ar?: string;
    last_name_ar?: string;
    employee_id?: string;
    job_title_en?: string;
    grade?: string;
    department_id?: string;
    entity_id?: string;
    manager_id?: string;
  };
  program?: {
    id: string;
    name_en: string;
    name_ar?: string;
    institution_en: string;
  };
}

export interface ScholarshipProgram {
  id: string;
  name_en: string;
  name_ar?: string;
  institution_en: string;
  institution_ar?: string;
  country: string;
  city?: string;
  program_type: string;
  study_mode: string;
  duration_months?: number;
  description_en?: string;
  description_ar?: string;
  is_active: boolean;
}

export interface ScholarshipDocument {
  id: string;
  application_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  is_required: boolean;
  uploaded_at: string;
}

export interface CommitteeScore {
  id: string;
  application_id: string;
  committee_member_id: string;
  candidate_quality_score?: number;
  business_relevance_score?: number;
  urgency_score?: number;
  cost_benefit_score?: number;
  total_score?: number;
  comments?: string;
  has_conflict_of_interest: boolean;
  abstained: boolean;
  scored_at: string;
}

// Fetch user's own applications
export function useMyScholarshipApplications() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-scholarship-applications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scholarship_applications')
        .select(`
          *,
          program:scholarship_programs(id, name_en, name_ar, institution_en)
        `)
        .eq('applicant_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ScholarshipApplication[];
    },
    enabled: !!user?.id,
  });
}

// Fetch single application
export function useScholarshipApplication(applicationId: string | null) {
  return useQuery({
    queryKey: ['scholarship-application', applicationId],
    queryFn: async () => {
      if (!applicationId) return null;
      
      const { data, error } = await supabase
        .from('scholarship_applications')
        .select(`*, program:scholarship_programs(id, name_en, name_ar, institution_en, institution_ar)`)
        .eq('id', applicationId)
        .single();
      
      if (error) throw error;
      
      // Fetch applicant separately
      if (data?.applicant_id) {
        const { data: applicant } = await supabase
          .from('profiles')
          .select('id, first_name_en, last_name_en, first_name_ar, last_name_ar, employee_id, job_title_en, grade, department_id, entity_id, manager_id')
          .eq('id', data.applicant_id)
          .single();
        return { ...data, applicant } as unknown as ScholarshipApplication;
      }
      
      return data as unknown as ScholarshipApplication;
    },
    enabled: !!applicationId,
  });
}

// Fetch applications for manager review
export function useManagerScholarshipQueue() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['manager-scholarship-queue', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scholarship_applications')
        .select(`*, program:scholarship_programs(id, name_en, institution_en)`)
        .in('status', ['submitted_to_manager', 'manager_review'])
        .eq('current_approver_id', user?.id)
        .order('submitted_at', { ascending: true });
      
      if (error) throw error;
      return data as unknown as ScholarshipApplication[];
    },
    enabled: !!user?.id,
  });
}

// Fetch applications for HRBP/L&D review
export function useHRBPScholarshipQueue() {
  return useQuery({
    queryKey: ['hrbp-scholarship-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scholarship_applications')
        .select(`*, program:scholarship_programs(id, name_en, institution_en)`)
        .in('status', ['hrbp_review', 'ld_review'])
        .order('submitted_at', { ascending: true });
      
      if (error) throw error;
      return data as unknown as ScholarshipApplication[];
    },
  });
}

// Fetch applications for committee review
export function useCommitteeScholarshipQueue() {
  return useQuery({
    queryKey: ['committee-scholarship-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scholarship_applications')
        .select(`*, program:scholarship_programs(id, name_en, institution_en)`)
        .eq('status', 'committee_review')
        .order('submitted_at', { ascending: true });
      
      if (error) throw error;
      return data as unknown as ScholarshipApplication[];
    },
  });
}

// Fetch applications for finance review
export function useFinanceScholarshipQueue() {
  return useQuery({
    queryKey: ['finance-scholarship-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scholarship_applications')
        .select(`*, program:scholarship_programs(id, name_en, institution_en)`)
        .eq('status', 'finance_review')
        .order('submitted_at', { ascending: true });
      
      if (error) throw error;
      return data as unknown as ScholarshipApplication[];
    },
  });
}

// Fetch applications for final approval
export function useFinalApprovalQueue() {
  return useQuery({
    queryKey: ['final-approval-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scholarship_applications')
        .select(`*, program:scholarship_programs(id, name_en, institution_en)`)
        .eq('status', 'final_approval')
        .order('submitted_at', { ascending: true });
      
      if (error) throw error;
      return data as unknown as ScholarshipApplication[];
    },
  });
}

// Fetch available programs
export function useScholarshipPrograms() {
  return useQuery({
    queryKey: ['scholarship-programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scholarship_programs')
        .select('*')
        .eq('is_active', true)
        .order('name_en');
      
      if (error) throw error;
      return data as ScholarshipProgram[];
    },
  });
}

// Fetch documents for an application
export function useScholarshipDocuments(applicationId: string | null) {
  return useQuery({
    queryKey: ['scholarship-documents', applicationId],
    queryFn: async () => {
      if (!applicationId) return [];
      
      const { data, error } = await supabase
        .from('scholarship_documents')
        .select('*')
        .eq('application_id', applicationId)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      return data as ScholarshipDocument[];
    },
    enabled: !!applicationId,
  });
}

// Fetch committee scores for an application
export function useCommitteeScores(applicationId: string | null) {
  return useQuery({
    queryKey: ['committee-scores', applicationId],
    queryFn: async () => {
      if (!applicationId) return [];
      
      const { data, error } = await supabase
        .from('scholarship_committee_scores')
        .select('*')
        .eq('application_id', applicationId);
      
      if (error) throw error;
      return data as CommitteeScore[];
    },
    enabled: !!applicationId,
  });
}

// Create/Update application mutation
export function useScholarshipApplicationMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: Partial<ScholarshipApplication> & { id?: string }) => {
      const { id, applicant, program, ...updateData } = data as any;
      if (id) {
        const { error } = await supabase
          .from('scholarship_applications')
          .update(updateData)
          .eq('id', id);
        
        if (error) throw error;
        return id;
      } else {
        const { data: newApp, error } = await supabase
          .from('scholarship_applications')
          .insert({
            ...updateData,
            applicant_id: user?.id,
          })
          .select('id')
          .single();
        
        if (error) throw error;
        return newApp.id;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-scholarship-applications'] });
      queryClient.invalidateQueries({ queryKey: ['scholarship-application'] });
    },
    onError: (error) => {
      toast.error('Failed to save application: ' + error.message);
    },
  });
}

// Submit application mutation
export function useSubmitScholarshipApplication() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (applicationId: string) => {
      // Get the applicant's manager
      const { data: profile } = await supabase
        .from('profiles')
        .select('manager_id')
        .eq('id', user?.id)
        .single();
      
      const { error } = await supabase
        .from('scholarship_applications')
        .update({
          status: 'submitted_to_manager',
          submitted_at: new Date().toISOString(),
          current_approver_id: profile?.manager_id,
          current_approval_level: 1,
        })
        .eq('id', applicationId);
      
      if (error) throw error;
      
      // Create audit log
      await supabase.from('scholarship_audit_log').insert({
        application_id: applicationId,
        actor_id: user?.id,
        action: 'submitted',
        old_status: 'draft',
        new_status: 'submitted_to_manager',
      });
      
      // Create notification for manager
      if (profile?.manager_id) {
        await supabase.from('notifications').insert({
          user_id: profile.manager_id,
          type: 'scholarship_approval',
          title: 'New Scholarship Application',
          message: 'A new scholarship application requires your review.',
          reference_type: 'scholarship_application',
          reference_id: applicationId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-scholarship-applications'] });
      toast.success('Application submitted successfully');
    },
    onError: (error) => {
      toast.error('Failed to submit application: ' + error.message);
    },
  });
}

// Process approval mutation
export function useProcessScholarshipApproval() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      applicationId,
      decision,
      comments,
      additionalData,
    }: {
      applicationId: string;
      decision: 'approve' | 'reject' | 'return';
      comments?: string;
      additionalData?: Partial<ScholarshipApplication>;
    }) => {
      const { data: application } = await supabase
        .from('scholarship_applications')
        .select('status, applicant_id, current_approval_level')
        .eq('id', applicationId)
        .single();
      
      if (!application) throw new Error('Application not found');
      
      const currentStatus = application.status;
      let newStatus: string;
      let nextApproverId: string | null = null;
      
      if (decision === 'reject') {
        newStatus = currentStatus === 'submitted_to_manager' || currentStatus === 'manager_review'
          ? 'rejected_by_manager'
          : 'rejected';
      } else if (decision === 'return') {
        newStatus = 'returned_to_employee';
      } else {
        // Determine next status based on current status
        const statusFlow: Record<string, string> = {
          'submitted_to_manager': 'hrbp_review',
          'manager_review': 'hrbp_review',
          'hrbp_review': 'ld_review',
          'ld_review': 'committee_review',
          'committee_review': 'finance_review',
          'finance_review': 'final_approval',
          'final_approval': 'approved_pending_acceptance',
        };
        newStatus = statusFlow[currentStatus] || 'approved_pending_acceptance';
      }
      
      const updateData: Partial<ScholarshipApplication> = {
        status: newStatus,
        current_approval_level: (application.current_approval_level || 0) + 1,
        ...additionalData,
      };
      
      if (decision === 'approve' && currentStatus === 'final_approval') {
        updateData.final_approved_by = user?.id;
        updateData.final_approved_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('scholarship_applications')
        .update(updateData)
        .eq('id', applicationId);
      
      if (error) throw error;
      
      // Create audit log
      await supabase.from('scholarship_audit_log').insert({
        application_id: applicationId,
        actor_id: user?.id,
        action: decision,
        old_status: currentStatus,
        new_status: newStatus,
        comments,
      });
      
      // Create notification for applicant
      await supabase.from('notifications').insert({
        user_id: application.applicant_id,
        type: 'scholarship_status',
        title: 'Scholarship Application Update',
        message: `Your scholarship application has been ${decision === 'approve' ? 'approved and moved to the next stage' : decision === 'reject' ? 'rejected' : 'returned for revision'}.`,
        reference_type: 'scholarship_application',
        reference_id: applicationId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-scholarship-queue'] });
      queryClient.invalidateQueries({ queryKey: ['hrbp-scholarship-queue'] });
      queryClient.invalidateQueries({ queryKey: ['committee-scholarship-queue'] });
      queryClient.invalidateQueries({ queryKey: ['finance-scholarship-queue'] });
      queryClient.invalidateQueries({ queryKey: ['final-approval-queue'] });
      queryClient.invalidateQueries({ queryKey: ['scholarship-application'] });
      toast.success('Decision recorded successfully');
    },
    onError: (error) => {
      toast.error('Failed to process decision: ' + error.message);
    },
  });
}

// Submit committee score
export function useSubmitCommitteeScore() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (score: Partial<CommitteeScore> & { application_id: string }) => {
      const totalScore = score.abstained ? null : (
        ((score.candidate_quality_score || 0) + 
         (score.business_relevance_score || 0) + 
         (score.urgency_score || 0) + 
         (score.cost_benefit_score || 0)) / 4
      );
      
      const { error } = await supabase
        .from('scholarship_committee_scores')
        .upsert({
          ...score,
          committee_member_id: user?.id,
          total_score: totalScore,
          scored_at: new Date().toISOString(),
        }, {
          onConflict: 'application_id,committee_member_id',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['committee-scores'] });
      toast.success('Score submitted successfully');
    },
    onError: (error) => {
      toast.error('Failed to submit score: ' + error.message);
    },
  });
}

// Accept/Decline offer mutation
export function useRespondToOffer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      applicationId,
      accept,
      declineReason,
    }: {
      applicationId: string;
      accept: boolean;
      declineReason?: string;
    }) => {
      // Fetch application details for scholar record creation
      const { data: application } = await supabase
        .from('scholarship_applications')
        .select('*')
        .eq('id', applicationId)
        .single();
      
      if (!application) throw new Error('Application not found');
      
      const updateData: Partial<ScholarshipApplication> = accept
        ? {
            status: 'accepted',
            accepted_at: new Date().toISOString(),
          }
        : {
            status: 'declined_by_candidate',
            declined_at: new Date().toISOString(),
            decline_reason: declineReason,
          };
      
      const { error } = await supabase
        .from('scholarship_applications')
        .update(updateData)
        .eq('id', applicationId);
      
      if (error) throw error;
      
      // Auto-create scholar record when candidate accepts
      if (accept) {
        const { data: scholarRecord, error: scholarError } = await supabase
          .from('scholar_records')
          .insert({
            application_id: applicationId,
            employee_id: application.applicant_id,
            program_name: application.program_name_custom || 'Unknown Program',
            institution: application.institution_custom || 'Unknown Institution',
            country: application.country,
            degree_level: application.program_type || 'masters',
            actual_start_date: application.start_date || null,
            expected_end_date: application.end_date || null,
            status: 'not_enrolled',
            risk_level: 'on_track',
            term_structure: 'semester',
          })
          .select()
          .single();
        
        if (scholarError) {
          console.error('Failed to create scholar record:', scholarError);
          // Don't throw - the acceptance was successful, scholar record creation is secondary
        }
        
        // Auto-create bond record
        if (scholarRecord) {
          // Calculate bond duration based on program type and location
          const isAbroad = application.country?.toLowerCase() !== 'libya';
          const isPHD = application.program_type?.toLowerCase() === 'phd';
          const bondDurationMonths = isPHD ? (isAbroad ? 60 : 48) : (isAbroad ? 48 : 36);
          
          const { error: bondError } = await supabase
            .from('service_bonds')
            .insert({
              scholar_record_id: scholarRecord.id,
              application_id: applicationId,
              bond_type: isAbroad ? 'mixed' : 'time_based',
              bond_duration_months: bondDurationMonths,
              funded_amount: application.approved_amount || application.total_estimated_cost,
              currency: application.currency || 'LYD',
              expected_return_date: application.end_date,
              status: 'pending',
              created_by: user?.id,
            });
          
          if (bondError) {
            console.error('Failed to create bond record:', bondError);
            // Don't throw - still secondary to acceptance
          }
        }
      }
      
      // Create audit log
      await supabase.from('scholarship_audit_log').insert({
        application_id: applicationId,
        actor_id: user?.id,
        action: accept ? 'accepted' : 'declined',
        old_status: 'approved_pending_acceptance',
        new_status: accept ? 'accepted' : 'declined_by_candidate',
        comments: declineReason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-scholarship-applications'] });
      queryClient.invalidateQueries({ queryKey: ['scholarship-application'] });
      queryClient.invalidateQueries({ queryKey: ['scholar-records'] });
      queryClient.invalidateQueries({ queryKey: ['my-scholar-record'] });
      queryClient.invalidateQueries({ queryKey: ['bonds'] });
      queryClient.invalidateQueries({ queryKey: ['my-bond'] });
      toast.success('Response recorded successfully');
    },
    onError: (error) => {
      toast.error('Failed to respond: ' + error.message);
    },
  });
}
