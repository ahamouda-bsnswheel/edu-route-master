
-- Fix race condition in request number generation using advisory lock
CREATE OR REPLACE FUNCTION public.generate_request_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE 
  year_part VARCHAR(4);
  seq_num INTEGER;
  lock_id BIGINT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  -- Use advisory lock to prevent race conditions
  -- Lock ID based on year to allow concurrent inserts across different years
  lock_id := ('x' || md5('training_requests_' || year_part))::bit(32)::bigint;
  PERFORM pg_advisory_xact_lock(lock_id);
  
  -- Now safely get the next sequence number
  SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM 5 FOR 6) AS INTEGER)), 0) + 1 
  INTO seq_num
  FROM public.training_requests 
  WHERE request_number LIKE year_part || '%';
  
  NEW.request_number := year_part || LPAD(seq_num::TEXT, 6, '0');
  RETURN NEW;
END;
$function$;
