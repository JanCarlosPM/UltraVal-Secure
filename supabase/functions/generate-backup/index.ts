import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BackupData {
  timestamp: string;
  version: string;
  tables: {
    [tableName: string]: any[];
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar autorización del usuario
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid token')
    }

    // Verificar que el usuario es admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile.role !== 'admin') {
      throw new Error('Unauthorized: Admin role required')
    }

    console.log('Starting backup generation for admin user:', user.id)

    // Definir las tablas a respaldar
    const tablesToBackup = [
      'profiles',
      'areas',
      'clasificaciones',
      'salas',
      'incidencias',
      'imagenes_incidencias',
      'reportes_consolidados',
      'user_area_access',
      'clasificacion_area',
      'clasificacion_area_mapping',
      'conteos_quincenales_sala',
      'notification_settings',
      'user_actions',
      'fcm_tokens'
    ]

    const backupData: BackupData = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      tables: {}
    }

    // Exportar datos de cada tabla
    for (const tableName of tablesToBackup) {
      try {
        console.log(`Backing up table: ${tableName}`)
        
        const { data, error } = await supabaseClient
          .from(tableName)
          .select('*')
        
        if (error) {
          console.error(`Error backing up ${tableName}:`, error)
          backupData.tables[tableName] = []
        } else {
          backupData.tables[tableName] = data || []
          console.log(`Successfully backed up ${tableName}: ${data?.length || 0} records`)
        }
      } catch (tableError) {
        console.error(`Exception backing up ${tableName}:`, tableError)
        backupData.tables[tableName] = []
      }
    }

    // Generar estadísticas del backup
    const totalRecords = Object.values(backupData.tables).reduce(
      (sum, records) => sum + records.length, 
      0
    )

    const backupStats = {
      timestamp: backupData.timestamp,
      totalTables: Object.keys(backupData.tables).length,
      totalRecords,
      tableStats: Object.entries(backupData.tables).map(([name, records]) => ({
        table: name,
        records: records.length
      }))
    }

    console.log('Backup completed:', backupStats)

    // Crear nombre del archivo
    const dateStr = new Date().toISOString().split('T')[0]
    const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-')
    const fileName = `backup_${dateStr}_${timeStr}.json`

    return new Response(
      JSON.stringify(backupData, null, 2),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      }
    )

  } catch (error) {
    console.error('Backup generation error:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
})