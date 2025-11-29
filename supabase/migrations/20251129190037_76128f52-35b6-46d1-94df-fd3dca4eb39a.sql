-- Add catalogue status enum
CREATE TYPE public.catalogue_status AS ENUM ('draft', 'pending_approval', 'active', 'retired');

-- Add cost unit type enum
CREATE TYPE public.cost_unit_type AS ENUM ('per_participant', 'per_session');

-- Add new columns to courses table for full catalogue management
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS catalogue_status catalogue_status DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS objectives text,
ADD COLUMN IF NOT EXISTS target_audience text,
ADD COLUMN IF NOT EXISTS delivery_languages text[] DEFAULT ARRAY['en'],
ADD COLUMN IF NOT EXISTS abroad_country character varying,
ADD COLUMN IF NOT EXISTS abroad_city character varying,
ADD COLUMN IF NOT EXISTS local_site character varying,
ADD COLUMN IF NOT EXISTS cost_unit_type cost_unit_type DEFAULT 'per_participant',
ADD COLUMN IF NOT EXISTS contracted_rate numeric,
ADD COLUMN IF NOT EXISTS typical_frequency character varying,
ADD COLUMN IF NOT EXISTS approved_by uuid,
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS submitted_by uuid,
ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS migration_source character varying,
ADD COLUMN IF NOT EXISTS migration_locked boolean DEFAULT false;

-- Create competencies library table
CREATE TABLE public.competencies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code character varying NOT NULL UNIQUE,
  name_en character varying NOT NULL,
  name_ar character varying,
  description_en text,
  description_ar text,
  category character varying,
  max_level integer DEFAULT 5,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_at timestamp with time zone DEFAULT now()
);

-- Create course-competency mapping table
CREATE TABLE public.course_competencies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  competency_id uuid NOT NULL REFERENCES public.competencies(id) ON DELETE CASCADE,
  level_from integer DEFAULT 1,
  level_to integer DEFAULT 5,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(course_id, competency_id)
);

-- Create job roles/families table
CREATE TABLE public.job_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code character varying NOT NULL UNIQUE,
  name_en character varying NOT NULL,
  name_ar character varying,
  job_family character varying,
  description_en text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create course-job role mapping table
CREATE TABLE public.course_job_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  job_role_id uuid NOT NULL REFERENCES public.job_roles(id) ON DELETE CASCADE,
  is_mandatory boolean DEFAULT false,
  mandatory_for_location character varying,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(course_id, job_role_id)
);

-- Create local sites/locations reference table
CREATE TABLE public.training_sites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code character varying NOT NULL UNIQUE,
  name_en character varying NOT NULL,
  name_ar character varying,
  city character varying,
  site_type character varying,
  address text,
  capacity integer,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Create catalogue audit log table
CREATE TABLE public.catalogue_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  action character varying NOT NULL,
  field_changed character varying,
  old_value text,
  new_value text,
  old_status catalogue_status,
  new_status catalogue_status,
  comment text,
  actor_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Create catalogue approval workflow table
CREATE TABLE public.catalogue_approvals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL,
  status character varying DEFAULT 'pending',
  decision character varying,
  comments text,
  created_at timestamp with time zone DEFAULT now(),
  decision_at timestamp with time zone
);

-- Enable RLS on new tables
ALTER TABLE public.competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competencies
CREATE POLICY "Everyone can view active competencies"
ON public.competencies FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "L&D can manage competencies"
ON public.competencies FOR ALL
USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for course_competencies
CREATE POLICY "Everyone can view course competencies"
ON public.course_competencies FOR SELECT
USING (true);

CREATE POLICY "L&D can manage course competencies"
ON public.course_competencies FOR ALL
USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for job_roles
CREATE POLICY "Everyone can view active job roles"
ON public.job_roles FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "L&D can manage job roles"
ON public.job_roles FOR ALL
USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for course_job_roles
CREATE POLICY "Everyone can view course job roles"
ON public.course_job_roles FOR SELECT
USING (true);

CREATE POLICY "L&D can manage course job roles"
ON public.course_job_roles FOR ALL
USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for training_sites
CREATE POLICY "Everyone can view active sites"
ON public.training_sites FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "L&D can manage sites"
ON public.training_sites FOR ALL
USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for catalogue_audit_log
CREATE POLICY "L&D can view audit logs"
ON public.catalogue_audit_log FOR SELECT
USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hrbp'));

CREATE POLICY "System can insert audit logs"
ON public.catalogue_audit_log FOR INSERT
WITH CHECK (true);

-- RLS Policies for catalogue_approvals
CREATE POLICY "View catalogue approvals"
ON public.catalogue_approvals FOR SELECT
USING (approver_id = auth.uid() OR has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "L&D can manage catalogue approvals"
ON public.catalogue_approvals FOR ALL
USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- Update courses RLS to handle catalogue_status visibility
DROP POLICY IF EXISTS "Everyone can view active courses" ON public.courses;

CREATE POLICY "View courses based on status and role"
ON public.courses FOR SELECT
USING (
  (catalogue_status = 'active' AND is_active = true)
  OR has_role(auth.uid(), 'l_and_d')
  OR has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'hrbp')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_catalogue_status ON public.courses(catalogue_status);
CREATE INDEX IF NOT EXISTS idx_competencies_category ON public.competencies(category);
CREATE INDEX IF NOT EXISTS idx_competencies_code ON public.competencies(code);
CREATE INDEX IF NOT EXISTS idx_course_competencies_course ON public.course_competencies(course_id);
CREATE INDEX IF NOT EXISTS idx_course_job_roles_course ON public.course_job_roles(course_id);
CREATE INDEX IF NOT EXISTS idx_catalogue_audit_course ON public.catalogue_audit_log(course_id);

-- Update existing courses to have 'active' catalogue_status
UPDATE public.courses SET catalogue_status = 'active' WHERE is_active = true;
UPDATE public.courses SET catalogue_status = 'retired' WHERE is_active = false;