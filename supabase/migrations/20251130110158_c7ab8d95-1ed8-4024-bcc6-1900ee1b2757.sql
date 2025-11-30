-- Allow current approvers to update training requests they're assigned to
CREATE POLICY "Current approvers can update assigned requests" 
ON public.training_requests 
FOR UPDATE 
TO authenticated
USING (current_approver_id = auth.uid())
WITH CHECK (true);

-- Allow HRBP, L&D, CHRO, Admin to view all training requests for approval workflow
CREATE POLICY "Approval chain roles can view all requests" 
ON public.training_requests 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'hrbp') OR 
  has_role(auth.uid(), 'l_and_d') OR 
  has_role(auth.uid(), 'chro') OR 
  has_role(auth.uid(), 'admin')
);

-- Allow workflow system to insert approval records for any approver
CREATE POLICY "Workflow can create approvals for chain" 
ON public.approvals 
FOR INSERT 
TO authenticated
WITH CHECK (true);