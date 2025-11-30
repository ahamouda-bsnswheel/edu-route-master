-- Allow users to see approval records where they are the approver
CREATE POLICY "Users can view their own approval records"
ON public.approvals
FOR SELECT
TO authenticated
USING (approver_id = auth.uid());

-- Also allow users to see approvals for requests they created
CREATE POLICY "Requesters can view approvals for their requests"
ON public.approvals
FOR SELECT
TO authenticated
USING (
  request_id IN (
    SELECT id FROM public.training_requests WHERE requester_id = auth.uid()
  )
);

-- Allow approvers to update their own pending approval records
CREATE POLICY "Approvers can update their approval records"
ON public.approvals
FOR UPDATE
TO authenticated
USING (approver_id = auth.uid())
WITH CHECK (approver_id = auth.uid());