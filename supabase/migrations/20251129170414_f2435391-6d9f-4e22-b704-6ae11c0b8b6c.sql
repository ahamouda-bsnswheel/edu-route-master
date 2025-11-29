
-- Create a dedicated sequence for request numbers
CREATE SEQUENCE IF NOT EXISTS training_request_number_seq START WITH 3;

-- Update the sequence to be after the current max
SELECT setval('training_request_number_seq', 
  GREATEST(
    (SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM 5 FOR 6) AS INTEGER)), 0) + 1 
     FROM training_requests 
     WHERE request_number LIKE TO_CHAR(NOW(), 'YYYY') || '%'),
    3
  )
);

-- Replace the function to use the sequence
CREATE OR REPLACE FUNCTION public.generate_request_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE 
  year_part VARCHAR(4);
  seq_num INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  seq_num := nextval('training_request_number_seq');
  NEW.request_number := year_part || LPAD(seq_num::TEXT, 6, '0');
  RETURN NEW;
END;
$function$;
