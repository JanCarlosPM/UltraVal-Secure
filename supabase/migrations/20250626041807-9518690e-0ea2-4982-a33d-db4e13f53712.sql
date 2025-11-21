
-- Habilitar las extensiones necesarias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Programar la ejecución automática del consolidado diario a las 21:00 horas
SELECT cron.schedule(
  'consolidado-diario-automatico',
  '0 21 * * *', -- Todos los días a las 21:00 horas
  $$
  SELECT
    net.http_post(
        url:='https://wbuddpspfxufhftkcaww.supabase.co/functions/v1/daily-consolidation',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidWRkcHNwZnh1ZmhmdGtjYXd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0Mzk3NzIsImV4cCI6MjA2NjAxNTc3Mn0.TZwhCDxB-mtv9OTyVZRyzYFMNFsRUd_hNGdODMWSt10"}'::jsonb,
        body:=concat('{"fecha": "', CURRENT_DATE, '", "automatico": true}')::jsonb
    ) as request_id;
  $$
);

-- Crear una vista para consolidados con información detallada
CREATE OR REPLACE VIEW public.vista_consolidados_detallados AS
SELECT 
  rc.*,
  COALESCE(
    json_agg(
      json_build_object(
        'id', i.id,
        'titulo', i.titulo,
        'descripcion', i.descripcion,
        'prioridad', i.prioridad,
        'area', a.nombre,
        'sala', s.nombre,
        'reportado_por', i.reportado_por,
        'fecha_incidencia', i.fecha_incidencia,
        'imagenes', COALESCE(img_agg.imagenes, '[]'::json),
        'total_archivos', COALESCE(img_agg.total_archivos, 0)
      ) ORDER BY i.fecha_incidencia DESC
    ) FILTER (WHERE i.id IS NOT NULL), 
    '[]'::json
  ) as incidencias_detalle
FROM public.reportes_consolidados rc
LEFT JOIN public.incidencias i ON DATE(i.fecha_incidencia) = rc.fecha_reporte
LEFT JOIN public.areas a ON i.area_id = a.id
LEFT JOIN public.salas s ON i.sala_id = s.id
LEFT JOIN (
  SELECT 
    ii.incidencia_id,
    json_agg(
      json_build_object(
        'id', ii.id,
        'url', ii.url_imagen,
        'nombre', ii.nombre_archivo,
        'tipo', ii.tipo_archivo,
        'es_video', CASE WHEN ii.tipo_archivo LIKE 'video/%' THEN true ELSE false END
      )
    ) as imagenes,
    COUNT(*) as total_archivos
  FROM public.imagenes_incidencias ii
  GROUP BY ii.incidencia_id
) img_agg ON img_agg.incidencia_id = i.id
GROUP BY rc.id, rc.fecha_reporte, rc.total_incidencias, rc.incidencias_criticas, 
         rc.incidencias_altas, rc.incidencias_medias, rc.incidencias_bajas, 
         rc.areas_afectadas, rc.salas_afectadas, rc.archivo_pdf_url, 
         rc.created_at, rc.updated_at;

-- Función mejorada para obtener consolidados con medios multimedia
CREATE OR REPLACE FUNCTION public.obtener_consolidado_con_medios(fecha_consolidado DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resultado JSON;
BEGIN
  SELECT row_to_json(consolidado_completo)
  INTO resultado
  FROM (
    SELECT 
      vcd.*,
      json_build_object(
        'resumen_multimedia', json_build_object(
          'total_imagenes', COALESCE(multimedia_stats.total_imagenes, 0),
          'total_videos', COALESCE(multimedia_stats.total_videos, 0),
          'incidencias_con_evidencia', COALESCE(multimedia_stats.incidencias_con_evidencia, 0)
        )
      ) as estadisticas_multimedia
    FROM public.vista_consolidados_detallados vcd
    LEFT JOIN (
      SELECT 
        DATE(i.fecha_incidencia) as fecha,
        COUNT(CASE WHEN ii.tipo_archivo NOT LIKE 'video/%' THEN 1 END) as total_imagenes,
        COUNT(CASE WHEN ii.tipo_archivo LIKE 'video/%' THEN 1 END) as total_videos,
        COUNT(DISTINCT i.id) as incidencias_con_evidencia
      FROM public.incidencias i
      INNER JOIN public.imagenes_incidencias ii ON i.id = ii.incidencia_id
      WHERE DATE(i.fecha_incidencia) = fecha_consolidado
      GROUP BY DATE(i.fecha_incidencia)
    ) multimedia_stats ON multimedia_stats.fecha = vcd.fecha_reporte
    WHERE vcd.fecha_reporte = fecha_consolidado
  ) consolidado_completo;

  RETURN COALESCE(resultado, '{}'::json);
END;
$$;
