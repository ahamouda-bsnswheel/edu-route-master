import { supabase } from '@/integrations/supabase/client';
import { createNotification } from '@/hooks/useNotifications';

/**
 * Approval Chain for Abroad/High-cost Training:
 * Employee → Manager (Level 1) → HRBP (Level 2) → L&D (Level 3) → CHRO (Level 4)
 * 
 * When someone nominates/requests, they auto-approve at their level and route to the next.
 */

export const APPROVAL_LEVELS = {
  MANAGER: 1,
  HRBP: 2,
  L_AND_D: 3,
  CHRO: 4,
} as const;

export const ROLE_TO_LEVEL: Record<string, number> = {
  employee: 0, // Employees start at level 0, their request goes to Manager (level 1)
  manager: 1,
  hrbp: 2,
  l_and_d: 3,
  chro: 4,
  admin: 4, // Admin treated same as CHRO
};

export const LEVEL_TO_ROLE: Record<number, string> = {
  1: 'manager',
  2: 'hrbp',
  3: 'l_and_d',
  4: 'chro',
};

// Check if course requires extended workflow (Abroad/High-cost)
export const requiresExtendedWorkflow = (course: { training_location?: string; cost_level?: string }) => {
  return course?.training_location === 'abroad' || course?.cost_level === 'high';
};

// Find the employee's manager
export const findManagerForEmployee = async (employeeId: string): Promise<string | null> => {
  const { data } = await supabase
    .from('profiles')
    .select('manager_id')
    .eq('id', employeeId)
    .single();
  return data?.manager_id || null;
};

// Find HRBP for an employee's entity
export const findHRBPForEntity = async (employeeId: string): Promise<string | null> => {
  const { data: employeeProfile } = await supabase
    .from('profiles')
    .select('entity_id')
    .eq('id', employeeId)
    .single();

  if (employeeProfile?.entity_id) {
    const { data: hrbpForEntity } = await supabase
      .from('user_roles')
      .select('user_id, profiles!inner(entity_id)')
      .eq('role', 'hrbp')
      .eq('profiles.entity_id', employeeProfile.entity_id)
      .limit(1)
      .single();

    if (hrbpForEntity?.user_id) {
      return hrbpForEntity.user_id;
    }
  }

  // Fallback: find any HRBP
  const { data: anyHrbp } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'hrbp')
    .limit(1)
    .single();
  return anyHrbp?.user_id || null;
};

// Find L&D user
export const findLandDUser = async (): Promise<string | null> => {
  const { data } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'l_and_d')
    .limit(1)
    .single();
  return data?.user_id || null;
};

// Find CHRO user
export const findCHROUser = async (): Promise<string | null> => {
  const { data } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'chro')
    .limit(1)
    .single();
  return data?.user_id || null;
};

// Get the highest role level for a user
export const getUserHighestRoleLevel = async (userId: string): Promise<number> => {
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (!roles || roles.length === 0) return 0;

  let maxLevel = 0;
  for (const { role } of roles) {
    const level = ROLE_TO_LEVEL[role] || 0;
    if (level > maxLevel) maxLevel = level;
  }
  return maxLevel;
};

// Find the next approver in the chain based on level
export const findNextApprover = async (
  currentLevel: number,
  employeeId: string
): Promise<{ approverId: string | null; level: number; role: string | null }> => {
  const nextLevel = currentLevel + 1;

  if (nextLevel > APPROVAL_LEVELS.CHRO) {
    return { approverId: null, level: nextLevel, role: null }; // End of chain
  }

  let approverId: string | null = null;
  const role = LEVEL_TO_ROLE[nextLevel] || null;

  switch (nextLevel) {
    case APPROVAL_LEVELS.MANAGER:
      approverId = await findManagerForEmployee(employeeId);
      break;
    case APPROVAL_LEVELS.HRBP:
      approverId = await findHRBPForEntity(employeeId);
      break;
    case APPROVAL_LEVELS.L_AND_D:
      approverId = await findLandDUser();
      break;
    case APPROVAL_LEVELS.CHRO:
      approverId = await findCHROUser();
      break;
  }

  // If approver not found at this level, try next level
  if (!approverId && nextLevel < APPROVAL_LEVELS.CHRO) {
    return findNextApprover(nextLevel, employeeId);
  }

  return { approverId, level: nextLevel, role };
};

interface WorkflowInitParams {
  nominatorId: string;
  employeeId: string; // The employee being nominated/requesting training
  requestId: string;
  courseName: string;
  isExtendedWorkflow: boolean;
}

/**
 * Initialize workflow after nomination/request creation.
 * - Auto-records approval for the nominator's level
 * - Routes to the next approver in the chain
 */
export const initializeWorkflow = async ({
  nominatorId,
  employeeId,
  requestId,
  courseName,
  isExtendedWorkflow,
}: WorkflowInitParams): Promise<void> => {
  // Determine nominator's position in the approval chain
  const nominatorLevel = await getUserHighestRoleLevel(nominatorId);

  // For simple workflow (local/low-cost), only manager approval needed
  if (!isExtendedWorkflow) {
    if (nominatorLevel >= APPROVAL_LEVELS.MANAGER) {
      // Nominator is manager or higher - auto-approve
      await supabase.from('approvals').insert({
        request_id: requestId,
        approver_id: nominatorId,
        approval_level: APPROVAL_LEVELS.MANAGER,
        approver_role: LEVEL_TO_ROLE[Math.min(nominatorLevel, APPROVAL_LEVELS.MANAGER)] as any,
        status: 'approved',
        decision_date: new Date().toISOString(),
        comments: 'Auto-approved - local/low-cost training',
      });

      await supabase
        .from('training_requests')
        .update({
          status: 'approved',
          current_approver_id: null,
        })
        .eq('id', requestId);

      await createNotification({
        user_id: employeeId,
        title: 'Training Request Approved',
        message: `Your training request for "${courseName}" has been approved.`,
        type: 'request_approved',
        reference_type: 'training_request',
        reference_id: requestId,
      });
    } else {
      // Employee requesting - route to manager
      const { approverId, level, role } = await findNextApprover(0, employeeId);

      if (approverId) {
        await supabase
          .from('training_requests')
          .update({
            current_approval_level: level,
            current_approver_id: approverId,
            status: 'pending',
          })
          .eq('id', requestId);

        await supabase.from('approvals').insert({
          request_id: requestId,
          approver_id: approverId,
          approval_level: level,
          approver_role: role as any,
          status: 'pending',
        });

        await createNotification({
          user_id: approverId,
          title: 'Training Approval Required',
          message: `A training request for "${courseName}" requires your approval.`,
          type: 'approval_required',
          reference_type: 'training_request',
          reference_id: requestId,
        });
      }
    }
    return;
  }

  // Extended workflow: Auto-record approval at nominator's level, route to next
  if (nominatorLevel >= APPROVAL_LEVELS.MANAGER) {
    // Record auto-approval for nominator's level
    await supabase.from('approvals').insert({
      request_id: requestId,
      approver_id: nominatorId,
      approval_level: nominatorLevel,
      approver_role: LEVEL_TO_ROLE[nominatorLevel] as any,
      status: 'approved',
      decision_date: new Date().toISOString(),
      comments: `Auto-approved by ${LEVEL_TO_ROLE[nominatorLevel]} nomination`,
    });
  }

  // Find next approver after nominator's level
  const startLevel = Math.max(nominatorLevel, 0);
  const { approverId, level, role } = await findNextApprover(startLevel, employeeId);

  if (approverId && level <= APPROVAL_LEVELS.CHRO) {
    await supabase
      .from('training_requests')
      .update({
        current_approval_level: level,
        current_approver_id: approverId,
        status: 'pending',
      })
      .eq('id', requestId);

    await supabase.from('approvals').insert({
      request_id: requestId,
      approver_id: approverId,
      approval_level: level,
      approver_role: role as any,
      status: 'pending',
    });

    await createNotification({
      user_id: approverId,
      title: 'Training Approval Required',
      message: `A training request for "${courseName}" requires your approval.`,
      type: 'approval_required',
      reference_type: 'training_request',
      reference_id: requestId,
    });

    // Notify the employee about the nomination
    if (nominatorId !== employeeId) {
      await createNotification({
        user_id: employeeId,
        title: 'Training Nomination',
        message: `You have been nominated for "${courseName}". Pending ${role?.replace('_', ' ').toUpperCase()} approval.`,
        type: 'request_approved',
        reference_type: 'training_request',
        reference_id: requestId,
      });
    }
  } else {
    // No next approver (nominator is CHRO) - auto-approve
    await supabase
      .from('training_requests')
      .update({
        status: 'approved',
        current_approver_id: null,
      })
      .eq('id', requestId);

    await createNotification({
      user_id: employeeId,
      title: 'Training Request Approved',
      message: `Your training request for "${courseName}" has been fully approved.`,
      type: 'request_approved',
      reference_type: 'training_request',
      reference_id: requestId,
    });
  }
};

interface ProcessApprovalParams {
  approvalId: string;
  requestId: string;
  employeeId: string;
  courseName: string;
  currentLevel: number;
  status: 'approved' | 'rejected';
  comments: string;
  isExtendedWorkflow: boolean;
}

/**
 * Process an approval decision and route to next approver if needed.
 */
export const processApprovalDecision = async ({
  approvalId,
  requestId,
  employeeId,
  courseName,
  currentLevel,
  status,
  comments,
  isExtendedWorkflow,
}: ProcessApprovalParams): Promise<void> => {
  // Update the current approval record
  await supabase
    .from('approvals')
    .update({
      status,
      comments,
      decision_date: new Date().toISOString(),
    })
    .eq('id', approvalId);

  if (status === 'rejected') {
    // Rejected: Update request status and notify requester
    await supabase
      .from('training_requests')
      .update({
        status: 'rejected',
        current_approver_id: null,
      })
      .eq('id', requestId);

    await createNotification({
      user_id: employeeId,
      title: 'Training Request Rejected',
      message: `Your training request for "${courseName}" has been rejected. ${comments ? `Reason: ${comments}` : ''}`,
      type: 'request_rejected',
      reference_type: 'training_request',
      reference_id: requestId,
    });
    return;
  }

  // Approved: Determine next step
  if (!isExtendedWorkflow || currentLevel >= APPROVAL_LEVELS.CHRO) {
    // Final approval
    await supabase
      .from('training_requests')
      .update({
        status: 'approved',
        current_approver_id: null,
      })
      .eq('id', requestId);

    await createNotification({
      user_id: employeeId,
      title: 'Training Request Approved',
      message: `Your training request for "${courseName}" has been fully approved!`,
      type: 'request_approved',
      reference_type: 'training_request',
      reference_id: requestId,
    });
    return;
  }

  // Find next approver in chain
  const { approverId, level, role } = await findNextApprover(currentLevel, employeeId);

  if (approverId && level <= APPROVAL_LEVELS.CHRO) {
    // Route to next approver
    await supabase
      .from('training_requests')
      .update({
        current_approval_level: level,
        current_approver_id: approverId,
        status: 'pending',
      })
      .eq('id', requestId);

    await supabase.from('approvals').insert({
      request_id: requestId,
      approver_id: approverId,
      approval_level: level,
      approver_role: role as any,
      status: 'pending',
    });

    await createNotification({
      user_id: approverId,
      title: 'Training Approval Required',
      message: `A training request for "${courseName}" requires your approval.`,
      type: 'approval_required',
      reference_type: 'training_request',
      reference_id: requestId,
    });
  } else {
    // No more approvers - finalize
    await supabase
      .from('training_requests')
      .update({
        status: 'approved',
        current_approver_id: null,
      })
      .eq('id', requestId);

    await createNotification({
      user_id: employeeId,
      title: 'Training Request Approved',
      message: `Your training request for "${courseName}" has been fully approved!`,
      type: 'request_approved',
      reference_type: 'training_request',
      reference_id: requestId,
    });
  }
};
