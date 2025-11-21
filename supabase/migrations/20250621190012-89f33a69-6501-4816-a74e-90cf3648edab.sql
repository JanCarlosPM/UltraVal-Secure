
-- Primero, eliminar todas las incidencias existentes para poder actualizar las clasificaciones
DELETE FROM public.incidencias;

-- Ahora sí podemos actualizar las clasificaciones
DELETE FROM public.clasificaciones;

INSERT INTO public.clasificaciones (nombre, descripcion, color) VALUES
  ('Uso de Celular', 'Uso indebido de dispositivos móviles en área de juego', '#EF4444'),
  ('Pantallas TV Apagadas', 'Pantallas de televisión apagadas (violación de normativa)', '#F97316'),
  ('Apertura Tardía', 'Apertura de mesa o área fuera del horario establecido', '#DC2626'),
  ('Cierre Adelantado', 'Cierre prematuro de mesa o área de juego', '#8B5CF6'),
  ('Sustracción de Dinero', 'Posible sustracción o manejo irregular de dinero', '#DC2626'),
  ('Comportamiento Sospechoso', 'Actividad inusual o sospechosa de jugadores o personal', '#F59E0B'),
  ('Incumplimiento de Protocolo', 'No seguimiento de procedimientos establecidos', '#06B6D4'),
  ('Problema Técnico', 'Fallas en equipos o sistemas de la sala', '#10B981'),
  ('Seguridad', 'Incidentes relacionados con seguridad general', '#6366F1'),
  ('Otro', 'Otras incidencias no clasificadas', '#6B7280');

-- Eliminar el campo estado de las incidencias ya que no es necesario
ALTER TABLE public.incidencias DROP COLUMN IF EXISTS estado;
ALTER TABLE public.incidencias DROP COLUMN IF EXISTS fecha_resolucion;

-- Actualizar políticas para los nuevos roles
-- Los monitores solo pueden crear incidencias, no verlas
DROP POLICY IF EXISTS "Todos pueden ver incidencias" ON public.incidencias;
DROP POLICY IF EXISTS "Solo administradores pueden ver incidencias" ON public.incidencias;
DROP POLICY IF EXISTS "Monitores pueden crear incidencias" ON public.incidencias;

CREATE POLICY "Solo administradores pueden ver incidencias"
  ON public.incidencias FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Monitores pueden crear incidencias"
  ON public.incidencias FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'monitor') OR public.has_role(auth.uid(), 'admin'));
