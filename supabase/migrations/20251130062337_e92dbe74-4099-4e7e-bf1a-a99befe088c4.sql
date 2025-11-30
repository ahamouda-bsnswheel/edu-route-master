-- Fix function search path for security
CREATE OR REPLACE FUNCTION public.generate_export_batch_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE 
  year_part VARCHAR(4);
  seq_num INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(batch_number FROM 5 FOR 6) AS INTEGER)), 0) + 1 
  INTO seq_num
  FROM public.expense_export_batches 
  WHERE batch_number LIKE 'EXP-' || year_part || '%';
  NEW.batch_number := 'EXP-' || year_part || '-' || LPAD(seq_num::TEXT, 6, '0');
  RETURN NEW;
END;
$function$;