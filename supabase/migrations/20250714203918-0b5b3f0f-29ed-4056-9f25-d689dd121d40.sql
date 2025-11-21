-- Agregar nuevo rol de supervisor de monitoreo
ALTER TYPE public.app_role ADD VALUE 'supervisor_monitoreo';

-- Agregar estado de borrador/aprobación a incidencias
ALTER TABLE public.incidencias 
ADD COLUMN estado character varying NOT NULL DEFAULT 'borrador',
ADD COLUMN aprobado_por uuid REFERENCES auth.users(id),
ADD COLUMN fecha_aprobacion timestamp with time zone;

-- Crear índice para mejorar rendimiento
CREATE INDEX idx_incidencias_estado ON public.incidencias(estado);

-- Actualizar políticas RLS para el nuevo flujo de trabajo
DROP POLICY IF EXISTS "Monitores y admins pueden crear incidencias" ON public.incidencias;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar incidencias" ON public.incidencias;
DROP POLICY IF EXISTS "Usuarios pueden ver incidencias" ON public.incidencias;

-- Nuevas políticas para el flujo de borradores
CREATE POLICY "Monitores pueden crear incidencias en borrador"
  ON public.incidencias FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'monitor'::app_role) AND 
    estado = 'borrador'
  );

CREATE POLICY "Supervisores y admins pueden ver todas las incidencias"
  ON public.incidencias FOR SELECT
  USING (
    has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Monitores pueden ver sus propias incidencias"
  ON public.incidencias FOR SELECT
  USING (
    has_role(auth.uid(), 'monitor'::app_role)
  );

CREATE POLICY "Supervisores pueden aprobar incidencias"
  ON public.incidencias FOR UPDATE
  USING (
    (has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR 
     has_role(auth.uid(), 'admin'::app_role)) AND
    estado = 'borrador'
  )
  WITH CHECK (
    (has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR 
     has_role(auth.uid(), 'admin'::app_role)) AND
    estado IN ('aprobado', 'rechazado')
  );

CREATE POLICY "Admins pueden editar incidencias aprobadas"
  ON public.incidencias FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Función para aprobar incidencia
CREATE OR REPLACE FUNCTION public.aprobar_incidencia(
  incidencia_id uuid,
  nuevo_estado character varying
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar permisos
  IF NOT (has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR 
          has_role(auth.uid(), 'admin'::app_role)) THEN
    RETURN false;
  END IF;

  -- Actualizar incidencia
  UPDATE public.incidencias 
  SET 
    estado = nuevo_estado,
    aprobado_por = auth.uid(),
    fecha_aprobacion = now(),
    updated_at = now()
  WHERE id = incidencia_id AND estado = 'borrador';

  -- Registrar acción de auditoría
  PERFORM public.log_user_action(
    'incidencia_' || nuevo_estado,
    'incidencia',
    incidencia_id,
    jsonb_build_object('estado_anterior', 'borrador', 'estado_nuevo', nuevo_estado)
  );

  RETURN FOUND;
END;
$$;