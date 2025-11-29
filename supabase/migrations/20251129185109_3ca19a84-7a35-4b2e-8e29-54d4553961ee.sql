-- Drop all notification functions with CASCADE (will also drop dependent triggers)
DROP FUNCTION IF EXISTS notify_on_training_request_submitted() CASCADE;
DROP FUNCTION IF EXISTS notify_on_approval_decision() CASCADE;
DROP FUNCTION IF EXISTS notify_on_session_enrollment() CASCADE;
DROP FUNCTION IF EXISTS notify_on_scholarship_status_change() CASCADE;
DROP FUNCTION IF EXISTS notify_on_bond_event() CASCADE;
DROP FUNCTION IF EXISTS notify_on_risk_alert() CASCADE;
DROP FUNCTION IF EXISTS notify_on_certificate_issued() CASCADE;