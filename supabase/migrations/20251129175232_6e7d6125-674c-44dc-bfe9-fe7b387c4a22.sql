-- Fix the update policy - the WITH CHECK evaluates NEW row, 
-- but we're setting current_approver_id to NULL
DROP POLICY IF EXISTS "Update training requests" ON training_requests;

-- Create policy that properly handles approver updates
CREATE POLICY "Update training requests"
ON training_requests
FOR UPDATE
TO authenticated
USING (
  -- Allow if user is the requester (for drafts)
  (requester_id = auth.uid() AND status = 'draft'::request_status)
  -- Or if user is the current approver (check OLD row via USING)
  OR current_approver_id = auth.uid()
  -- Or if user has admin/L&D role
  OR has_role(auth.uid(), 'l_and_d'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  -- If USING passed, allow the update - use TRUE for approvers/admins
  -- Requesters can only update their own requests
  requester_id = auth.uid()
  OR has_role(auth.uid(), 'l_and_d'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  -- For approvers: we need to check they were the approver (can't check OLD in WITH CHECK)
  -- So we allow if they're NOT the requester but have "manager" role
  OR has_role(auth.uid(), 'manager'::app_role)
);