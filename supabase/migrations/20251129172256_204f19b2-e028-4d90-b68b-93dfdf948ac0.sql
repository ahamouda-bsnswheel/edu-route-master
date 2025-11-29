-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Update own approvals" ON public.approvals;

-- Create a permissive policy with proper USING (checks old row) and WITH CHECK (checks new row)
CREATE POLICY "Update own approvals" 
ON public.approvals 
FOR UPDATE 
TO authenticated
USING (approver_id = auth.uid() AND status = 'pending'::approval_status)
WITH CHECK (approver_id = auth.uid());