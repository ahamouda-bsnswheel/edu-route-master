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
  console.log('[findHRBPForEntity] Looking for HRBP for employee:', employeeId);
  
  const { data: employeeProfile, error: profileError } = await supabase
    .from('profiles')
    .select('entity_id')
    .eq('id', employeeId)
    .single();

  if (profileError) {
    console.error('[findHRBPForEntity] Error fetching employee profile:', profileError);
  }
  
  console.log('[findHRBPForEntity] Employee entity_id:', employeeProfile?.entity_id);

  if (employeeProfile?.entity_id) {
    // Find all HRBPs
    const { data: hrbpRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'hrbp');

    if (rolesError) {
      console.error('[findHRBPForEntity] Error fetching HRBP roles:', rolesError);
    }
    
    console.log('[findHRBPForEntity] Found HRBP roles:', hrbpRoles);

    if (hrbpRoles && hrbpRoles.length > 0) {
      // Check each HRBP's entity
      for (const hrbpRole of hrbpRoles) {
        const { data: hrbpProfile } = await supabase
          .from('profiles')
          .select('entity_id')
          .eq('id', hrbpRole.user_id)
          .single();
        
        console.log('[findHRBPForEntity] Checking HRBP:', hrbpRole.user_id, 'entity:', hrbpProfile?.entity_id);
        
        if (hrbpProfile?.entity_id === employeeProfile.entity_id) {
          console.log('[findHRBPForEntity] Found matching HRBP:', hrbpRole.user_id);
          return hrbpRole.user_id;
        }
      }
    }
  }

  // Fallback: find any HRBP
  console.log('[findHRBPForEntity] Using fallback - finding any HRBP');
  const { data: anyHrbp } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'hrbp')
    .limit(1)
    .maybeSingle();
  
  console.log('[findHRBPForEntity] Fallback HRBP:', anyHrbp?.user_id);
  return anyHrbp?.user_id || null;
};

// Find L&D user
export const findLandDUser = async (): Promise<string | null> => {
  console.log('[findLandDUser] Looking for L&D user');
  const { data, error } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'l_and_d')
    .limit(1)
    .maybeSingle();
  
  if (error) console.error('[findLandDUser] Error:', error);
  console.log('[findLandDUser] Found:', data?.user_id);
  return data?.user_id || null;
};

// Find CHRO user
export const findCHROUser = async (): Promise<string | null> => {
  console.log('[findCHROUser] Looking for CHRO user');
  const { data, error } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'chro')
    .limit(1)
    .maybeSingle();
  
  if (error) console.error('[findCHROUser] Error:', error);
  console.log('[findCHROUser] Found:', data?.user_id);
  return data?.user_id || null;
};

// Get the highest role level for a user
export const getUserHighestRoleLevel = async (userId: string): Promise<number> => {
  console.log('[getUserHighestRoleLevel] Getting level for user:', userId);
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (!roles || roles.length === 0) {
    console.log('[getUserHighestRoleLevel] No roles found, returning 0');
    return 0;
  }

  let maxLevel = 0;
  for (const { role } of roles) {
    const level = ROLE_TO_LEVEL[role] || 0;
    if (level > maxLevel) maxLevel = level;
  }
  console.log('[getUserHighestRoleLevel] Max level:', maxLevel, 'roles:', roles);
  return maxLevel;
};

// Find the next approver in the chain based on level
export const findNextApprover = async (
  currentLevel: number,
  employeeId: string
): Promise<{ approverId: string | null; level: number; role: string | null }> => {
  const nextLevel = currentLevel + 1;
  console.log('[findNextApprover] Current level:', currentLevel, '-> Next level:', nextLevel);

  if (nextLevel > APPROVAL_LEVELS.CHRO) {
    console.log('[findNextApprover] Beyond CHRO level, returning null');
    return { approverId: null, level: nextLevel, role: null }; // End of chain
  }

  let approverId: string | null = null;
  const role = LEVEL_TO_ROLE[nextLevel] || null;
  console.log('[findNextApprover] Looking for role:', role);

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

  console.log('[findNextApprover] Found approver:', approverId, 'for level:', nextLevel);

  // If approver not found at this level, try next level
  if (!approverId && nextLevel < APPROVAL_LEVELS.CHRO) {
    console.log('[findNextApprover] No approver found at level', nextLevel, '- trying next level');
    return findNextApprover(nextLevel, employeeId);
  }

  console.log('[findNextApprover] Returning:', { approverId, level: nextLevel, role });
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
  console.log('[initializeWorkflow] Starting workflow:', { nominatorId, employeeId, requestId, courseName, isExtendedWorkflow });
  
  // Determine nominator's position in the approval chain
  const nominatorLevel = await getUserHighestRoleLevel(nominatorId);
  console.log('[initializeWorkflow] Nominator level:', nominatorLevel, 'isExtendedWorkflow:', isExtendedWorkflow);

  // For simple workflow (local/low-cost), only manager approval needed
  if (!isExtendedWorkflow) {
    console.log('[initializeWorkflow] Simple workflow path');
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

      // Use RPC to bypass RLS
      await supabase.rpc('initialize_training_request_workflow', {
        p_request_id: requestId,
        p_current_approval_level: APPROVAL_LEVELS.MANAGER,
        p_current_approver_id: null,
        p_status: 'approved',
      });

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
        // Use RPC to bypass RLS for workflow initialization
        await supabase.rpc('initialize_training_request_workflow', {
          p_request_id: requestId,
          p_current_approval_level: level,
          p_current_approver_id: approverId,
          p_status: 'pending',
        });

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
  console.log('[Workflow] Extended workflow for request:', requestId);
  console.log('[Workflow] Nominator level:', nominatorLevel);
  
  if (nominatorLevel >= APPROVAL_LEVELS.MANAGER) {
    // Record auto-approval for nominator's level
    const { error: autoApprovalError } = await supabase.from('approvals').insert({
      request_id: requestId,
      approver_id: nominatorId,
      approval_level: nominatorLevel,
      approver_role: LEVEL_TO_ROLE[nominatorLevel] as any,
      status: 'approved',
      decision_date: new Date().toISOString(),
      comments: `Auto-approved by ${LEVEL_TO_ROLE[nominatorLevel]} nomination`,
    });
    
    if (autoApprovalError) {
      console.error('[Workflow] Error recording auto-approval:', autoApprovalError);
    }
  }

  // Find next approver after nominator's level
  const startLevel = Math.max(nominatorLevel, 0);
  console.log('[Workflow] Finding next approver from level:', startLevel);
  
  const { approverId, level, role } = await findNextApprover(startLevel, employeeId);
  
  console.log('[Workflow] Next approver result:', { approverId, level, role });

  if (approverId && level <= APPROVAL_LEVELS.CHRO) {
    console.log('[Workflow] Routing to next approver:', approverId, 'at level:', level);
    
    // Use RPC to bypass RLS for workflow initialization
    const { error: updateError } = await supabase.rpc('initialize_training_request_workflow', {
      p_request_id: requestId,
      p_current_approval_level: level,
      p_current_approver_id: approverId,
      p_status: 'pending',
    });

    if (updateError) {
      console.error('[Workflow] Error updating request:', updateError);
    }

    const { error: insertApprovalError } = await supabase.from('approvals').insert({
      request_id: requestId,
      approver_id: approverId,
      approval_level: level,
      approver_role: role as any,
      status: 'pending',
    });

    if (insertApprovalError) {
      console.error('[Workflow] Error creating pending approval:', insertApprovalError);
    }

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
    console.log('[Workflow] No next approver found, auto-approving');
    
    // Use RPC to bypass RLS
    const { error: finalApproveError } = await supabase.rpc('initialize_training_request_workflow', {
      p_request_id: requestId,
      p_current_approval_level: APPROVAL_LEVELS.CHRO,
      p_current_approver_id: null,
      p_status: 'approved',
    });

    if (finalApproveError) {
      console.error('[Workflow] Error final approving:', finalApproveError);
    }

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
    // Rejected: Update request status and notify requester - use RPC to bypass RLS
    await supabase.rpc('initialize_training_request_workflow', {
      p_request_id: requestId,
      p_current_approval_level: currentLevel,
      p_current_approver_id: null,
      p_status: 'rejected',
    });

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
    // Final approval - use RPC to bypass RLS
    await supabase.rpc('initialize_training_request_workflow', {
      p_request_id: requestId,
      p_current_approval_level: currentLevel,
      p_current_approver_id: null,
      p_status: 'approved',
    });

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
    // Route to next approver - use RPC to bypass RLS
    await supabase.rpc('initialize_training_request_workflow', {
      p_request_id: requestId,
      p_current_approval_level: level,
      p_current_approver_id: approverId,
      p_status: 'pending',
    });

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
    // No more approvers - finalize - use RPC to bypass RLS
    await supabase.rpc('initialize_training_request_workflow', {
      p_request_id: requestId,
      p_current_approval_level: currentLevel,
      p_current_approver_id: null,
      p_status: 'approved',
    });

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
