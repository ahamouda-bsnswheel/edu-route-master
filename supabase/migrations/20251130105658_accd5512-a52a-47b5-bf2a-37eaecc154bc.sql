-- Allow all authenticated users to read user_roles for workflow routing
-- This is necessary for approval chain lookups
CREATE POLICY "Authenticated users can view all roles for workflow" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (true);