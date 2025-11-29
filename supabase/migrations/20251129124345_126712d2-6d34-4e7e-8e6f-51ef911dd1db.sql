-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- Create a more restrictive policy that allows:
-- 1. Users to view their own profile
-- 2. Managers to view profiles of their direct reports
-- 3. Admin, L&D, and HRBP roles to view all profiles (business need)
CREATE POLICY "Users can view authorized profiles" ON profiles
FOR SELECT USING (
  id = auth.uid() OR
  manager_id = auth.uid() OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'l_and_d'::app_role) OR
  has_role(auth.uid(), 'hrbp'::app_role)
);