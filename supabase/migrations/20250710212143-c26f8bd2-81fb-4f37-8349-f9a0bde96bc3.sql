
-- Agregar campo para tiempo en minutos para incidencias específicas
ALTER TABLE public.incidencias 
ADD COLUMN tiempo_minutos INTEGER NULL;

-- Agregar comentario para documentar el uso del campo
COMMENT ON COLUMN public.incidencias.tiempo_minutos IS 'Tiempo en minutos para incidencias de tipo "ingresos tardios" o "cierre prematuros"';
