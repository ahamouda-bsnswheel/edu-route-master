-- Fix create_notification function: remove invalid TEXT cast for UUID column
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
  VALUES (p_user_id, p_title, p_message, p_type, p_reference_type, p_reference_id)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;