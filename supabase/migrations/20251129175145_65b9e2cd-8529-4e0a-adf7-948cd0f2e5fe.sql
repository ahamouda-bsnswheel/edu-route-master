-- Fix the draft update policy to have explicit WITH CHECK
DROP POLICY IF EXISTS "Users can update own draft requests" ON training_requests;

CREATE POLICY "Users can update own draft requests"
ON training_requests
FOR UPDATE
TO authenticated
USING (
  requester_id = auth.uid() 
  AND status = 'draft'::request_status
)
WITH CHECK (
  requester_id = auth.uid()
);