-- =====================================================
-- Feature HR-LMS-01.03-F02: Approval & Scheduling Workflow
-- =====================================================

-- 1. Workflow Templates Table (defines approval sequences)
CREATE TABLE public.workflow_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en varchar NOT NULL,
  name_ar varchar,
  description text,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active templates" ON workflow_templates
FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'l_and_d'::app_role));

CREATE POLICY "L&D can manage templates" ON workflow_templates
FOR ALL USING (has_role(auth.uid(), 'l_and_d'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 2. Workflow Steps Table (defines steps in each template)
CREATE TABLE public.workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES workflow_templates(id) ON DELETE CASCADE NOT NULL,
  step_order integer NOT NULL,
  approver_role app_role NOT NULL,
  is_auto_approve boolean DEFAULT false,
  auto_approve_condition jsonb,
  can_delegate boolean DEFAULT true,
  timeout_days integer DEFAULT 7,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view steps" ON workflow_steps
FOR SELECT USING (true);

CREATE POLICY "L&D can manage steps" ON workflow_steps
FOR ALL USING (has_role(auth.uid(), 'l_and_d'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 3. Workflow Rules Table (conditions for template selection)
CREATE TABLE public.workflow_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES workflow_templates(id) ON DELETE CASCADE NOT NULL,
  priority integer DEFAULT 0,
  condition_type varchar NOT NULL, -- 'cost_threshold', 'location', 'category', 'mandatory'
  condition_operator varchar NOT NULL, -- 'eq', 'gt', 'lt', 'in', 'contains'
  condition_value jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view rules" ON workflow_rules
FOR SELECT USING (true);

CREATE POLICY "L&D can manage rules" ON workflow_rules
FOR ALL USING (has_role(auth.uid(), 'l_and_d'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 4. Notifications Table (in-app notifications)
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title varchar NOT NULL,
  message text NOT NULL,
  type varchar NOT NULL, -- 'approval_required', 'request_approved', 'request_rejected', 'session_scheduled', 'enrollment_confirmed', 'session_cancelled', 'reminder'
  reference_type varchar, -- 'training_request', 'session', 'approval'
  reference_id uuid,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON notifications
FOR INSERT WITH CHECK (true);

-- 5. Session Enrollments Table (participants in sessions)
CREATE TABLE public.session_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  participant_id uuid NOT NULL,
  request_id uuid REFERENCES training_requests(id) ON DELETE SET NULL,
  status varchar DEFAULT 'confirmed', -- 'confirmed', 'waitlisted', 'cancelled', 'completed', 'no_show'
  waitlist_position integer,
  enrolled_by uuid,
  enrolled_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  attendance_status varchar, -- 'attended', 'partial', 'absent'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(session_id, participant_id)
);

ALTER TABLE public.session_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View enrollments" ON session_enrollments
FOR SELECT USING (
  participant_id = auth.uid() OR
  has_role(auth.uid(), 'l_and_d'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = session_enrollments.participant_id AND p.manager_id = auth.uid()
  )
);

CREATE POLICY "L&D can manage enrollments" ON session_enrollments
FOR ALL USING (has_role(auth.uid(), 'l_and_d'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 6. Add INSERT policy for approvals table
CREATE POLICY "System can create approvals" ON approvals
FOR INSERT WITH CHECK (true);

-- 7. Add workflow_template_id to training_requests
ALTER TABLE public.training_requests 
ADD COLUMN IF NOT EXISTS workflow_template_id uuid REFERENCES workflow_templates(id);

-- 8. Add session rescheduling history
CREATE TABLE public.session_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  change_type varchar NOT NULL, -- 'created', 'rescheduled', 'cancelled', 'capacity_changed'
  old_values jsonb,
  new_values jsonb,
  reason text,
  changed_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.session_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View session changes" ON session_changes
FOR SELECT USING (
  has_role(auth.uid(), 'l_and_d'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "L&D can log changes" ON session_changes
FOR INSERT WITH CHECK (has_role(auth.uid(), 'l_and_d'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_approvals_approver_pending ON approvals(approver_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_session_enrollments_session ON session_enrollments(session_id, status);
CREATE INDEX IF NOT EXISTS idx_training_requests_status ON training_requests(status, current_approver_id);

-- 10. Update trigger for session_enrollments
CREATE TRIGGER update_session_enrollments_updated_at
BEFORE UPDATE ON session_enrollments
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 11. Insert default workflow templates
INSERT INTO workflow_templates (name_en, name_ar, description, is_default) VALUES
('Standard Local Training', 'التدريب المحلي القياسي', 'Manager approval only for low-cost local training', true),
('High Cost Training', 'التدريب عالي التكلفة', 'Manager → HRBP → L&D → Finance for expensive training', false),
('Abroad Training', 'التدريب في الخارج', 'Full approval chain for international training', false),
('Mandatory Training', 'التدريب الإلزامي', 'Auto-approved mandatory/HSE training', false);

-- 12. Insert workflow steps for each template
WITH templates AS (
  SELECT id, name_en FROM workflow_templates
)
INSERT INTO workflow_steps (template_id, step_order, approver_role, is_auto_approve, can_delegate)
SELECT t.id, s.step_order, s.approver_role::app_role, s.is_auto_approve, s.can_delegate
FROM templates t
CROSS JOIN (
  VALUES 
    ('Standard Local Training', 1, 'manager', false, true),
    ('High Cost Training', 1, 'manager', false, true),
    ('High Cost Training', 2, 'hrbp', false, true),
    ('High Cost Training', 3, 'l_and_d', false, false),
    ('Abroad Training', 1, 'manager', false, true),
    ('Abroad Training', 2, 'hrbp', false, true),
    ('Abroad Training', 3, 'l_and_d', false, false),
    ('Mandatory Training', 1, 'manager', true, false)
) AS s(template_name, step_order, approver_role, is_auto_approve, can_delegate)
WHERE t.name_en = s.template_name;

-- 13. Insert workflow rules
WITH templates AS (
  SELECT id, name_en FROM workflow_templates
)
INSERT INTO workflow_rules (template_id, priority, condition_type, condition_operator, condition_value)
SELECT t.id, r.priority, r.condition_type, r.condition_operator, r.condition_value::jsonb
FROM templates t
CROSS JOIN (
  VALUES
    ('Mandatory Training', 100, 'mandatory', 'eq', '"true"'),
    ('Abroad Training', 90, 'location', 'eq', '"abroad"'),
    ('High Cost Training', 80, 'cost_threshold', 'gt', '5000'),
    ('Standard Local Training', 0, 'location', 'eq', '"local"')
) AS r(template_name, priority, condition_type, condition_operator, condition_value)
WHERE t.name_en = r.template_name;