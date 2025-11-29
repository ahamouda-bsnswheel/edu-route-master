-- First add new role values to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'finance';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'chro';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'committee';