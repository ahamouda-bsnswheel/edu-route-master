-- Drop existing update policies and create a comprehensive one
DROP POLICY IF EXISTS "Approvers can update requests" ON training_requests;
DROP POLICY IF EXISTS "Users can update own draft requests" ON training_requests;

-- Create a single comprehensive UPDATE policy
CREATE POLICY "Update training requests"
ON training_requests
FOR UPDATE
TO authenticated
USING (
  -- Allow if user is the requester (for drafts)
  (requester_id = auth.uid() AND status = 'draft'::request_status)
  -- Or if user is the current approver
  OR current_approver_id = auth.uid()
  -- Or if user has admin/L&D role
  OR has_role(auth.uid(), 'l_and_d'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  -- Allow any changes by approvers or admins
  (current_approver_id = auth.uid())
  OR has_role(auth.uid(), 'l_and_d'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  -- Or allow requesters to update their own drafts (must stay as their request)
  OR (requester_id = auth.uid())
);