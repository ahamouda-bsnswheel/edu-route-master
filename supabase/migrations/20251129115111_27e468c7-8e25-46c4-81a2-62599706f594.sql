-- Enums for the training system
CREATE TYPE public.app_role AS ENUM ('employee', 'manager', 'hrbp', 'l_and_d', 'chro', 'admin');
CREATE TYPE public.request_status AS ENUM ('draft', 'pending', 'approved', 'rejected', 'cancelled', 'completed');
CREATE TYPE public.delivery_mode AS ENUM ('classroom', 'online', 'blended', 'on_the_job');
CREATE TYPE public.cost_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.training_location AS ENUM ('local', 'abroad');
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected', 'escalated');

-- Entities (NOC subsidiaries)
CREATE TABLE public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  code VARCHAR(20) UNIQUE,
  parent_id UUID REFERENCES public.entities(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Departments
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.entities(id),
  name_en VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  code VARCHAR(20),
  parent_id UUID REFERENCES public.departments(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id VARCHAR(50) UNIQUE,
  first_name_en VARCHAR(100),
  last_name_en VARCHAR(100),
  first_name_ar VARCHAR(100),
  last_name_ar VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  job_title_en VARCHAR(200),
  job_title_ar VARCHAR(200),
  department_id UUID REFERENCES public.departments(id),
  entity_id UUID REFERENCES public.entities(id),
  manager_id UUID REFERENCES public.profiles(id),
  grade VARCHAR(20),
  hire_date DATE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Course categories
CREATE TABLE public.course_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  description_en TEXT,
  description_ar TEXT,
  parent_id UUID REFERENCES public.course_categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training providers
CREATE TABLE public.training_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en VARCHAR(300) NOT NULL,
  name_ar VARCHAR(300),
  country VARCHAR(100),
  city VARCHAR(100),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  website TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courses catalog
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE,
  name_en VARCHAR(300) NOT NULL,
  name_ar VARCHAR(300),
  description_en TEXT,
  description_ar TEXT,
  category_id UUID REFERENCES public.course_categories(id),
  provider_id UUID REFERENCES public.training_providers(id),
  delivery_mode delivery_mode NOT NULL DEFAULT 'classroom',
  training_location training_location DEFAULT 'local',
  duration_days INTEGER,
  duration_hours INTEGER,
  cost_amount DECIMAL(12, 2),
  cost_currency VARCHAR(3) DEFAULT 'LYD',
  cost_level cost_level,
  prerequisites TEXT[],
  target_grades VARCHAR(20)[],
  min_participants INTEGER DEFAULT 1,
  max_participants INTEGER,
  is_mandatory BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training sessions
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) NOT NULL,
  session_code VARCHAR(50),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  location_en VARCHAR(300),
  location_ar VARCHAR(300),
  venue_details TEXT,
  instructor_name VARCHAR(200),
  capacity INTEGER,
  enrolled_count INTEGER DEFAULT 0,
  waitlist_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'scheduled',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training requests
CREATE TABLE public.training_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number VARCHAR(50) UNIQUE,
  requester_id UUID REFERENCES auth.users(id) NOT NULL,
  course_id UUID REFERENCES public.courses(id) NOT NULL,
  session_id UUID REFERENCES public.sessions(id),
  request_type VARCHAR(20) DEFAULT 'self',
  status request_status DEFAULT 'draft',
  priority VARCHAR(20) DEFAULT 'normal',
  justification TEXT,
  abroad_reason TEXT,
  preferred_start_date DATE,
  preferred_end_date DATE,
  estimated_cost DECIMAL(12, 2),
  current_approver_id UUID REFERENCES auth.users(id),
  current_approval_level INTEGER DEFAULT 1,
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Request participants
CREATE TABLE public.request_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.training_requests(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES auth.users(id) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(request_id, participant_id)
);

-- Approvals
CREATE TABLE public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.training_requests(id) ON DELETE CASCADE NOT NULL,
  approver_id UUID REFERENCES auth.users(id) NOT NULL,
  approver_role app_role NOT NULL,
  approval_level INTEGER NOT NULL,
  status approval_status DEFAULT 'pending',
  decision_date TIMESTAMPTZ,
  comments TEXT,
  delegated_from UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Handle new user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name_en, last_name_en)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'first_name', NEW.raw_user_meta_data ->> 'last_name');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'employee');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_entities_updated_at BEFORE UPDATE ON public.entities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON public.training_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON public.training_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_approvals_updated_at BEFORE UPDATE ON public.approvals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Generate request number
CREATE OR REPLACE FUNCTION public.generate_request_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE year_part VARCHAR(4); seq_num INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM 5 FOR 6) AS INTEGER)), 0) + 1 INTO seq_num
  FROM public.training_requests WHERE request_number LIKE year_part || '%';
  NEW.request_number := year_part || LPAD(seq_num::TEXT, 6, '0');
  RETURN NEW;
END; $$;

CREATE TRIGGER generate_request_number_trigger BEFORE INSERT ON public.training_requests
  FOR EACH ROW WHEN (NEW.request_number IS NULL) EXECUTE FUNCTION public.generate_request_number();

-- RLS Policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view entities" ON public.entities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage entities" ON public.entities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view categories" ON public.course_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "L&D can manage categories" ON public.course_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'l_and_d') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view providers" ON public.training_providers FOR SELECT TO authenticated USING (true);
CREATE POLICY "L&D can manage providers" ON public.training_providers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'l_and_d') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view active courses" ON public.courses FOR SELECT TO authenticated USING (is_active = true OR public.has_role(auth.uid(), 'l_and_d') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "L&D can manage courses" ON public.courses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'l_and_d') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view sessions" ON public.sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "L&D can manage sessions" ON public.sessions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'l_and_d') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own requests" ON public.training_requests FOR SELECT TO authenticated 
  USING (requester_id = auth.uid() OR current_approver_id = auth.uid() OR public.has_role(auth.uid(), 'l_and_d') OR public.has_role(auth.uid(), 'hrbp') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create own requests" ON public.training_requests FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());
CREATE POLICY "Users can update own draft requests" ON public.training_requests FOR UPDATE TO authenticated USING (requester_id = auth.uid() AND status = 'draft');
CREATE POLICY "Approvers can update requests" ON public.training_requests FOR UPDATE TO authenticated 
  USING (current_approver_id = auth.uid() OR public.has_role(auth.uid(), 'l_and_d') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "View participants" ON public.request_participants FOR SELECT TO authenticated 
  USING (participant_id = auth.uid() OR EXISTS (SELECT 1 FROM public.training_requests tr WHERE tr.id = request_id AND (tr.requester_id = auth.uid() OR public.has_role(auth.uid(), 'l_and_d') OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "Manage participants" ON public.request_participants FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.training_requests tr WHERE tr.id = request_id AND tr.requester_id = auth.uid() AND tr.status = 'draft'));

CREATE POLICY "View approvals" ON public.approvals FOR SELECT TO authenticated 
  USING (approver_id = auth.uid() OR EXISTS (SELECT 1 FROM public.training_requests tr WHERE tr.id = request_id AND tr.requester_id = auth.uid()) OR public.has_role(auth.uid(), 'l_and_d') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Update own approvals" ON public.approvals FOR UPDATE TO authenticated USING (approver_id = auth.uid() AND status = 'pending');

CREATE POLICY "L&D view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'l_and_d') OR public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_profiles_department ON public.profiles(department_id);
CREATE INDEX idx_profiles_entity ON public.profiles(entity_id);
CREATE INDEX idx_profiles_manager ON public.profiles(manager_id);
CREATE INDEX idx_courses_category ON public.courses(category_id);
CREATE INDEX idx_sessions_course ON public.sessions(course_id);
CREATE INDEX idx_requests_requester ON public.training_requests(requester_id);
CREATE INDEX idx_requests_status ON public.training_requests(status);
CREATE INDEX idx_approvals_request ON public.approvals(request_id);