-- Corregir la función generar_reporte_consolidado para mejorar el conteo y manejo de fechas
CREATE OR REPLACE FUNCTION public.generar_reporte_consolidado(fecha_objetivo date DEFAULT CURRENT_DATE)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  reporte_id UUID;
  total_inc INTEGER;
  criticas_inc INTEGER;
  altas_inc INTEGER;
  medias_inc INTEGER;
  bajas_inc INTEGER;
  areas_count INTEGER;
  salas_count INTEGER;
BEGIN
  -- Registrar el inicio del proceso para debugging
  RAISE NOTICE 'Generando consolidado para fecha: %', fecha_objetivo;
  
  -- Calcular estadísticas del día - SOLO INCIDENCIAS APROBADAS
  -- Usar DATE() para asegurar comparación correcta de fechas
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE prioridad = 'critica'),
    COUNT(*) FILTER (WHERE prioridad = 'alta'),
    COUNT(*) FILTER (WHERE prioridad = 'media'),
    COUNT(*) FILTER (WHERE prioridad = 'baja')
  INTO total_inc, criticas_inc, altas_inc, medias_inc, bajas_inc
  FROM public.incidencias 
  WHERE DATE(fecha_incidencia) = fecha_objetivo
    AND estado = 'aprobado';  -- SOLO INCIDENCIAS APROBADAS

  -- Log para debugging
  RAISE NOTICE 'Incidencias encontradas: Total=%, Críticas=%, Altas=%, Medias=%, Bajas=%', 
    total_inc, criticas_inc, altas_inc, medias_inc, bajas_inc;

  -- Contar áreas afectadas - SOLO INCIDENCIAS APROBADAS
  SELECT COUNT(DISTINCT area_id)
  INTO areas_count
  FROM public.incidencias 
  WHERE DATE(fecha_incidencia) = fecha_objetivo
    AND estado = 'aprobado';  -- SOLO INCIDENCIAS APROBADAS

  -- Contar salas afectadas - SOLO INCIDENCIAS APROBADAS
  SELECT COUNT(DISTINCT sala_id)
  INTO salas_count
  FROM public.incidencias 
  WHERE DATE(fecha_incidencia) = fecha_objetivo 
    AND sala_id IS NOT NULL
    AND estado = 'aprobado';  -- SOLO INCIDENCIAS APROBADAS

  -- Log para debugging de conteos
  RAISE NOTICE 'Áreas afectadas: %, Salas afectadas: %', areas_count, salas_count;

  -- Insertar o actualizar reporte consolidado
  INSERT INTO public.reportes_consolidados (
    fecha_reporte, total_incidencias, incidencias_criticas, 
    incidencias_altas, incidencias_medias, incidencias_bajas,
    areas_afectadas, salas_afectadas
  ) VALUES (
    fecha_objetivo, total_inc, criticas_inc, 
    altas_inc, medias_inc, bajas_inc,
    areas_count, salas_count
  )
  ON CONFLICT (fecha_reporte) 
  DO UPDATE SET
    total_incidencias = EXCLUDED.total_incidencias,
    incidencias_criticas = EXCLUDED.incidencias_criticas,
    incidencias_altas = EXCLUDED.incidencias_altas,
    incidencias_medias = EXCLUDED.incidencias_medias,
    incidencias_bajas = EXCLUDED.incidencias_bajas,
    areas_afectadas = EXCLUDED.areas_afectadas,
    salas_afectadas = EXCLUDED.salas_afectadas,
    updated_at = now()
  RETURNING id INTO reporte_id;

  -- Log final para confirmar el ID del reporte
  RAISE NOTICE 'Reporte consolidado generado con ID: %', reporte_id;

  RETURN reporte_id;
END;
$function$;

-- Mejorar la función obtener_consolidado_con_medios para manejar mejor las fechas
CREATE OR REPLACE FUNCTION public.obtener_consolidado_con_medios(fecha_consolidado date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  resultado JSON;
BEGIN
  -- Log para debugging
  RAISE NOTICE 'Obteniendo consolidado para fecha: %', fecha_consolidado;

  SELECT row_to_json(consolidado_completo)
  INTO resultado
  FROM (
    SELECT 
      rc.id,
      rc.fecha_reporte,
      rc.total_incidencias,
      rc.incidencias_criticas,
      rc.incidencias_altas,
      rc.incidencias_medias,
      rc.incidencias_bajas,
      rc.areas_afectadas,
      rc.salas_afectadas,
      rc.archivo_pdf_url,
      rc.created_at,
      rc.updated_at,
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
    FROM public.reportes_consolidados rc
    LEFT JOIN public.incidencias i ON DATE(i.fecha_incidencia) = rc.fecha_reporte 
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
    ) multimedia_stats ON multimedia_stats.fecha = rc.fecha_reporte
    WHERE rc.fecha_reporte = fecha_consolidado
    GROUP BY rc.id, rc.fecha_reporte, rc.total_incidencias, rc.incidencias_criticas,
             rc.incidencias_altas, rc.incidencias_medias, rc.incidencias_bajas,
             rc.areas_afectadas, rc.salas_afectadas, rc.archivo_pdf_url,
             rc.created_at, rc.updated_at, multimedia_stats.total_imagenes,
             multimedia_stats.total_videos, multimedia_stats.incidencias_con_evidencia
  ) consolidado_completo;

  -- Log del resultado para debugging
  RAISE NOTICE 'Resultado obtenido: %', COALESCE(resultado::text, 'NULL');

  RETURN COALESCE(resultado, '{}'::json);
END;
$function$;