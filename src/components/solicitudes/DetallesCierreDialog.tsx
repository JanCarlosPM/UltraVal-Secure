import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { type Solicitud } from '@/hooks/useSolicitudes';
import { formatHorasATradicional } from '@/utils/timeFormatter';
import { User, Calendar, Clock, FileText } from 'lucide-react';

interface DetallesCierreDialogProps {
  solicitud: Solicitud;
  isOpen: boolean;
  onClose: () => void;
}

export const DetallesCierreDialog = ({ solicitud, isOpen, onClose }: DetallesCierreDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Detalles del Cierre de Solicitud
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Información básica de la solicitud */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-3 text-lg">Información de la Solicitud</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Título</p>
                <p className="font-medium">{solicitud.titulo}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge variant="destructive" className="text-gray-600">
                  CERRADA
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Área</p>
                <p className="font-medium">{solicitud.area?.nombre || 'Sin área'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Solicitante</p>
                <p className="font-medium">{solicitud.profiles?.full_name || 'Usuario desconocido'}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Descripción</p>
              <p className="mt-1">{solicitud.descripcion}</p>
            </div>
          </div>

          {/* Cronología de fechas */}
          <div className="bg-background border rounded-lg p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Cronología
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Fecha de creación</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(solicitud.fecha_creacion), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </p>
                </div>
              </div>

              {solicitud.fecha_aceptacion && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Fecha de aceptación</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(solicitud.fecha_aceptacion), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </p>
                  </div>
                </div>
              )}

              {solicitud.fecha_inicio_ejecucion && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium">Inicio de ejecución</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(solicitud.fecha_inicio_ejecucion), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </p>
                  </div>
                </div>
              )}

              {solicitud.fecha_cierre && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-red-500" />
                  <div>
                    <p className="text-sm font-medium">Fecha de cierre</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(solicitud.fecha_cierre), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </p>
                  </div>
                </div>
              )}

              {solicitud.horas_transcurridas && solicitud.horas_transcurridas > 0 && (
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium">Tiempo total de ejecución</p>
                    <p className="text-sm font-bold text-purple-600">
                      {formatHorasATradicional(solicitud.horas_transcurridas)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progreso y acciones realizadas */}
          {solicitud.progreso_ejecucion && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold mb-3 text-green-800 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Registro de Progreso y Acciones Realizadas
              </h4>
              <div className="bg-white p-4 rounded border border-green-100">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {solicitud.progreso_ejecucion}
                </p>
              </div>
            </div>
          )}

          {!solicitud.progreso_ejecucion && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">
                No se registraron detalles adicionales sobre el cierre de esta solicitud.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};