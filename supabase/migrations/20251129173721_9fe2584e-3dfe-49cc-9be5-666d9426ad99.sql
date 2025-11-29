-- Fix data inconsistency from earlier RLS bug: 
-- Reset the approval to pending so the manager can try the workflow again

UPDATE approvals 
SET status = 'pending', decision_date = NULL, comments = NULL
WHERE request_id = '4bb93393-86a0-46ba-b2ab-7f28c9fdb830';

UPDATE training_requests 
SET status = 'pending'
WHERE id = '4bb93393-86a0-46ba-b2ab-7f28c9fdb830';