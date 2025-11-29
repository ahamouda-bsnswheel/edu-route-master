-- Delete stale notification from Aisha (the old rejected notification)
DELETE FROM notifications 
WHERE id = 'd9c1cfc5-791b-44ff-bcc4-0cee7e1c0fc6';

-- Create fresh notification for the manager (approver) to approve this request
INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
VALUES (
  '99f6b94c-27fb-4e75-ac0f-0782fb79649d',  -- Manager's ID
  'Approval Required',
  'Training request for "Advanced Drilling Operations" from Aisha Al-Derna requires your approval',
  'approval_required',
  'training_request',
  '4bb93393-86a0-46ba-b2ab-7f28c9fdb830'
);