import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, User, Building, Edit, Timer, Eye } from 'lucide-react';
import { useSolicitudes, type Solicitud } from '@/hooks/useSolicitudes';
import { useAuth } from '@/hooks/useAuth';
import { ProgresoEjecucionDialog } from './ProgresoEjecucionDialog';
import { CerrarSolicitudDialog } from './CerrarSolicitudDialog';
import { DetallesCierreDialog } from './DetallesCierreDialog';
import { formatHorasATradicional } from '@/utils/timeFormatter';

interface SolicitudCardProps {
  solicitud: Solicitud;
}

const getEstadoBadgeVariant = (estado: string) => {
  switch (estado) {
    case 'pendiente':
      return 'outline';
    case 'aceptada':
      return 'secondary';
    case 'en_ejecucion':
      return 'default';
    case 'cerrada':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getEstadoColor = (estado: string) => {
  switch (estado) {
    case 'pendiente':
      return 'text-yellow-600';
    case 'aceptada':
      return 'text-blue-600';
    case 'en_ejecucion':
      return 'text-green-600';
    case 'cerrada':
      return 'text-gray-600';
    default:
      return 'text-gray-600';
  }
};

export const SolicitudCard = ({ solicitud }: SolicitudCardProps) => {
  const { user } = useAuth();
  const { aceptarSolicitud, isAccepting } = useSolicitudes();
  const [showProgresoDialog, setShowProgresoDialog] = useState(false);
  const [showCerrarDialog, setShowCerrarDialog] = useState(false);
  const [showDetallesCierreDialog, setShowDetallesCierreDialog] = useState(false);

  const canManageSolicitud = user?.id !== solicitud.solicitante_id;
  const showDiasPendientes = solicitud.estado === 'pendiente' && solicitud.dias_pendientes && solicitud.dias_pendientes > 0;
  const showHorasTranscurridas = solicitud.horas_transcurridas && solicitud.horas_transcurridas > 0;

  const handleAceptar = async () => {
    try {
      await aceptarSolicitud(solicitud.id);
    } catch (error) {
      console.error('Error al aceptar solicitud:', error);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{solicitud.titulo}</CardTitle>
          <div className="flex gap-2 items-center">
            <Badge variant={getEstadoBadgeVariant(solicitud.estado)} className={getEstadoColor(solicitud.estado)}>
              {solicitud.estado.replace('_', ' ').toUpperCase()}
            </Badge>
            {showDiasPendientes && (
              <Badge variant="outline" className="text-red-600 border-red-600">
                <Clock className="w-3 h-3 mr-1" />
                {solicitud.dias_pendientes} días pendiente
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{solicitud.descripcion}</p>
          
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Building className="w-4 h-4" />
              <span>{solicitud.area?.nombre || 'Sin área'}</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>{solicitud.profiles?.full_name || 'Usuario desconocido'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{format(new Date(solicitud.fecha_creacion), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
            </div>
            {showHorasTranscurridas && (
              <div className="flex items-center gap-1">
                <Timer className="w-4 h-4" />
                <span className="font-medium text-blue-600">
                  {formatHorasATradicional(solicitud.horas_transcurridas || 0)}
                </span>
              </div>
            )}
          </div>

          {solicitud.progreso_ejecucion && (
            <div className="bg-muted p-3 rounded-md mt-3">
              <h5 className="text-sm font-medium mb-1">Progreso de ejecución:</h5>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {solicitud.progreso_ejecucion}
              </p>
            </div>
          )}

          {canManageSolicitud && (
            <div className="flex gap-2 mt-4">
              {solicitud.estado === 'pendiente' && (
                <Button 
                  size="sm" 
                  onClick={handleAceptar}
                  disabled={isAccepting}
                >
                  {isAccepting ? 'Aceptando...' : 'Aceptar y Comenzar'}
                </Button>
              )}
              
              {solicitud.estado === 'en_ejecucion' && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowProgresoDialog(true)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Actualizar Progreso
                </Button>
              )}
              
              {solicitud.estado === 'en_ejecucion' && (
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => setShowCerrarDialog(true)}
                >
                  Cerrar Solicitud
                </Button>
              )}
            </div>
          )}

          {/* Botón para ver detalles del cierre cuando está cerrada */}
          {solicitud.estado === 'cerrada' && (
            <div className="flex gap-2 mt-4">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowDetallesCierreDialog(true)}
              >
                <Eye className="w-4 h-4 mr-1" />
                Ver Detalles del Cierre
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      <ProgresoEjecucionDialog
        solicitud={solicitud}
        isOpen={showProgresoDialog}
        onClose={() => setShowProgresoDialog(false)}
      />

      <CerrarSolicitudDialog
        solicitud={solicitud}
        isOpen={showCerrarDialog}
        onClose={() => setShowCerrarDialog(false)}
      />

      <DetallesCierreDialog
        solicitud={solicitud}
        isOpen={showDetallesCierreDialog}
        onClose={() => setShowDetallesCierreDialog(false)}
      />
    </Card>
  );
};