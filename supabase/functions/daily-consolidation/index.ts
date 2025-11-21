
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obtener la fecha objetivo y verificar si es automático
    const { fecha, automatico } = await req.json().catch(() => ({ 
      fecha: null, 
      automatico: false 
    }))
    
    const fechaObjetivo = fecha || new Date().toISOString().split('T')[0]
    const esAutomatico = automatico || false

    console.log(`Generando consolidado para la fecha: ${fechaObjetivo} (automático: ${esAutomatico})`)

    // Llamar a la función de base de datos para generar el consolidado
    const { data: reporteId, error: funcionError } = await supabaseClient
      .rpc('generar_reporte_consolidado', { fecha_objetivo: fechaObjetivo })

    if (funcionError) {
      console.error('Error calling consolidation function:', funcionError)
      throw funcionError
    }

    console.log(`Consolidado generado con ID: ${reporteId}`)

    // Obtener los datos del reporte generado usando la nueva función
    const { data: consolidadoCompleto, error: consolidadoError } = await supabaseClient
      .rpc('obtener_consolidado_con_medios', { fecha_consolidado: fechaObjetivo })

    if (consolidadoError) {
      console.error('Error fetching detailed consolidado:', consolidadoError)
      throw consolidadoError
    }

    // Si es ejecución automática a las 21:00, preparar notificaciones
    if (esAutomatico) {
      const ahora = new Date()
      const esHoraAutomatica = ahora.getHours() === 21

      if (esHoraAutomatica && consolidadoCompleto?.total_incidencias > 0) {
        // Obtener administradores para notificar
        const { data: admins } = await supabaseClient
          .from('profiles')
          .select('email, full_name')
          .eq('role', 'admin')

        console.log(`Preparando notificaciones para ${admins?.length || 0} administradores`)
        
        // Log detallado del consolidado generado automáticamente
        console.log('=== CONSOLIDADO DIARIO AUTOMÁTICO 21:00 ===')
        console.log('Fecha:', fechaObjetivo)
        console.log('Total incidencias:', consolidadoCompleto.total_incidencias)
        console.log('Incidencias críticas:', consolidadoCompleto.incidencias_criticas)
        console.log('Áreas afectadas:', consolidadoCompleto.areas_afectadas)
        console.log('Salas afectadas:', consolidadoCompleto.salas_afectadas)
        
        if (consolidadoCompleto.estadisticas_multimedia?.resumen_multimedia) {
          const multimedia = consolidadoCompleto.estadisticas_multimedia.resumen_multimedia
          console.log('Evidencias multimedia:')
          console.log('- Imágenes:', multimedia.total_imagenes)
          console.log('- Videos:', multimedia.total_videos)
          console.log('- Incidencias con evidencia:', multimedia.incidencias_con_evidencia)
        }
        
        console.log('=======================================')
      }
    }

    // Respuesta con información completa del consolidado
    const respuesta = {
      success: true,
      mensaje: `Consolidado generado exitosamente para ${fechaObjetivo}`,
      reporte_id: reporteId,
      es_automatico: esAutomatico,
      hora_programada: "21:00",
      estadisticas: {
        total_incidencias: consolidadoCompleto?.total_incidencias || 0,
        incidencias_criticas: consolidadoCompleto?.incidencias_criticas || 0,
        incidencias_altas: consolidadoCompleto?.incidencias_altas || 0,
        incidencias_medias: consolidadoCompleto?.incidencias_medias || 0,
        incidencias_bajas: consolidadoCompleto?.incidencias_bajas || 0,
        areas_afectadas: consolidadoCompleto?.areas_afectadas || 0,
        salas_afectadas: consolidadoCompleto?.salas_afectadas || 0
      },
      multimedia: consolidadoCompleto?.estadisticas_multimedia?.resumen_multimedia || {
        total_imagenes: 0,
        total_videos: 0,
        incidencias_con_evidencia: 0
      },
      detalle_disponible: (consolidadoCompleto?.incidencias_detalle?.length || 0) > 0
    }

    return new Response(
      JSON.stringify(respuesta),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in daily consolidation:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Error interno del servidor',
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
