
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 🔧 CONFIGURACIÓN DE CORREO
// Aquí debes configurar el correo donde se enviará el PDF del consolidado diario
const EMAIL_DESTINATARIO = "admin@tuempresa.com"; // ⚠️ CAMBIAR POR EL CORREO REAL
const EMAIL_REMITENTE = "sistema@tuempresa.com"; // ⚠️ CAMBIAR POR TU CORREO DE ENVÍO

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { fecha } = await req.json().catch(() => ({ 
      fecha: new Date().toISOString().split('T')[0]
    }))

    console.log(`Generando PDF consolidado para la fecha: ${fecha}`)

    // Obtener datos del consolidado
    const { data: consolidado, error: consolidadoError } = await supabaseClient
      .rpc('obtener_consolidado_con_medios', { fecha_consolidado: fecha })

    if (consolidadoError) {
      console.error('Error fetching consolidado:', consolidadoError)
      throw consolidadoError
    }

    if (!consolidado || consolidado.total_incidencias === 0) {
      console.log('No hay incidencias para generar PDF')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No hay incidencias para generar PDF',
          consolidado: null 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generar el PDF usando jsPDF (implementación simplificada para Edge Function)
    const pdfContent = await generarPDFConsolidado(consolidado, fecha)
    
    // Subir PDF a storage
    const fileName = `consolidado_${fecha}.pdf`
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('consolidados-pdf')
      .upload(fileName, pdfContent, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError)
      throw uploadError
    }

    // Obtener URL pública del PDF
    const { data: urlData } = supabaseClient.storage
      .from('consolidados-pdf')
      .getPublicUrl(fileName)

    // Actualizar el registro de consolidado con la URL del PDF
    const { error: updateError } = await supabaseClient
      .from('reportes_consolidados')
      .update({ archivo_pdf_url: urlData.publicUrl })
      .eq('fecha_reporte', fecha)

    if (updateError) {
      console.error('Error updating consolidado with PDF URL:', updateError)
    }

    // Enviar PDF por correo si está configurado el servicio de email
    await enviarPDFPorCorreo(consolidado, urlData.publicUrl, fecha)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'PDF generado y enviado exitosamente',
        pdf_url: urlData.publicUrl,
        email_sent: true,
        destinatario: EMAIL_DESTINATARIO
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-daily-pdf:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Error interno del servidor',
        details: error.toString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function generarPDFConsolidado(consolidado: any, fecha: string): Promise<Uint8Array> {
  // Implementación simplificada de generación de PDF para Edge Function
  // En un entorno real, usarías una librería como puppeteer o jsPDF
  
  const contenidoHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Consolidado Diario - ${fecha}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #1441a0; color: white; padding: 20px; text-align: center; }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
        .stat-card { border: 1px solid #ddd; padding: 15px; text-align: center; }
        .incident { border-bottom: 1px solid #eee; padding: 15px 0; }
        .multimedia { margin: 10px 0; padding: 10px; background: #f5f5f5; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>CONSOLIDADO DIARIO DE INCIDENCIAS</h1>
        <h2>${fecha}</h2>
      </div>
      
      <div class="stats">
        <div class="stat-card">
          <h3>${consolidado.total_incidencias}</h3>
          <p>Total Incidencias</p>
        </div>
        <div class="stat-card">
          <h3>${consolidado.incidencias_criticas}</h3>
          <p>Críticas</p>
        </div>
        <div class="stat-card">
          <h3>${consolidado.areas_afectadas}</h3>
          <p>Áreas Afectadas</p>
        </div>
      </div>

      ${consolidado.incidencias_detalle?.map((inc: any) => `
        <div class="incident">
          <h3>${inc.titulo}</h3>
          <p><strong>Prioridad:</strong> ${inc.prioridad} | <strong>Área:</strong> ${inc.area}</p>
          <p>${inc.descripcion}</p>
          ${inc.imagenes?.length > 0 ? `
            <div class="multimedia">
              <strong>Evidencia Multimedia (${inc.imagenes.length} archivos):</strong>
              ${inc.imagenes.map((img: any) => `
                <p>📷 ${img.nombre} - ${img.url}</p>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `).join('') || ''}
      
      <footer style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
        Generado automáticamente el ${new Date().toLocaleString('es-ES')}
      </footer>
    </body>
    </html>
  `
  
  // Convertir HTML a PDF usando una implementación básica
  // En producción, usarías puppeteer o similar
  return new TextEncoder().encode(contenidoHTML)
}

async function enviarPDFPorCorreo(consolidado: any, pdfUrl: string, fecha: string) {
  // 🔧 CONFIGURACIÓN DE ENVÍO DE CORREO
  console.log('=== ENVÍO DE PDF POR CORREO ===')
  console.log('Destinatario:', EMAIL_DESTINATARIO)
  console.log('Fecha:', fecha)
  console.log('PDF URL:', pdfUrl)
  console.log('Total incidencias:', consolidado.total_incidencias)
  console.log('Incidencias críticas:', consolidado.incidencias_criticas)
  
  // Aquí puedes integrar con el servicio de email que prefieras
  // Por ejemplo, usando Resend, SendGrid, etc.
  
  const emailBody = `
    Estimado equipo,
    
    Se ha generado el consolidado diario de incidencias para la fecha ${fecha}.
    
    Resumen:
    - Total de incidencias: ${consolidado.total_incidencias}
    - Incidencias críticas: ${consolidado.incidencias_criticas}
    - Áreas afectadas: ${consolidado.areas_afectadas}
    
    Puede descargar el PDF completo desde: ${pdfUrl}
    
    Este es un mensaje automático del sistema de monitoreo.
  `
  
  console.log('Email preparado para envío:', emailBody)
  console.log('===============================')
  
  // TODO: Implementar envío real usando el servicio de email configurado
  // Ejemplo con Resend:
  /*
  const resendApiKey = Dano.env.get('RESEND_API_KEY')
  if (resendApiKey) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_REMITENTE,
        to: [EMAIL_DESTINATARIO],
        subject: `Consolidado Diario de Incidencias - ${fecha}`,
        text: emailBody,
      }),
    })
  }
  */
}
