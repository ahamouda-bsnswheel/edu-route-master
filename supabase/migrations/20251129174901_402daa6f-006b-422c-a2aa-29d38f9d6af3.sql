-- Drop and recreate the approvers update policy to ensure WITH CHECK is correct
DROP POLICY IF EXISTS "Approvers can update requests" ON training_requests;

CREATE POLICY "Approvers can update requests"
ON training_requests
FOR UPDATE
TO authenticated
USING (
  current_approver_id = auth.uid()
  OR has_role(auth.uid(), 'l_and_d'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (true);