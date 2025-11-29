-- AI Auto-Tagging Feature Schema

-- Enum for tag types
CREATE TYPE public.tag_type AS ENUM ('topic', 'category', 'competency', 'job_role', 'difficulty', 'language', 'modality');

-- Enum for confidence levels
CREATE TYPE public.confidence_level AS ENUM ('high', 'medium', 'low');

-- Enum for tag suggestion status
CREATE TYPE public.tag_suggestion_status AS ENUM ('pending', 'accepted', 'rejected');

-- Enum for tagging job status
CREATE TYPE public.tagging_job_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

-- AI Tagging Configuration
CREATE TABLE public.ai_tagging_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_type tag_type NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT true,
  use_controlled_vocabulary BOOLEAN DEFAULT false,
  high_confidence_threshold NUMERIC(3,2) DEFAULT 0.80,
  medium_confidence_threshold NUMERIC(3,2) DEFAULT 0.50,
  max_suggestions INTEGER DEFAULT 10,
  vocabulary_source VARCHAR(100), -- e.g., 'competencies', 'job_roles', 'course_categories'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

-- AI Tag Suggestions for courses
CREATE TABLE public.ai_tag_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  tag_type tag_type NOT NULL,
  tag_value VARCHAR(255) NOT NULL,
  confidence_score NUMERIC(4,3) NOT NULL,
  confidence_level confidence_level NOT NULL,
  status tag_suggestion_status DEFAULT 'pending',
  explanation TEXT,
  source_snippet TEXT,
  model_version VARCHAR(50),
  config_version INTEGER DEFAULT 1,
  suggested_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  UNIQUE(course_id, tag_type, tag_value)
);

-- Approved course tags (accepted suggestions or manually added)
CREATE TABLE public.course_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  tag_type tag_type NOT NULL,
  tag_value VARCHAR(255) NOT NULL,
  is_ai_generated BOOLEAN DEFAULT false,
  original_confidence NUMERIC(4,3),
  added_by UUID,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, tag_type, tag_value)
);

-- AI Tag Feedback for ML improvement
CREATE TABLE public.ai_tag_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID REFERENCES public.ai_tag_suggestions(id) ON DELETE SET NULL,
  course_id UUID NOT NULL,
  tag_type tag_type NOT NULL,
  tag_value VARCHAR(255) NOT NULL,
  confidence_score NUMERIC(4,3),
  action VARCHAR(50) NOT NULL, -- 'accepted', 'rejected', 'edited'
  edited_to VARCHAR(255), -- if action = 'edited'
  user_role VARCHAR(50),
  model_version VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Bulk Tagging Jobs
CREATE TABLE public.ai_tagging_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(255),
  status tagging_job_status DEFAULT 'pending',
  scope_filter JSONB DEFAULT '{}', -- filters like category, date range, etc.
  preserve_existing_tags BOOLEAN DEFAULT true,
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  error_log JSONB DEFAULT '[]',
  model_version VARCHAR(50),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- AI Tagging Audit Log
CREATE TABLE public.ai_tagging_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- 'config', 'suggestion', 'tag', 'job'
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  actor_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_tagging_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tag_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tag_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tagging_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tagging_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_tagging_config
CREATE POLICY "Everyone can view tagging config"
  ON public.ai_tagging_config FOR SELECT
  USING (true);

CREATE POLICY "L&D/Admin can manage tagging config"
  ON public.ai_tagging_config FOR ALL
  USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for ai_tag_suggestions
CREATE POLICY "L&D/HRBP can view suggestions"
  ON public.ai_tag_suggestions FOR SELECT
  USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hrbp'));

CREATE POLICY "L&D can manage suggestions"
  ON public.ai_tag_suggestions FOR ALL
  USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for course_tags
CREATE POLICY "Everyone can view course tags"
  ON public.course_tags FOR SELECT
  USING (true);

CREATE POLICY "L&D can manage course tags"
  ON public.course_tags FOR ALL
  USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for ai_tag_feedback
CREATE POLICY "L&D/Admin can view feedback"
  ON public.ai_tag_feedback FOR SELECT
  USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert feedback"
  ON public.ai_tag_feedback FOR INSERT
  WITH CHECK (true);

-- RLS Policies for ai_tagging_jobs
CREATE POLICY "L&D can manage tagging jobs"
  ON public.ai_tagging_jobs FOR ALL
  USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for ai_tagging_audit_log
CREATE POLICY "L&D/Admin can view audit logs"
  ON public.ai_tagging_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'l_and_d') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs"
  ON public.ai_tagging_audit_log FOR INSERT
  WITH CHECK (true);

-- Insert default tagging configuration
INSERT INTO public.ai_tagging_config (tag_type, is_enabled, use_controlled_vocabulary, high_confidence_threshold, medium_confidence_threshold, max_suggestions, vocabulary_source) VALUES
  ('topic', true, false, 0.80, 0.50, 10, null),
  ('category', true, true, 0.75, 0.45, 3, 'course_categories'),
  ('competency', true, true, 0.70, 0.40, 5, 'competencies'),
  ('job_role', true, true, 0.70, 0.40, 5, 'job_roles'),
  ('difficulty', true, true, 0.80, 0.50, 1, null),
  ('language', true, true, 0.90, 0.70, 3, null),
  ('modality', true, true, 0.85, 0.60, 2, null);

-- Create indexes for performance
CREATE INDEX idx_ai_tag_suggestions_course ON public.ai_tag_suggestions(course_id);
CREATE INDEX idx_ai_tag_suggestions_status ON public.ai_tag_suggestions(status);
CREATE INDEX idx_course_tags_course ON public.course_tags(course_id);
CREATE INDEX idx_course_tags_type ON public.course_tags(tag_type);
CREATE INDEX idx_ai_tag_feedback_course ON public.ai_tag_feedback(course_id);
CREATE INDEX idx_ai_tagging_jobs_status ON public.ai_tagging_jobs(status);