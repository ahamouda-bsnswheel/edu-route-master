-- Fix INSERT policy to allow managers to nominate team members
DROP POLICY IF EXISTS "Users can create own requests" ON training_requests;

CREATE POLICY "Users can create training requests" ON training_requests
FOR INSERT TO authenticated
WITH CHECK (
  -- Users can create their own requests
  requester_id = auth.uid() OR
  -- Managers can create requests for their team members
  (has_role(auth.uid(), 'manager') AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = requester_id 
    AND profiles.manager_id = auth.uid()
  )) OR
  -- L&D can create requests for anyone
  has_role(auth.uid(), 'l_and_d') OR
  has_role(auth.uid(), 'admin')
);