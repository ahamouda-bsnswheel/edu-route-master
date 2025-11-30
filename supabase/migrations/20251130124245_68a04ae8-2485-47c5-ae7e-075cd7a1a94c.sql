-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create training requests" ON public.training_requests;

-- Create updated INSERT policy that includes HRBP
CREATE POLICY "Users can create training requests" 
ON public.training_requests 
FOR INSERT 
WITH CHECK (
  -- Users can create their own requests
  (requester_id = auth.uid()) 
  OR 
  -- Managers can create for direct reports
  (has_role(auth.uid(), 'manager'::app_role) AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = training_requests.requester_id 
    AND profiles.manager_id = auth.uid()
  ))
  OR
  -- HRBP can create for employees in their entity
  (has_role(auth.uid(), 'hrbp'::app_role) AND EXISTS (
    SELECT 1 FROM profiles AS requester_profile, profiles AS hrbp_profile
    WHERE requester_profile.id = training_requests.requester_id 
    AND hrbp_profile.id = auth.uid()
    AND requester_profile.entity_id = hrbp_profile.entity_id
  ))
  OR
  -- L&D can create for anyone
  has_role(auth.uid(), 'l_and_d'::app_role)
  OR
  -- Admin can create for anyone
  has_role(auth.uid(), 'admin'::app_role)
);