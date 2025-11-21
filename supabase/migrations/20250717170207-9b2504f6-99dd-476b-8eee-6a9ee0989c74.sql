-- Solo agregar los nuevos roles al enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'rrhh';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor_salas';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finanzas';