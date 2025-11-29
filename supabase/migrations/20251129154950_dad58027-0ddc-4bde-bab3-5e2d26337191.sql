
-- Function to create notifications
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
  VALUES (p_user_id, p_title, p_message, p_type, p_reference_type, p_reference_id::TEXT)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Trigger: Training Request Submitted → Notify Manager
CREATE OR REPLACE FUNCTION public.notify_on_training_request_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  course_name TEXT;
  requester_name TEXT;
BEGIN
  -- Only trigger when status changes to pending and there's an approver
  IF NEW.status = 'pending' AND NEW.current_approver_id IS NOT NULL THEN
    -- Get course name
    SELECT name_en INTO course_name FROM courses WHERE id = NEW.course_id;
    
    -- Get requester name
    SELECT COALESCE(first_name_en || ' ' || last_name_en, email) INTO requester_name 
    FROM profiles WHERE id = NEW.requester_id;
    
    PERFORM create_notification(
      NEW.current_approver_id,
      'Approval Required',
      'Training request for "' || COALESCE(course_name, 'Unknown Course') || '" from ' || COALESCE(requester_name, 'Employee') || ' requires your approval',
      'approval_required',
      'training_request',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_training_request_submitted
  AFTER INSERT OR UPDATE ON training_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending' AND NEW.current_approver_id IS NOT NULL)
  EXECUTE FUNCTION notify_on_training_request_submitted();

-- Trigger: Approval Decision → Notify Requester
CREATE OR REPLACE FUNCTION public.notify_on_approval_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_record RECORD;
  course_name TEXT;
BEGIN
  -- Only trigger on status change to approved or rejected
  IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status IN ('approved', 'rejected') THEN
    -- Get request details
    SELECT tr.*, c.name_en as course_name 
    INTO request_record
    FROM training_requests tr
    LEFT JOIN courses c ON tr.course_id = c.id
    WHERE tr.id = NEW.request_id;
    
    IF request_record.requester_id IS NOT NULL THEN
      PERFORM create_notification(
        request_record.requester_id,
        CASE NEW.status 
          WHEN 'approved' THEN 'Request Approved'
          ELSE 'Request Rejected'
        END,
        'Your training request for "' || COALESCE(request_record.course_name, 'Unknown Course') || '" has been ' || NEW.status,
        CASE NEW.status 
          WHEN 'approved' THEN 'request_approved'
          ELSE 'request_rejected'
        END,
        'training_request',
        NEW.request_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_approval_decision
  AFTER UPDATE ON approvals
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_approval_decision();

-- Trigger: Session Enrollment → Notify Participant
CREATE OR REPLACE FUNCTION public.notify_on_session_enrollment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_record RECORD;
BEGIN
  -- Notify on new enrollment or status change to confirmed
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'confirmed') THEN
    -- Get session and course details
    SELECT s.*, c.name_en as course_name 
    INTO session_record
    FROM sessions s
    LEFT JOIN courses c ON s.course_id = c.id
    WHERE s.id = NEW.session_id;
    
    PERFORM create_notification(
      NEW.participant_id,
      CASE NEW.status
        WHEN 'confirmed' THEN 'Enrollment Confirmed'
        WHEN 'waitlisted' THEN 'Added to Waitlist'
        ELSE 'Session Enrollment'
      END,
      'You have been ' || 
      CASE NEW.status
        WHEN 'confirmed' THEN 'enrolled in'
        WHEN 'waitlisted' THEN 'added to the waitlist for'
        ELSE 'registered for'
      END ||
      ' "' || COALESCE(session_record.course_name, 'Training Session') || '" on ' || 
      TO_CHAR(session_record.start_date, 'Mon DD, YYYY'),
      CASE NEW.status
        WHEN 'confirmed' THEN 'enrollment_confirmed'
        WHEN 'waitlisted' THEN 'enrollment_waitlisted'
        ELSE 'session_scheduled'
      END,
      'session',
      NEW.session_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_session_enrollment
  AFTER INSERT OR UPDATE ON session_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_session_enrollment();

-- Trigger: Scholarship Application Status Change → Notify Applicant
CREATE OR REPLACE FUNCTION public.notify_on_scholarship_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  status_title TEXT;
  status_message TEXT;
  notification_type TEXT;
BEGIN
  -- Only trigger on status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'pending_manager' THEN
        -- Notify manager
        IF NEW.current_approver_id IS NOT NULL THEN
          PERFORM create_notification(
            NEW.current_approver_id,
            'Scholarship Review Required',
            'Scholarship application ' || COALESCE(NEW.application_number, '') || ' requires your review',
            'approval_required',
            'scholarship_application',
            NEW.id
          );
        END IF;
        RETURN NEW;
      WHEN 'pending_hrbp' THEN
        status_title := 'Application Advanced';
        status_message := 'Your scholarship application has been forwarded to HRBP review';
        notification_type := 'request_approved';
      WHEN 'pending_finance' THEN
        status_title := 'Application Advanced';
        status_message := 'Your scholarship application has been forwarded to Finance review';
        notification_type := 'request_approved';
      WHEN 'pending_committee' THEN
        status_title := 'Application Advanced';
        status_message := 'Your scholarship application has been forwarded to Committee review';
        notification_type := 'request_approved';
      WHEN 'pending_final' THEN
        status_title := 'Application Advanced';
        status_message := 'Your scholarship application is pending final approval';
        notification_type := 'request_approved';
      WHEN 'approved' THEN
        status_title := 'Scholarship Approved';
        status_message := 'Congratulations! Your scholarship application has been approved';
        notification_type := 'request_approved';
      WHEN 'offer_accepted' THEN
        status_title := 'Offer Accepted';
        status_message := 'Your scholarship offer acceptance has been recorded';
        notification_type := 'request_approved';
      WHEN 'rejected' THEN
        status_title := 'Application Not Approved';
        status_message := 'Your scholarship application was not approved. ' || COALESCE(NEW.decline_reason, '');
        notification_type := 'request_rejected';
      WHEN 'returned' THEN
        status_title := 'Application Returned';
        status_message := 'Your scholarship application has been returned for revision';
        notification_type := 'reminder';
      ELSE
        RETURN NEW;
    END CASE;
    
    -- Notify applicant
    PERFORM create_notification(
      NEW.applicant_id,
      status_title,
      status_message,
      notification_type,
      'scholarship_application',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_scholarship_status_change
  AFTER UPDATE ON scholarship_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_scholarship_status_change();

-- Trigger: Bond Events (Waiver Approved/Rejected) → Notify Scholar
CREATE OR REPLACE FUNCTION public.notify_on_bond_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  scholar_user_id UUID;
  event_title TEXT;
  event_message TEXT;
BEGIN
  -- Get scholar's user ID
  SELECT sr.employee_id INTO scholar_user_id
  FROM service_bonds sb
  JOIN scholar_records sr ON sb.scholar_record_id = sr.id
  WHERE sb.id = NEW.bond_id;
  
  IF scholar_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Handle waiver approval/rejection
  IF NEW.event_type = 'waiver_request' AND NEW.approval_status IN ('approved', 'rejected') THEN
    IF OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
      event_title := CASE NEW.approval_status
        WHEN 'approved' THEN 'Waiver Request Approved'
        ELSE 'Waiver Request Declined'
      END;
      event_message := 'Your bond waiver request has been ' || NEW.approval_status;
      
      PERFORM create_notification(
        scholar_user_id,
        event_title,
        event_message,
        CASE NEW.approval_status WHEN 'approved' THEN 'request_approved' ELSE 'request_rejected' END,
        'service_bond',
        NEW.bond_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_bond_event
  AFTER INSERT OR UPDATE ON bond_events
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_bond_event();

-- Trigger: Risk Alert Created → Notify Scholar and L&D
CREATE OR REPLACE FUNCTION public.notify_on_risk_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  scholar_user_id UUID;
  scholar_name TEXT;
BEGIN
  -- Get scholar info
  SELECT sr.employee_id, p.first_name_en || ' ' || p.last_name_en
  INTO scholar_user_id, scholar_name
  FROM scholar_records sr
  LEFT JOIN profiles p ON sr.employee_id = p.id
  WHERE sr.id = NEW.scholar_record_id;
  
  -- Notify scholar if risk is high or critical
  IF scholar_user_id IS NOT NULL AND NEW.new_band IN ('high_risk', 'critical') THEN
    PERFORM create_notification(
      scholar_user_id,
      'Academic Risk Alert',
      'Your academic standing has been flagged as ' || REPLACE(NEW.new_band, '_', ' ') || '. Please contact your advisor.',
      'reminder',
      'scholar_record',
      NEW.scholar_record_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_risk_alert
  AFTER INSERT ON scholar_risk_alerts
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_risk_alert();

-- Trigger: Certificate Issued → Notify Employee
CREATE OR REPLACE FUNCTION public.notify_on_certificate_issued()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  course_name TEXT;
BEGIN
  -- Get course name
  SELECT name_en INTO course_name FROM courses WHERE id = NEW.course_id;
  
  PERFORM create_notification(
    NEW.employee_id,
    'Certificate Issued',
    'Your certificate for "' || COALESCE(course_name, NEW.course_name_en, 'Training') || '" is now available',
    'enrollment_confirmed',
    'certificate',
    NEW.id
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_certificate_issued
  AFTER INSERT ON certificates
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_certificate_issued();
