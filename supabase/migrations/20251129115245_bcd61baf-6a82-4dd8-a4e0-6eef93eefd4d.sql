-- Fix search_path for functions
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.generate_request_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE year_part VARCHAR(4); seq_num INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM 5 FOR 6) AS INTEGER)), 0) + 1 INTO seq_num
  FROM public.training_requests WHERE request_number LIKE year_part || '%';
  NEW.request_number := year_part || LPAD(seq_num::TEXT, 6, '0');
  RETURN NEW;
END; $$;

-- Insert NOC and subsidiaries
INSERT INTO public.entities (id, name_en, name_ar, code, parent_id) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'National Oil Corporation', 'المؤسسة الوطنية للنفط', 'NOC', NULL),
  ('a2222222-2222-2222-2222-222222222222', 'Arabian Gulf Oil Company', 'شركة الخليج العربي للنفط', 'AGOCO', 'a1111111-1111-1111-1111-111111111111'),
  ('a3333333-3333-3333-3333-333333333333', 'Waha Oil Company', 'شركة الواحة للنفط', 'WAHA', 'a1111111-1111-1111-1111-111111111111'),
  ('a4444444-4444-4444-4444-444444444444', 'Sirte Oil Company', 'شركة سرت للنفط', 'SOC', 'a1111111-1111-1111-1111-111111111111'),
  ('a5555555-5555-5555-5555-555555555555', 'Mellitah Oil & Gas', 'شركة مليتة للنفط والغاز', 'MOG', 'a1111111-1111-1111-1111-111111111111'),
  ('a6666666-6666-6666-6666-666666666666', 'Brega Petroleum Marketing', 'شركة البريقة لتسويق النفط', 'BREGA', 'a1111111-1111-1111-1111-111111111111');

-- Insert departments
INSERT INTO public.departments (id, entity_id, name_en, name_ar, code) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Human Resources', 'الموارد البشرية', 'HR'),
  ('b2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Information Technology', 'تقنية المعلومات', 'IT'),
  ('b3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', 'Finance', 'المالية', 'FIN'),
  ('b4444444-4444-4444-4444-444444444444', 'a1111111-1111-1111-1111-111111111111', 'Operations', 'العمليات', 'OPS'),
  ('b5555555-5555-5555-5555-555555555555', 'a1111111-1111-1111-1111-111111111111', 'Engineering', 'الهندسة', 'ENG'),
  ('b6666666-6666-6666-6666-666666666666', 'a2222222-2222-2222-2222-222222222222', 'Exploration', 'الاستكشاف', 'EXP'),
  ('b7777777-7777-7777-7777-777777777777', 'a2222222-2222-2222-2222-222222222222', 'Production', 'الإنتاج', 'PROD'),
  ('b8888888-8888-8888-8888-888888888888', 'a3333333-3333-3333-3333-333333333333', 'Drilling', 'الحفر', 'DRILL'),
  ('b9999999-9999-9999-9999-999999999999', 'a4444444-4444-4444-4444-444444444444', 'Maintenance', 'الصيانة', 'MAINT');

-- Insert course categories
INSERT INTO public.course_categories (id, name_en, name_ar, description_en) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'Technical Skills', 'المهارات الفنية', 'Oil & gas technical training'),
  ('c2222222-2222-2222-2222-222222222222', 'Leadership & Management', 'القيادة والإدارة', 'Management and leadership development'),
  ('c3333333-3333-3333-3333-333333333333', 'Health, Safety & Environment', 'الصحة والسلامة والبيئة', 'HSE compliance and safety training'),
  ('c4444444-4444-4444-4444-444444444444', 'IT & Digital Skills', 'المهارات الرقمية', 'Information technology and digital transformation'),
  ('c5555555-5555-5555-5555-555555555555', 'Language Skills', 'المهارات اللغوية', 'English and other language courses'),
  ('c6666666-6666-6666-6666-666666666666', 'Finance & Accounting', 'المالية والمحاسبة', 'Financial management and accounting');

-- Insert training providers
INSERT INTO public.training_providers (id, name_en, name_ar, country, city, contact_email) VALUES
  ('d1111111-1111-1111-1111-111111111111', 'NOC Training Center', 'مركز تدريب المؤسسة', 'Libya', 'Tripoli', 'training@noc.ly'),
  ('d2222222-2222-2222-2222-222222222222', 'Libyan Petroleum Institute', 'المعهد الليبي للنفط', 'Libya', 'Tripoli', 'info@lpi.ly'),
  ('d3333333-3333-3333-3333-333333333333', 'Schlumberger Training', 'تدريب شلمبرجير', 'UAE', 'Dubai', 'training@slb.com'),
  ('d4444444-4444-4444-4444-444444444444', 'OPITO Approved Center', 'مركز معتمد من أوبيتو', 'UK', 'Aberdeen', 'info@opito.com'),
  ('d5555555-5555-5555-5555-555555555555', 'British Council Libya', 'المجلس الثقافي البريطاني', 'Libya', 'Tripoli', 'libya@britishcouncil.org');

-- Insert courses
INSERT INTO public.courses (id, code, name_en, name_ar, category_id, provider_id, delivery_mode, training_location, duration_days, cost_amount, cost_level, is_mandatory) VALUES
  ('e1111111-1111-1111-1111-111111111111', 'HSE-001', 'Basic Offshore Safety Induction', 'التعريف الأساسي بالسلامة البحرية', 'c3333333-3333-3333-3333-333333333333', 'd1111111-1111-1111-1111-111111111111', 'classroom', 'local', 5, 2500.00, 'low', true),
  ('e2222222-2222-2222-2222-222222222222', 'HSE-002', 'H2S Safety Training', 'التدريب على سلامة كبريتيد الهيدروجين', 'c3333333-3333-3333-3333-333333333333', 'd1111111-1111-1111-1111-111111111111', 'classroom', 'local', 3, 1500.00, 'low', true),
  ('e3333333-3333-3333-3333-333333333333', 'TECH-001', 'Well Control Certification', 'شهادة التحكم في الآبار', 'c1111111-1111-1111-1111-111111111111', 'd2222222-2222-2222-2222-222222222222', 'classroom', 'local', 10, 8000.00, 'medium', false),
  ('e4444444-4444-4444-4444-444444444444', 'TECH-002', 'Advanced Drilling Operations', 'عمليات الحفر المتقدمة', 'c1111111-1111-1111-1111-111111111111', 'd3333333-3333-3333-3333-333333333333', 'classroom', 'abroad', 15, 25000.00, 'high', false),
  ('e5555555-5555-5555-5555-555555555555', 'LEAD-001', 'Supervisory Skills', 'مهارات الإشراف', 'c2222222-2222-2222-2222-222222222222', 'd1111111-1111-1111-1111-111111111111', 'blended', 'local', 5, 3500.00, 'low', false),
  ('e6666666-6666-6666-6666-666666666666', 'LEAD-002', 'Executive Leadership Program', 'برنامج القيادة التنفيذية', 'c2222222-2222-2222-2222-222222222222', 'd4444444-4444-4444-4444-444444444444', 'classroom', 'abroad', 20, 45000.00, 'high', false),
  ('e7777777-7777-7777-7777-777777777777', 'IT-001', 'Microsoft Office Advanced', 'مايكروسوفت أوفيس المتقدم', 'c4444444-4444-4444-4444-444444444444', 'd1111111-1111-1111-1111-111111111111', 'online', 'local', 3, 500.00, 'low', false),
  ('e8888888-8888-8888-8888-888888888888', 'IT-002', 'SAP ERP Fundamentals', 'أساسيات نظام ساب', 'c4444444-4444-4444-4444-444444444444', 'd3333333-3333-3333-3333-333333333333', 'classroom', 'abroad', 10, 18000.00, 'high', false),
  ('e9999999-9999-9999-9999-999999999999', 'LANG-001', 'Business English - Intermediate', 'اللغة الإنجليزية للأعمال - متوسط', 'c5555555-5555-5555-5555-555555555555', 'd5555555-5555-5555-5555-555555555555', 'classroom', 'local', 30, 4500.00, 'medium', false),
  ('e0000000-0000-0000-0000-000000000000', 'FIN-001', 'Oil & Gas Accounting', 'المحاسبة النفطية', 'c6666666-6666-6666-6666-666666666666', 'd2222222-2222-2222-2222-222222222222', 'classroom', 'local', 5, 3000.00, 'low', false);

-- Insert sessions
INSERT INTO public.sessions (id, course_id, session_code, start_date, end_date, location_en, location_ar, capacity, instructor_name, status) VALUES
  ('f1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 'HSE001-2025-01', '2025-02-01', '2025-02-05', 'NOC Training Center, Tripoli', 'مركز تدريب المؤسسة، طرابلس', 20, 'Ahmed Al-Sharif', 'scheduled'),
  ('f2222222-2222-2222-2222-222222222222', 'e1111111-1111-1111-1111-111111111111', 'HSE001-2025-02', '2025-03-01', '2025-03-05', 'NOC Training Center, Tripoli', 'مركز تدريب المؤسسة، طرابلس', 20, 'Ahmed Al-Sharif', 'scheduled'),
  ('f3333333-3333-3333-3333-333333333333', 'e3333333-3333-3333-3333-333333333333', 'TECH001-2025-01', '2025-02-15', '2025-02-28', 'LPI Campus, Tripoli', 'حرم المعهد الليبي، طرابلس', 15, 'Mahmoud Benghazi', 'scheduled'),
  ('f4444444-4444-4444-4444-444444444444', 'e5555555-5555-5555-5555-555555555555', 'LEAD001-2025-01', '2025-03-10', '2025-03-14', 'NOC HQ, Tripoli', 'المقر الرئيسي للمؤسسة، طرابلس', 25, 'Fatima Al-Zawiya', 'scheduled'),
  ('f5555555-5555-5555-5555-555555555555', 'e9999999-9999-9999-9999-999999999999', 'LANG001-2025-01', '2025-02-01', '2025-03-15', 'British Council, Tripoli', 'المجلس الثقافي البريطاني، طرابلس', 15, 'Sarah Thompson', 'scheduled');