import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Database, Clock, FileDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BackupStats {
  timestamp: string;
  totalTables: number;
  totalRecords: number;
  tableStats: Array<{
    table: string;
    records: number;
  }>;
}

const BackupManagement = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastBackupStats, setLastBackupStats] = useState<BackupStats | null>(null);

  const generateBackup = async () => {
    setIsGenerating(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await supabase.functions.invoke('generate-backup', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Error al generar backup');
      }

      // El response.data contiene el backup completo
      const backupData = response.data;
      
      // Extraer estadísticas del backup
      const tables = backupData.tables as Record<string, any[]>;
      const totalRecords = Object.values(tables).reduce(
        (sum, records) => sum + (Array.isArray(records) ? records.length : 0), 
        0
      );
      
      const stats: BackupStats = {
        timestamp: backupData.timestamp,
        totalTables: Object.keys(tables).length,
        totalRecords,
        tableStats: Object.entries(tables).map(([name, records]) => ({
          table: name,
          records: Array.isArray(records) ? records.length : 0
        }))
      };

      setLastBackupStats(stats);

      // Crear y descargar archivo
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
      link.download = `backup_${dateStr}_${timeStr}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Backup generado y descargado correctamente');

    } catch (error) {
      console.error('Error generating backup:', error);
      toast.error(`Error al generar backup: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Backups</h1>
        <p className="text-gray-600">Genera y descarga copias de seguridad completas del sistema</p>
      </div>

      {/* Información sobre backups */}
      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          Los backups incluyen todas las tablas principales del sistema: perfiles, incidencias, áreas, 
          clasificaciones, reportes y configuraciones. Los archivos se descargan en formato JSON para 
          facilitar la restauración y análisis.
        </AlertDescription>
      </Alert>

      {/* Generar backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Generar Nuevo Backup
          </CardTitle>
          <CardDescription>
            Crea una copia de seguridad completa de todos los datos del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                El backup incluirá todas las tablas del sistema con sus datos actuales.
              </p>
              <p className="text-xs text-gray-500">
                Tiempo estimado: 30 segundos - 2 minutos (dependiendo del volumen de datos)
              </p>
            </div>
            <Button 
              onClick={generateBackup}
              disabled={isGenerating}
              className="min-w-[150px]"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generar Backup
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas del último backup */}
      {lastBackupStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Último Backup Generado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Fecha:</span>
                  <span className="text-sm">
                    {format(new Date(lastBackupStats.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Tablas respaldadas:</span>
                  <Badge variant="secondary">{lastBackupStats.totalTables}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <FileDown className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Total de registros:</span>
                  <Badge variant="outline">{lastBackupStats.totalRecords.toLocaleString()}</Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Detalle por tabla:</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {lastBackupStats.tableStats.map((stat) => (
                    <div key={stat.table} className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">{stat.table}</span>
                      <Badge variant="outline" className="text-xs">
                        {stat.records.toLocaleString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instrucciones de uso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            Instrucciones de Uso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-700 mb-1">Generar Backup:</h4>
              <p>Haz clic en "Generar Backup" para crear una copia de seguridad completa. El archivo se descargará automáticamente.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-1">Formato del Archivo:</h4>
              <p>Los backups se generan en formato JSON con estructura organizada por tablas para facilitar la restauración.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-1">Almacenamiento:</h4>
              <p>Guarda los archivos de backup en un lugar seguro y considera mantener múltiples versiones históricas.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-1">Frecuencia Recomendada:</h4>
              <p>Se recomienda generar backups diarios o semanales dependiendo de la actividad del sistema.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupManagement;