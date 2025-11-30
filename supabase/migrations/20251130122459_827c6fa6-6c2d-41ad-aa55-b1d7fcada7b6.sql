
-- Fix stuck requests: auto-approve local/low-cost ones
UPDATE training_requests
SET status = 'approved', current_approver_id = NULL
WHERE id IN (
  '8b1d7839-90a0-446e-afd5-0e40fdda57c4',
  '44764eb7-e7b5-44d7-904a-3014670987d6',
  '6f320a79-c174-4707-a694-9831eed38bbf',
  'baa90f6d-23ad-4229-9713-23a15afe88de',
  'c7933212-9d21-4a2b-bf9a-3b6956d49756'
);

-- Fix stuck requests: route abroad/high-cost ones to HRBP (Omar Benghazi)
UPDATE training_requests
SET current_approval_level = 2, 
    current_approver_id = 'ab4e1295-afe7-4e2b-8426-ebe3a398e095'
WHERE id IN (
  'a8105da8-c698-4960-905d-1f228bafed8c',
  'a0b0b387-a85e-459d-b2ac-a8843fd1d0ba',
  '0a768f42-b2dd-48d4-bfbe-13e49a932d99'
);

-- Create pending approval records for HRBP for the abroad/high-cost requests
INSERT INTO approvals (request_id, approver_id, approval_level, approver_role, status)
VALUES 
  ('a8105da8-c698-4960-905d-1f228bafed8c', 'ab4e1295-afe7-4e2b-8426-ebe3a398e095', 2, 'hrbp', 'pending'),
  ('a0b0b387-a85e-459d-b2ac-a8843fd1d0ba', 'ab4e1295-afe7-4e2b-8426-ebe3a398e095', 2, 'hrbp', 'pending'),
  ('0a768f42-b2dd-48d4-bfbe-13e49a932d99', 'ab4e1295-afe7-4e2b-8426-ebe3a398e095', 2, 'hrbp', 'pending')
ON CONFLICT DO NOTHING;
