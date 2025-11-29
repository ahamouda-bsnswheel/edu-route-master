-- =====================================================
-- Feature HR-LMS-01.03-F03: Attendance & Completion Tracking
-- =====================================================

-- 1. Add completion rules to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS min_attendance_percent integer DEFAULT 80,
ADD COLUMN IF NOT EXISTS pass_score integer,
ADD COLUMN IF NOT EXISTS has_assessment boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS require_both_attendance_and_assessment boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS certificate_template text,
ADD COLUMN IF NOT EXISTS validity_months integer;

-- 2. Update session_enrollments with detailed attendance/completion fields
ALTER TABLE public.session_enrollments 
ADD COLUMN IF NOT EXISTS check_in_time timestamptz,
ADD COLUMN IF NOT EXISTS check_out_time timestamptz,
ADD COLUMN IF NOT EXISTS attendance_minutes integer,
ADD COLUMN IF NOT EXISTS attendance_comments text,
ADD COLUMN IF NOT EXISTS completion_status varchar DEFAULT 'pending', -- pending, in_progress, completed, not_completed, failed
ADD COLUMN IF NOT EXISTS assessment_score numeric,
ADD COLUMN IF NOT EXISTS passed boolean,
ADD COLUMN IF NOT EXISTS completion_date timestamptz,
ADD COLUMN IF NOT EXISTS certificate_url text,
ADD COLUMN IF NOT EXISTS certificate_generated_at timestamptz,
ADD COLUMN IF NOT EXISTS is_attendance_final boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS attendance_finalized_at timestamptz,
ADD COLUMN IF NOT EXISTS attendance_finalized_by uuid,
ADD COLUMN IF NOT EXISTS is_completion_final boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS completion_finalized_at timestamptz,
ADD COLUMN IF NOT EXISTS completion_finalized_by uuid;

-- 3. Attendance audit log table
CREATE TABLE public.attendance_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid REFERENCES session_enrollments(id) ON DELETE CASCADE NOT NULL,
  field_changed varchar NOT NULL, -- attendance_status, completion_status, assessment_score, passed
  old_value text,
  new_value text,
  reason text,
  changed_by uuid NOT NULL,
  changed_at timestamptz DEFAULT now()
);

ALTER TABLE public.attendance_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "L&D can view audit logs" ON attendance_audit_log
FOR SELECT USING (has_role(auth.uid(), 'l_and_d'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert audit logs" ON attendance_audit_log
FOR INSERT WITH CHECK (true);

-- 4. Compliance tracking table (for mandatory training)
CREATE TABLE public.compliance_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  target_type varchar NOT NULL, -- 'all', 'entity', 'department', 'job_role', 'grade'
  target_value text, -- specific entity_id, department_id, job role, or grade
  recurrence_months integer, -- e.g., 12 for annual, 24 for biennial
  grace_period_days integer DEFAULT 30,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.compliance_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view requirements" ON compliance_requirements
FOR SELECT USING (true);

CREATE POLICY "L&D can manage requirements" ON compliance_requirements
FOR ALL USING (has_role(auth.uid(), 'l_and_d'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 5. Employee compliance status (computed/cached)
CREATE TABLE public.employee_compliance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  requirement_id uuid REFERENCES compliance_requirements(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  last_completion_date timestamptz,
  next_due_date timestamptz,
  status varchar DEFAULT 'pending', -- compliant, due_soon, overdue, pending
  last_enrollment_id uuid REFERENCES session_enrollments(id),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, requirement_id)
);

ALTER TABLE public.employee_compliance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own compliance" ON employee_compliance
FOR SELECT USING (
  employee_id = auth.uid() OR
  has_role(auth.uid(), 'l_and_d'::app_role) OR
  has_role(auth.uid(), 'hrbp'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = employee_compliance.employee_id AND p.manager_id = auth.uid())
);

CREATE POLICY "L&D can manage compliance" ON employee_compliance
FOR ALL USING (has_role(auth.uid(), 'l_and_d'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_enrollments_attendance ON session_enrollments(session_id, status) WHERE status IN ('confirmed', 'completed');
CREATE INDEX IF NOT EXISTS idx_session_enrollments_completion ON session_enrollments(participant_id, completion_status);
CREATE INDEX IF NOT EXISTS idx_employee_compliance_status ON employee_compliance(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_employee_compliance_due ON employee_compliance(next_due_date) WHERE status IN ('due_soon', 'overdue');
CREATE INDEX IF NOT EXISTS idx_attendance_audit_enrollment ON attendance_audit_log(enrollment_id);

-- 7. Add trainer_id to sessions for access control
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS trainer_id uuid;

-- 8. Update session_enrollments RLS to allow trainers to update attendance
DROP POLICY IF EXISTS "Trainers can update attendance" ON session_enrollments;
CREATE POLICY "Trainers can update attendance" ON session_enrollments
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM sessions s 
    WHERE s.id = session_enrollments.session_id 
    AND (s.trainer_id = auth.uid() OR s.created_by = auth.uid())
  ) OR
  has_role(auth.uid(), 'l_and_d'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);