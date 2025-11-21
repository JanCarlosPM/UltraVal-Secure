-- Corregir la función obtener_consolidado_con_medios para calcular estadísticas dinámicamente
CREATE OR REPLACE FUNCTION public.obtener_consolidado_con_medios(fecha_consolidado date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  resultado JSON;
  stats_calculadas RECORD;
BEGIN
  -- Log para debugging
  RAISE NOTICE 'Obteniendo consolidado para fecha: %', fecha_consolidado;

  -- Primero calcular las estadísticas reales desde las incidencias aprobadas
  SELECT 
    COUNT(*) as total_incidencias,
    COUNT(*) FILTER (WHERE prioridad = 'critica') as incidencias_criticas,
    COUNT(*) FILTER (WHERE prioridad = 'alta') as incidencias_altas,
    COUNT(*) FILTER (WHERE prioridad = 'media') as incidencias_medias,
    COUNT(*) FILTER (WHERE prioridad = 'baja') as incidencias_bajas,
    COUNT(DISTINCT area_id) as areas_afectadas,
    COUNT(DISTINCT sala_id) FILTER (WHERE sala_id IS NOT NULL) as salas_afectadas
  INTO stats_calculadas
  FROM public.incidencias 
  WHERE DATE(fecha_incidencia) = fecha_consolidado
    AND estado = 'aprobado';

  RAISE NOTICE 'Estadísticas calculadas: Total=%, Críticas=%, Altas=%, Medias=%, Bajas=%, Áreas=%, Salas=%', 
    stats_calculadas.total_incidencias, stats_calculadas.incidencias_criticas, 
    stats_calculadas.incidencias_altas, stats_calculadas.incidencias_medias, 
    stats_calculadas.incidencias_bajas, stats_calculadas.areas_afectadas, 
    stats_calculadas.salas_afectadas;

  SELECT row_to_json(consolidado_completo)
  INTO resultado
  FROM (
    SELECT 
      COALESCE(rc.id, gen_random_uuid()) as id,
      fecha_consolidado as fecha_reporte,
      -- Usar estadísticas calculadas dinámicamente en lugar de las almacenadas
      stats_calculadas.total_incidencias,
      stats_calculadas.incidencias_criticas,
      stats_calculadas.incidencias_altas,
      stats_calculadas.incidencias_medias,
      stats_calculadas.incidencias_bajas,
      stats_calculadas.areas_afectadas,
      stats_calculadas.salas_afectadas,
      rc.archivo_pdf_url,
      COALESCE(rc.created_at, now()) as created_at,
      COALESCE(rc.updated_at, now()) as updated_at,
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
            'total_archivos', COALESCE(img_count.total, 0),
            'imagenes', COALESCE(img_agg.imagenes, '[]'::json)
          )
        ) FILTER (WHERE i.id IS NOT NULL),
        '[]'::json
      ) as incidencias_detalle,
      json_build_object(
        'resumen_multimedia', json_build_object(
          'total_imagenes', COALESCE(multimedia_stats.total_imagenes, 0),
          'total_videos', COALESCE(multimedia_stats.total_videos, 0),
          'incidencias_con_evidencia', COALESCE(multimedia_stats.incidencias_con_evidencia, 0)
        )
      ) as estadisticas_multimedia
    FROM (SELECT stats_calculadas) calc
    LEFT JOIN public.reportes_consolidados rc ON rc.fecha_reporte = fecha_consolidado
    LEFT JOIN public.incidencias i ON DATE(i.fecha_incidencia) = fecha_consolidado 
      AND i.estado = 'aprobado'  -- SOLO INCIDENCIAS APROBADAS
    LEFT JOIN public.areas a ON i.area_id = a.id
    LEFT JOIN public.salas s ON i.sala_id = s.id
    LEFT JOIN (
      SELECT 
        incidencia_id,
        COUNT(*) as total
      FROM public.imagenes_incidencias
      GROUP BY incidencia_id
    ) img_count ON i.id = img_count.incidencia_id
    LEFT JOIN (
      SELECT 
        incidencia_id,
        json_agg(
          json_build_object(
            'id', id,
            'url', url_imagen,
            'nombre', nombre_archivo,
            'tipo', tipo_archivo,
            'es_video', (tipo_archivo LIKE 'video/%')
          )
        ) as imagenes
      FROM public.imagenes_incidencias
      GROUP BY incidencia_id
    ) img_agg ON i.id = img_agg.incidencia_id
    LEFT JOIN (
      SELECT 
        DATE(i.fecha_incidencia) as fecha,
        COUNT(CASE WHEN ii.tipo_archivo NOT LIKE 'video/%' THEN 1 END) as total_imagenes,
        COUNT(CASE WHEN ii.tipo_archivo LIKE 'video/%' THEN 1 END) as total_videos,
        COUNT(DISTINCT i.id) as incidencias_con_evidencia
      FROM public.incidencias i
      INNER JOIN public.imagenes_incidencias ii ON i.id = ii.incidencia_id
      WHERE DATE(i.fecha_incidencia) = fecha_consolidado
        AND i.estado = 'aprobado'  -- SOLO INCIDENCIAS APROBADAS
      GROUP BY DATE(i.fecha_incidencia)
    ) multimedia_stats ON multimedia_stats.fecha = fecha_consolidado
    GROUP BY rc.id, rc.archivo_pdf_url, rc.created_at, rc.updated_at, 
             multimedia_stats.total_imagenes, multimedia_stats.total_videos, 
             multimedia_stats.incidencias_con_evidencia,
             stats_calculadas.total_incidencias, stats_calculadas.incidencias_criticas,
             stats_calculadas.incidencias_altas, stats_calculadas.incidencias_medias,
             stats_calculadas.incidencias_bajas, stats_calculadas.areas_afectadas,
             stats_calculadas.salas_afectadas
  ) consolidado_completo;

  -- Log del resultado para debugging
  RAISE NOTICE 'Resultado obtenido con estadísticas corregidas: %', COALESCE(resultado::text, 'NULL');

  RETURN COALESCE(resultado, '{}'::json);
END;
$function$;