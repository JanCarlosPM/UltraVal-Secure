-- Agregar políticas RLS para reportes consolidados basadas en acceso por área

-- Política para que usuarios con acceso específico por área puedan ver reportes consolidados de sus áreas
CREATE POLICY "Usuarios pueden ver reportes consolidados de sus áreas"
ON public.reportes_consolidados
FOR SELECT
USING (
  -- Admins y supervisores de monitoreo pueden ver todo
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR
  -- Otros roles pueden ver solo si tienen al menos una incidencia aprobada en sus áreas en esa fecha
  EXISTS (
    SELECT 1 
    FROM public.incidencias i
    WHERE DATE(i.fecha_incidencia) = reportes_consolidados.fecha_reporte
    AND i.estado = 'aprobado'
    AND (
      has_role(auth.uid(), 'monitor'::app_role) OR
      (
        (has_role(auth.uid(), 'finanzas'::app_role) OR 
         has_role(auth.uid(), 'rrhh'::app_role) OR 
         has_role(auth.uid(), 'supervisor_salas'::app_role))
        AND user_has_area_access(auth.uid(), i.area_id)
      )
    )
  )
);

-- Política para que solo admins puedan insertar/actualizar reportes consolidados
CREATE POLICY "Solo administradores pueden gestionar reportes consolidados"
ON public.reportes_consolidados
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Habilitar RLS en la tabla reportes_consolidados
ALTER TABLE public.reportes_consolidados ENABLE ROW LEVEL SECURITY;