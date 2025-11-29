-- Drop the existing approvers update policy
DROP POLICY IF EXISTS "Approvers can update requests" ON public.training_requests;

-- Create a policy with proper WITH CHECK that allows status updates
CREATE POLICY "Approvers can update requests" 
ON public.training_requests 
FOR UPDATE 
TO authenticated
USING (current_approver_id = auth.uid() OR has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'))
WITH CHECK (true);