
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, FileText, Image as ImageIcon, Video, Eye, AlertTriangle, Users, Building, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

// Definir interfaces más específicas
interface IncidenciaImagen {
  id: string;
  url: string;
  nombre: string;
  tipo: string;
  es_video: boolean;
}

interface IncidenciaDetalle {
  id: string;
  titulo: string;
  descripcion: string;
  prioridad: string;
  area: string;
  sala: string;
  reportado_por: string;
  fecha_incidencia: string;
  imagenes: IncidenciaImagen[];
  total_archivos: number;
}

interface EstadisticasMultimedia {
  resumen_multimedia: {
    total_imagenes: number;
    total_videos: number;
    incidencias_con_evidencia: number;
  };
}

interface ConsolidadoDetallado {
  id: string;
  fecha_reporte: string;
  total_incidencias: number;
  incidencias_criticas: number;
  incidencias_altas: number;
  incidencias_medias: number;
  incidencias_bajas: number;
  areas_afectadas: number;
  salas_afectadas: number;
  incidencias_detalle: IncidenciaDetalle[];
  estadisticas_multimedia?: EstadisticasMultimedia;
}

const ConsolidadoDiario = () => {
  const { isAdmin, isRRHH, isFinanzas, isSupervisorSalas, isMantenimiento } = useAuth();
  
  // Mapeo de roles a nombres de áreas (mismo que en ReportesView)
  const roleAreaMapping = useMemo(() => ({
    rrhh: "Recursos Humanos",
    finanzas: "Contabilidad", 
    supervisor_salas: "Supervisión Salas",
    mantenimiento: "Mantenimiento"
  }), []);

  // Obtener el área correspondiente al rol del usuario
  const userAreaName = useMemo(() => {
    if (isRRHH) return roleAreaMapping.rrhh;
    if (isFinanzas) return roleAreaMapping.finanzas;
    if (isSupervisorSalas) return roleAreaMapping.supervisor_salas;
    if (isMantenimiento) return roleAreaMapping.mantenimiento;
    return null;
  }, [isRRHH, isFinanzas, isSupervisorSalas, isMantenimiento, roleAreaMapping]);

  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    // Asegurar que siempre se use la zona horaria local
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  });

  // Obtener consolidado detallado con tipo de retorno correcto - SOLO INCIDENCIAS APROBADAS
  const { data: consolidado, isLoading, refetch } = useQuery({
    queryKey: ["consolidado-detallado", fechaSeleccionada],
    queryFn: async (): Promise<ConsolidadoDetallado | null> => {
      console.log("Fetching consolidado for date:", fechaSeleccionada);
      
      const { data, error } = await supabase
        .rpc('obtener_consolidado_con_medios', { fecha_consolidado: fechaSeleccionada });

      if (error) {
        console.error("Error fetching consolidado:", error);
        throw error;
      }

      console.log("Raw consolidado data:", data);
      
      // Si no hay datos, retornar null
      if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        return null;
      }

      // Convertir el JSON a nuestro tipo esperado
      const consolidadoData = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Filtrar incidencias por área si el usuario no es admin
      let incidenciasDetalle = Array.isArray(consolidadoData.incidencias_detalle) 
        ? consolidadoData.incidencias_detalle 
        : [];

      if (!isAdmin && userAreaName) {
        incidenciasDetalle = incidenciasDetalle.filter(incidencia => 
          incidencia.area === userAreaName
        );
      }

      // Recalcular estadísticas si se filtraron incidencias
      let stats = {
        total_incidencias: consolidadoData.total_incidencias || 0,
        incidencias_criticas: consolidadoData.incidencias_criticas || 0,
        incidencias_altas: consolidadoData.incidencias_altas || 0,
        incidencias_medias: consolidadoData.incidencias_medias || 0,
        incidencias_bajas: consolidadoData.incidencias_bajas || 0,
        areas_afectadas: consolidadoData.areas_afectadas || 0,
        salas_afectadas: consolidadoData.salas_afectadas || 0,
      };

      if (!isAdmin && userAreaName && incidenciasDetalle.length !== consolidadoData.total_incidencias) {
        // Recalcular estadísticas basándose en incidencias filtradas
        stats = {
          total_incidencias: incidenciasDetalle.length,
          incidencias_criticas: incidenciasDetalle.filter(i => i.prioridad === 'critica').length,
          incidencias_altas: incidenciasDetalle.filter(i => i.prioridad === 'alta').length,
          incidencias_medias: incidenciasDetalle.filter(i => i.prioridad === 'media').length,
          incidencias_bajas: incidenciasDetalle.filter(i => i.prioridad === 'baja').length,
          areas_afectadas: [...new Set(incidenciasDetalle.map(i => i.area))].length,
          salas_afectadas: [...new Set(incidenciasDetalle.map(i => i.sala).filter(Boolean))].length,
        };
      }
      
      return {
        id: consolidadoData.id || '',
        fecha_reporte: consolidadoData.fecha_reporte || fechaSeleccionada,
        ...stats,
        incidencias_detalle: incidenciasDetalle,
        estadisticas_multimedia: consolidadoData.estadisticas_multimedia || {
          resumen_multimedia: {
            total_imagenes: 0,
            total_videos: 0,
            incidencias_con_evidencia: 0
          }
        }
      };
    },
  });

  const generarConsolidado = async () => {
    try {
      console.log("Generando consolidado para fecha:", fechaSeleccionada);
      
      const { data, error } = await supabase.functions.invoke('daily-consolidation', {
        body: { fecha: fechaSeleccionada, automatico: false }
      });

      if (error) throw error;

      console.log("Respuesta del consolidado:", data);
      
      if (data.success) {
        toast.success(`Consolidado generado: ${data.estadisticas.total_incidencias} incidencias procesadas`);
      } else {
        toast.error(data.mensaje || "Error al generar el consolidado");
      }
      
      // Forzar la recarga de datos después de generar
      setTimeout(() => refetch(), 1000);
    } catch (error) {
      console.error("Error generating consolidado:", error);
      toast.error("Error al generar el consolidado");
    }
  };

  const generarPDF = async () => {
    try {
      toast.loading("Generando PDF del consolidado...");
      
      const { data, error } = await supabase.functions.invoke('generate-daily-pdf', {
        body: { fecha: fechaSeleccionada }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`PDF generado y enviado a ${data.destinatario}`);
        
        // Abrir PDF en nueva ventana
        if (data.pdf_url) {
          window.open(data.pdf_url, '_blank');
        }
      } else {
        toast.error(data.message || "Error al generar PDF");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
    }
  };

  const exportarPDFLocal = async () => {
    if (!consolidado) {
      toast.error("No hay datos para exportar");
      return;
    }

    try {
      //toast.loading("Generando PDF local...");
      
      const { generarConsolidadoPDF } = await import('@/utils/consolidadoPdfGenerator');
      const pdfBlob = await generarConsolidadoPDF(consolidado);
      
      // Descargar PDF
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `consolidado_${fechaSeleccionada}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("PDF descargado exitosamente");
    } catch (error) {
      console.error("Error generating local PDF:", error);
      toast.error("Error al generar el PDF local");
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case "critica": return "bg-red-500 text-white";
      case "alta": return "bg-orange-500 text-white";
      case "media": return "bg-yellow-500 text-white";
      case "baja": return "bg-green-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const MediaViewer = ({ archivo }: { archivo: IncidenciaImagen }) => {
    if (archivo.es_video) {
      return (
        <div className="relative group">
          <video
            src={archivo.url}
            className="w-full h-32 object-cover rounded-lg"
            controls
            preload="metadata"
          />
          <div className="absolute top-2 left-2 bg-black bg-opacity-70 rounded-full p-1">
            <Video className="w-4 h-4 text-white" />
          </div>
        </div>
      );
    } else {
      return (
        <div className="relative group">
          <img
            src={archivo.url}
            alt={archivo.nombre}
            className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => window.open(archivo.url, '_blank')}
          />
          <div className="absolute top-2 left-2 bg-black bg-opacity-70 rounded-full p-1">
            <ImageIcon className="w-4 h-4 text-white" />
          </div>
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            <Eye className="w-3 h-3 inline mr-1" />
            Ver
          </div>
        </div>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header y controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Consolidado Diario de Incidencias
          </CardTitle>
          <CardDescription>
            Reporte automático generado diariamente a las 21:00 horas con envío automático por correo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end flex-wrap">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha del consolidado</Label>
              <Input
                id="fecha"
                type="date"
                value={fechaSeleccionada}
                onChange={(e) => setFechaSeleccionada(e.target.value)}
                className="w-auto"
              />
            </div>
            <Button onClick={generarConsolidado} className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Generar Consolidado
            </Button>
            <Button 
              onClick={exportarPDFLocal} 
              variant="secondary" 
              className="flex items-center gap-2"
              disabled={!consolidado}
            >
              <FileText className="w-4 h-4" />
              Descargar PDF
            </Button>
          </div>
          
          {/* Información de configuración de correo */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Configuración de Envío Automático:</span>
            </div>
            <p className="text-blue-700 text-sm mt-1">
              El PDF se enviará automáticamente al correo configurado en el sistema. 
              Para cambiar el destinatario, contacta al administrador del sistema.
            </p>
          </div>

          {/* Indicador de filtro de incidencias aprobadas */}
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">Filtro de Seguridad Activo:</span>
            </div>
            <p className="text-green-700 text-sm mt-1">
              Este consolidado incluye únicamente incidencias que han sido <strong>aprobadas</strong> por un supervisor. 
              Las incidencias en estado "borrador" o "rechazado" no se incluyen en el reporte.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Resumen del consolidado */}
      {consolidado && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Resumen del {format(new Date(consolidado.fecha_reporte), 'dd \'de\' MMMM \'de\' yyyy', { locale: es })}
                <Badge variant="secondary" className="ml-2">Solo Incidencias Aprobadas</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{consolidado.total_incidencias}</div>
                  <div className="text-sm text-gray-600">Total Incidencias</div>
                  <div className="text-xs text-gray-500 mt-1">Aprobadas</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{consolidado.incidencias_criticas}</div>
                  <div className="text-sm text-gray-600">Críticas</div>
                  <div className="text-xs text-gray-500 mt-1">Aprobadas</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{consolidado.areas_afectadas}</div>
                  <div className="text-sm text-gray-600">Áreas Afectadas</div>
                  <div className="text-xs text-gray-500 mt-1">Con incidencias aprobadas</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{consolidado.salas_afectadas}</div>
                  <div className="text-sm text-gray-600">Sucursales Afectadas</div>
                  <div className="text-xs text-gray-500 mt-1">Con incidencias aprobadas</div>
                </div>
              </div>

              {/* Estadísticas multimedia */}
              {consolidado.estadisticas_multimedia && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Evidencia Multimedia
                    <Badge variant="outline" className="text-xs">Solo de incidencias aprobadas</Badge>
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-blue-600">
                        {consolidado.estadisticas_multimedia.resumen_multimedia.total_imagenes}
                      </div>
                      <div className="text-xs text-gray-600">Imágenes</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-600">
                        {consolidado.estadisticas_multimedia.resumen_multimedia.total_videos}
                      </div>
                      <div className="text-xs text-gray-600">Videos</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-orange-600">
                        {consolidado.estadisticas_multimedia.resumen_multimedia.incidencias_con_evidencia}
                      </div>
                      <div className="text-xs text-gray-600">Con Evidencia</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Distribución de prioridades */}
              <div className="flex gap-2 flex-wrap">
                <Badge className="bg-red-500 text-white">
                  Críticas: {consolidado.incidencias_criticas}
                </Badge>
                <Badge className="bg-orange-500 text-white">
                  Altas: {consolidado.incidencias_altas}
                </Badge>
                <Badge className="bg-yellow-500 text-white">
                  Medias: {consolidado.incidencias_medias}
                </Badge>
                <Badge className="bg-green-500 text-white">
                  Bajas: {consolidado.incidencias_bajas}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Detalle de incidencias */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Detalle de Incidencias Aprobadas
              </CardTitle>
              <CardDescription>
                Listado completo de incidencias aprobadas del día con evidencia multimedia
              </CardDescription>
            </CardHeader>
            <CardContent>
              {consolidado.incidencias_detalle.length > 0 ? (
                <div className="space-y-4">
                  {consolidado.incidencias_detalle.map((incidencia) => (
                    <Card key={incidencia.id} className="border-l-4 border-l-green-500">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-lg">{incidencia.titulo}</h4>
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Aprobada
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-2">
                              <Badge className={getPrioridadColor(incidencia.prioridad)}>
                                {incidencia.prioridad}
                              </Badge>
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Building className="w-3 h-3" />
                                {incidencia.area}
                              </Badge>
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {incidencia.sala}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <p>{format(new Date(incidencia.fecha_incidencia), 'HH:mm', { locale: es })}</p>
                            <p>Por: {incidencia.reportado_por}</p>
                          </div>
                        </div>

                        <p className="text-gray-700 mb-3">{incidencia.descripcion}</p>

                        {/* Multimedia */}
                        {incidencia.imagenes && incidencia.imagenes.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                              <ImageIcon className="w-4 h-4" />
                              Evidencia Multimedia ({incidencia.total_archivos} archivos)
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {incidencia.imagenes.map((archivo) => (
                                <div key={archivo.id} className="space-y-1">
                                  <MediaViewer archivo={archivo} />
                                  <p className="text-xs text-gray-500 truncate" title={archivo.nombre}>
                                    {archivo.nombre}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {(!incidencia.imagenes || incidencia.imagenes.length === 0) && (
                          <div className="text-sm text-gray-500 italic">
                            Sin evidencia multimedia adjunta
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                  <p className="mt-2 text-gray-600">No hay incidencias aprobadas para esta fecha</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Solo se muestran incidencias que han sido aprobadas por un supervisor
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!consolidado && !isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-600">No hay consolidado disponible para esta fecha</p>
              <p className="text-sm text-gray-500 mt-1">
                Recuerda que solo se incluyen incidencias aprobadas
              </p>
              <Button onClick={generarConsolidado} className="mt-4">
                Generar Consolidado
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConsolidadoDiario;
