-- Fix the training_requests UPDATE policy to allow current_approver to update
DROP POLICY IF EXISTS "Update training requests" ON training_requests;

CREATE POLICY "Update training requests" ON training_requests
FOR UPDATE TO authenticated
USING (
  (requester_id = auth.uid() AND status = 'draft') OR
  (current_approver_id = auth.uid()) OR
  has_role(auth.uid(), 'l_and_d') OR
  has_role(auth.uid(), 'admin')
)
WITH CHECK (
  (requester_id = auth.uid()) OR
  (current_approver_id = auth.uid()) OR
  has_role(auth.uid(), 'l_and_d') OR
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'manager')
);

-- Also ensure managers can view requests assigned to them for approval
DROP POLICY IF EXISTS "Users can view own requests" ON training_requests;

CREATE POLICY "Users can view own requests" ON training_requests
FOR SELECT TO authenticated
USING (
  requester_id = auth.uid() OR
  current_approver_id = auth.uid() OR
  has_role(auth.uid(), 'l_and_d') OR
  has_role(auth.uid(), 'hrbp') OR
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'manager')
);