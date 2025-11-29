import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { createNotification } from './useNotifications';

interface WorkflowTemplate {
  id: string;
  name_en: string;
  name_ar: string | null;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
}

interface WorkflowStep {
  id: string;
  template_id: string;
  step_order: number;
  approver_role: string;
  is_auto_approve: boolean;
  can_delegate: boolean;
  timeout_days: number;
}

export function useWorkflowTemplates() {
  return useQuery({
    queryKey: ['workflow-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('is_active', true)
        .order('name_en');

      if (error) throw error;
      return data as WorkflowTemplate[];
    },
  });
}

export function useWorkflowSteps(templateId: string | null) {
  return useQuery({
    queryKey: ['workflow-steps', templateId],
    queryFn: async () => {
      if (!templateId) return [];
      
      const { data, error } = await supabase
        .from('workflow_steps')
        .select('*')
        .eq('template_id', templateId)
        .order('step_order');

      if (error) throw error;
      return data as WorkflowStep[];
    },
    enabled: !!templateId,
  });
}

export function useApprovalActions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const processApproval = useMutation({
    mutationFn: async ({
      approvalId,
      requestId,
      status,
      comments,
      nextApproverId,
      nextApprovalLevel,
      requesterId,
    }: {
      approvalId: string;
      requestId: string;
      status: 'approved' | 'rejected';
      comments: string;
      nextApproverId?: string;
      nextApprovalLevel?: number;
      requesterId: string;
    }) => {
      // Update the approval record
      const { error: approvalError } = await supabase
        .from('approvals')
        .update({
          status,
          comments,
          decision_date: new Date().toISOString(),
        })
        .eq('id', approvalId);

      if (approvalError) throw approvalError;

      // Update the training request using security definer function
      if (status === 'rejected') {
        const { error: updateError } = await supabase.rpc('process_training_request_approval', {
          p_request_id: requestId,
          p_new_status: 'rejected',
          p_current_approver_id: null,
        });
        if (updateError) throw updateError;

        // Notify requester of rejection
        await createNotification({
          user_id: requesterId,
          title: 'Training Request Rejected',
          message: `Your training request has been rejected. ${comments ? `Reason: ${comments}` : ''}`,
          type: 'request_rejected',
          reference_type: 'training_request',
          reference_id: requestId,
        });
      } else if (nextApproverId && nextApprovalLevel) {
        // Move to next approval step using security definer function
        const { error: updateError } = await supabase.rpc('process_training_request_approval', {
          p_request_id: requestId,
          p_new_status: 'pending',
          p_current_approver_id: nextApproverId,
        });
        if (updateError) throw updateError;
        
        // Update the approval level separately (not in the function)
        await supabase
          .from('training_requests')
          .update({ current_approval_level: nextApprovalLevel })
          .eq('id', requestId);

        // Create next approval record
        await supabase.from('approvals').insert({
          request_id: requestId,
          approver_id: nextApproverId,
          approval_level: nextApprovalLevel,
          approver_role: 'manager', // This should be dynamic based on workflow
          status: 'pending',
        });

        // Notify next approver
        await createNotification({
          user_id: nextApproverId,
          title: 'New Approval Required',
          message: 'A training request requires your approval.',
          type: 'approval_required',
          reference_type: 'training_request',
          reference_id: requestId,
        });
      } else {
        // Final approval - mark as approved using security definer function
        const { error: updateError } = await supabase.rpc('process_training_request_approval', {
          p_request_id: requestId,
          p_new_status: 'approved',
          p_current_approver_id: null,
        });
        if (updateError) throw updateError;

        // Notify requester of approval
        await createNotification({
          user_id: requesterId,
          title: 'Training Request Approved',
          message: 'Your training request has been fully approved and is ready for scheduling.',
          type: 'request_approved',
          reference_type: 'training_request',
          reference_id: requestId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['training-requests'] });
    },
  });

  const delegateApproval = useMutation({
    mutationFn: async ({
      approvalId,
      delegateToUserId,
      comments,
    }: {
      approvalId: string;
      delegateToUserId: string;
      comments: string;
    }) => {
      const { error } = await supabase
        .from('approvals')
        .update({
          delegated_from: user?.id,
          approver_id: delegateToUserId,
          comments: `Delegated: ${comments}`,
        })
        .eq('id', approvalId);

      if (error) throw error;

      // Notify the delegate
      await createNotification({
        user_id: delegateToUserId,
        title: 'Approval Delegated to You',
        message: 'A training request approval has been delegated to you.',
        type: 'approval_required',
        reference_type: 'approval',
        reference_id: approvalId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
    },
  });

  return {
    processApproval,
    delegateApproval,
  };
}
