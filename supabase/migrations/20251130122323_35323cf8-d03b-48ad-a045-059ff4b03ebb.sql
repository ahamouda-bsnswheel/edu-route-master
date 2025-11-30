
-- Create a SECURITY DEFINER function to initialize workflow
-- This bypasses RLS so that the requester can set up the approval chain
CREATE OR REPLACE FUNCTION public.initialize_training_request_workflow(
  p_request_id uuid,
  p_current_approval_level integer,
  p_current_approver_id uuid,
  p_status text DEFAULT 'pending'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE training_requests
  SET 
    current_approval_level = p_current_approval_level,
    current_approver_id = p_current_approver_id,
    status = p_status::request_status,
    updated_at = now()
  WHERE id = p_request_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.initialize_training_request_workflow(uuid, integer, uuid, text) TO authenticated;
