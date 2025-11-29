-- Create provider_status enum
CREATE TYPE public.provider_status AS ENUM ('draft', 'pending_approval', 'active', 'inactive', 'blocked');

-- Alter training_providers table with additional fields
ALTER TABLE public.training_providers 
ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_local BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS provider_status public.provider_status DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS vendor_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS delivery_modes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS expertise_areas TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS submitted_by UUID,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS migration_source VARCHAR(100),
ADD COLUMN IF NOT EXISTS migration_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS internal_rating NUMERIC(3,2),
ADD COLUMN IF NOT EXISTS created_by UUID;

-- Create provider_contacts table for multiple contacts per provider
CREATE TABLE IF NOT EXISTS public.provider_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.training_providers(id) ON DELETE CASCADE,
  contact_name VARCHAR(255) NOT NULL,
  contact_role VARCHAR(100),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create provider_contracts table
CREATE TABLE IF NOT EXISTS public.provider_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.training_providers(id) ON DELETE CASCADE,
  contract_reference VARCHAR(100) NOT NULL,
  contract_start_date DATE,
  contract_end_date DATE,
  payment_terms VARCHAR(255),
  billing_currency VARCHAR(10) DEFAULT 'LYD',
  contract_value NUMERIC(15,2),
  notes TEXT,
  document_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create provider_banking table (restricted access)
CREATE TABLE IF NOT EXISTS public.provider_banking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.training_providers(id) ON DELETE CASCADE UNIQUE,
  bank_name VARCHAR(255),
  bank_branch VARCHAR(255),
  bank_country VARCHAR(100),
  account_number VARCHAR(100),
  iban VARCHAR(50),
  swift_bic VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

-- Create provider_audit_log table
CREATE TABLE IF NOT EXISTS public.provider_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.training_providers(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  field_changed VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  old_status public.provider_status,
  new_status public.provider_status,
  actor_id UUID,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.provider_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_banking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_audit_log ENABLE ROW LEVEL SECURITY;

-- Update training_providers RLS policies
DROP POLICY IF EXISTS "Everyone can view active providers" ON public.training_providers;
DROP POLICY IF EXISTS "L&D can manage providers" ON public.training_providers;

CREATE POLICY "View providers based on status and role"
ON public.training_providers FOR SELECT
USING (
  (provider_status = 'active' AND is_active = true) OR
  has_role(auth.uid(), 'l_and_d') OR
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'hrbp') OR
  has_role(auth.uid(), 'chro')
);

CREATE POLICY "L&D and Procurement can manage providers"
ON public.training_providers FOR ALL
USING (
  has_role(auth.uid(), 'l_and_d') OR
  has_role(auth.uid(), 'admin')
);

-- RLS for provider_contacts
CREATE POLICY "View contacts for accessible providers"
ON public.provider_contacts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM training_providers tp
    WHERE tp.id = provider_contacts.provider_id
    AND (
      (tp.provider_status = 'active' AND tp.is_active = true) OR
      has_role(auth.uid(), 'l_and_d') OR
      has_role(auth.uid(), 'admin') OR
      has_role(auth.uid(), 'hrbp')
    )
  )
);

CREATE POLICY "L&D can manage provider contacts"
ON public.provider_contacts FOR ALL
USING (
  has_role(auth.uid(), 'l_and_d') OR
  has_role(auth.uid(), 'admin')
);

-- RLS for provider_contracts (restricted)
CREATE POLICY "Finance/L&D can view contracts"
ON public.provider_contracts FOR SELECT
USING (
  has_role(auth.uid(), 'l_and_d') OR
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'chro')
);

CREATE POLICY "L&D can manage contracts"
ON public.provider_contracts FOR ALL
USING (
  has_role(auth.uid(), 'l_and_d') OR
  has_role(auth.uid(), 'admin')
);

-- RLS for provider_banking (highly restricted)
CREATE POLICY "Only admin can view banking"
ON public.provider_banking FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'chro')
);

CREATE POLICY "Only admin can manage banking"
ON public.provider_banking FOR ALL
USING (
  has_role(auth.uid(), 'admin')
);

-- RLS for provider_audit_log
CREATE POLICY "L&D can view provider audit logs"
ON public.provider_audit_log FOR SELECT
USING (
  has_role(auth.uid(), 'l_and_d') OR
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'hrbp')
);

CREATE POLICY "System can insert provider audit logs"
ON public.provider_audit_log FOR INSERT
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_providers_status ON public.training_providers(provider_status);
CREATE INDEX IF NOT EXISTS idx_providers_country ON public.training_providers(country);
CREATE INDEX IF NOT EXISTS idx_providers_is_local ON public.training_providers(is_local);
CREATE INDEX IF NOT EXISTS idx_providers_vendor_code ON public.training_providers(vendor_code);
CREATE INDEX IF NOT EXISTS idx_provider_contacts_provider ON public.provider_contacts(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_contracts_provider ON public.provider_contracts(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_audit_provider ON public.provider_audit_log(provider_id);

-- Update existing providers to have active status
UPDATE public.training_providers 
SET provider_status = 'active', 
    is_local = (country = 'Libya' OR country IS NULL)
WHERE provider_status IS NULL;