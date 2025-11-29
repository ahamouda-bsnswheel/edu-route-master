-- Create a security definer function to process approvals
-- This bypasses RLS while maintaining security through parameter validation

CREATE OR REPLACE FUNCTION process_training_request_approval(
  p_request_id UUID,
  p_new_status TEXT,
  p_current_approver_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_approver UUID;
  v_caller_id UUID;
BEGIN
  -- Get the caller's ID
  v_caller_id := auth.uid();
  
  -- Verify caller is the current approver for this request
  SELECT current_approver_id INTO v_current_approver
  FROM training_requests
  WHERE id = p_request_id;
  
  IF v_current_approver IS NULL OR v_current_approver != v_caller_id THEN
    -- Also check if caller has admin or l_and_d role
    IF NOT (has_role(v_caller_id, 'admin') OR has_role(v_caller_id, 'l_and_d')) THEN
      RAISE EXCEPTION 'Not authorized to process this approval';
    END IF;
  END IF;
  
  -- Update the training request
  UPDATE training_requests
  SET 
    status = p_new_status::request_status,
    current_approver_id = p_current_approver_id,
    updated_at = now()
  WHERE id = p_request_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION process_training_request_approval(UUID, TEXT, UUID) TO authenticated;