
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { useMutation, useQueryClient } from "@tanstack/react-query";

const ImportDataModule = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [salasFile, setSalasFile] = useState<File | null>(null);
  const [incidenciasFile, setIncidenciasFile] = useState<File | null>(null);

  // Mutación para importar salas (simplificada)
  const importSalas = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const expectedHeaders = ['nombre', 'descripcion'];
      const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        throw new Error(`Columnas faltantes: ${missingHeaders.join(', ')}`);
      }

      const salas = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const sala: any = {};
        
        headers.forEach((header, index) => {
          sala[header] = values[index] || null;
        });
        
        return sala;
      });

      const { data, error } = await supabase
        .from('salas')
        .insert(salas)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Importación exitosa",
        description: `Se importaron ${data.length} salas correctamente.`,
      });
      setSalasFile(null);
      queryClient.invalidateQueries({ queryKey: ["salas"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error en la importación",
        description: error.message || "Error al importar las salas.",
        variant: "destructive",
      });
    },
  });

  // Mutación para importar incidencias
  const importIncidencias = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const expectedHeaders = ['titulo', 'descripcion', 'reportado_por', 'prioridad', 'area_nombre', 'clasificacion_nombre', 'sala_nombre'];
      const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        throw new Error(`Columnas faltantes: ${missingHeaders.join(', ')}`);
      }

      // Obtener datos de referencia
      const [areasResult, clasificacionesResult, salasResult] = await Promise.all([
        supabase.from('areas').select('id, nombre'),
        supabase.from('clasificaciones').select('id, nombre'),
        supabase.from('salas').select('id, nombre')
      ]);

      const areas = areasResult.data || [];
      const clasificaciones = clasificacionesResult.data || [];
      const salas = salasResult.data || [];

      const incidencias = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const incidencia: any = {};
        
        headers.forEach((header, index) => {
          const value = values[index];
          
          switch (header) {
            case 'area_nombre':
              const area = areas.find(a => a.nombre.toLowerCase() === value?.toLowerCase());
              incidencia.area_id = area?.id;
              break;
            case 'clasificacion_nombre':
              const clasificacion = clasificaciones.find(c => c.nombre.toLowerCase() === value?.toLowerCase());
              incidencia.clasificacion_id = clasificacion?.id;
              break;
            case 'sala_nombre':
              const sala = salas.find(s => s.nombre.toLowerCase() === value?.toLowerCase());
              incidencia.sala_id = sala?.id;
              break;
            case 'prioridad':
              incidencia.prioridad = ['critica', 'alta', 'media', 'baja'].includes(value?.toLowerCase()) 
                ? value.toLowerCase() 
                : 'media';
              break;
            default:
              incidencia[header] = value || null;
          }
        });
        
        incidencia.fecha_incidencia = new Date().toISOString();
        return incidencia;
      });

      // Filtrar incidencias válidas
      const validIncidencias = incidencias.filter(inc => 
        inc.titulo && inc.descripcion && inc.area_id && inc.clasificacion_id && inc.reportado_por
      );

      if (validIncidencias.length === 0) {
        throw new Error('No se encontraron incidencias válidas para importar.');
      }

      const { data, error } = await supabase
        .from('incidencias')
        .insert(validIncidencias)
        .select();

      if (error) throw error;
      return { imported: data.length, total: incidencias.length };
    },
    onSuccess: (result) => {
      toast({
        title: "Importación exitosa",
        description: `Se importaron ${result.imported} de ${result.total} incidencias correctamente.`,
      });
      setIncidenciasFile(null);
      queryClient.invalidateQueries({ queryKey: ["incidencias"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error en la importación",
        description: error.message || "Error al importar las incidencias.",
        variant: "destructive",
      });
    },
  });

  const handleSalasImport = () => {
    if (!salasFile) {
      toast({
        title: "Archivo requerido",
        description: "Por favor selecciona un archivo CSV para importar.",
        variant: "destructive",
      });
      return;
    }
    importSalas.mutate(salasFile);
  };

  const handleIncidenciasImport = () => {
    if (!incidenciasFile) {
      toast({
        title: "Archivo requerido",
        description: "Por favor selecciona un archivo CSV para importar.",
        variant: "destructive",
      });
      return;
    }
    importIncidencias.mutate(incidenciasFile);
  };

  const downloadTemplate = (type: 'salas' | 'incidencias') => {
    let csvContent = '';
    
    if (type === 'salas') {
      csvContent = 'nombre,descripcion\n';
      csvContent += 'Casino Principal,Sala principal del casino\n';
      csvContent += 'Casino Norte,Sucursal zona norte\n';
    } else {
      csvContent = 'titulo,descripcion,reportado_por,prioridad,area_nombre,clasificacion_nombre,sala_nombre\n';
      csvContent += 'Incidencia de prueba,Descripción detallada,Monitor 1,media,Finanzas,Hurtos,Casino Principal\n';
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${type}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importación de Datos
          </CardTitle>
          <CardDescription>
            Importa datos masivamente desde archivos CSV. Los datos se validarán y relacionarán automáticamente.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="salas" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="salas">Salas de Casino</TabsTrigger>
          <TabsTrigger value="incidencias">Incidencias</TabsTrigger>
        </TabsList>

        <TabsContent value="salas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Importar Salas de Casino
              </CardTitle>
              <CardDescription>
                Importa información de salas desde un archivo CSV. Las columnas requeridas son: nombre, descripción.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm text-blue-800">
                    <strong>Formato actualizado:</strong> CSV con columnas: nombre, descripcion
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Se eliminaron los campos ubicacion y numero_camaras para simplificar la estructura.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => downloadTemplate('salas')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Plantilla
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="salas-file">Seleccionar archivo CSV</Label>
                <Input
                  id="salas-file"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setSalasFile(e.target.files?.[0] || null)}
                />
                {salasFile && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Archivo seleccionado: {salasFile.name}
                  </div>
                )}
              </div>

              <Button 
                onClick={handleSalasImport}
                disabled={!salasFile || importSalas.isPending}
                className="w-full"
              >
                {importSalas.isPending ? "Importando..." : "Importar Salas"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidencias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Importar Incidencias
              </CardTitle>
              <CardDescription>
                Importa incidencias desde un archivo CSV. Los datos se relacionarán automáticamente con áreas, clasificaciones y salas existentes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <div className="flex-1">
                  <p className="text-sm text-amber-800">
                    <strong>Columnas requeridas:</strong> titulo, descripcion, reportado_por, prioridad, area_nombre, clasificacion_nombre, sala_nombre
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Las áreas, clasificaciones y salas deben existir previamente en el sistema. El sistema cuenta con mapeo automático de áreas según tipo de incidencia.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => downloadTemplate('incidencias')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Plantilla
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="incidencias-file">Seleccionar archivo CSV</Label>
                <Input
                  id="incidencias-file"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setIncidenciasFile(e.target.files?.[0] || null)}
                />
                {incidenciasFile && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Archivo seleccionado: {incidenciasFile.name}
                  </div>
                )}
              </div>

              <Button 
                onClick={handleIncidenciasImport}
                disabled={!incidenciasFile || importIncidencias.isPending}
                className="w-full"
              >
                {importIncidencias.isPending ? "Importando..." : "Importar Incidencias"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImportDataModule;
