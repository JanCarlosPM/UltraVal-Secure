import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Check, X, Eye, Clock } from 'lucide-react';
import { useGestionPagos, SolicitudPago } from '@/hooks/useGestionPagos';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DetalleSolicitudDialog } from './DetalleSolicitudDialog';

interface AccionSolicitud {
  solicitud: SolicitudPago;
  accion: 'aprobar' | 'rechazar';
}

export const SolicitudesPendientes = () => {
  const [accionActual, setAccionActual] = useState<AccionSolicitud | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<string | null>(null);
  
  const { solicitudes, actualizarEstadoSolicitud, isUpdating } = useGestionPagos();

  // Filtrar solo solicitudes pendientes
  const solicitudesPendientes = solicitudes.filter(s => s.estado === 'pendiente');

  const handleAccion = (solicitud: SolicitudPago, accion: 'aprobar' | 'rechazar') => {
    setAccionActual({ solicitud, accion });
    setObservaciones('');
  };

  const confirmarAccion = async () => {
    if (!accionActual) return;

    try {
      await actualizarEstadoSolicitud({
        solicitudId: accionActual.solicitud.id,
        estado: accionActual.accion === 'aprobar' ? 'aprobado' : 'rechazado',
        observaciones: observaciones || undefined,
      });
      
      setAccionActual(null);
      setObservaciones('');
    } catch (error) {
      console.error('Error al actualizar solicitud:', error);
    }
  };

  if (solicitudesPendientes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Solicitudes Pendientes</CardTitle>
          <CardDescription>
            No hay solicitudes pendientes de aprobación
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">¡Todo al día!</h3>
          <p className="text-muted-foreground">
            No tienes solicitudes pendientes por revisar en este momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Solicitudes Pendientes de Aprobación
            <Badge variant="destructive">{solicitudesPendientes.length}</Badge>
          </CardTitle>
          <CardDescription>
            Revisa y aprueba las solicitudes de pago pendientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Sala</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitudesPendientes.map((solicitud) => (
                  <TableRow key={solicitud.id}>
                    <TableCell className="font-medium">
                      {solicitud.numero_solicitud}
                    </TableCell>
                    <TableCell>
                      {format(new Date(solicitud.created_at), 'dd/MM/yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>{solicitud.solicitante?.full_name || 'N/A'}</TableCell>
                    <TableCell>{solicitud.sala?.nombre || 'N/A'}</TableCell>
                    <TableCell>{solicitud.concepto_pago?.nombre || 'N/A'}</TableCell>
                    <TableCell className="font-medium">
                      ${solicitud.monto.toLocaleString()}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {solicitud.descripcion}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSolicitudSeleccionada(solicitud.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAccion(solicitud, 'aprobar')}
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          disabled={isUpdating}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAccion(solicitud, 'rechazar')}
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          disabled={isUpdating}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmación */}
      <Dialog open={!!accionActual} onOpenChange={(open) => !open && setAccionActual(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {accionActual?.accion === 'aprobar' ? 'Aprobar' : 'Rechazar'} Solicitud
            </DialogTitle>
            <DialogDescription>
              Solicitud: {accionActual?.solicitud.numero_solicitud} por $
              {accionActual?.solicitud.monto.toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Observaciones {accionActual?.accion === 'rechazar' && '(requeridas)'}
              </label>
              <Textarea
                placeholder={
                  accionActual?.accion === 'aprobar' 
                    ? 'Comentarios adicionales (opcional)...'
                    : 'Motivo del rechazo...'
                }
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAccionActual(null)}
              disabled={isUpdating}
            >
              Cancelar
            </Button>
            <Button
              variant={accionActual?.accion === 'aprobar' ? 'default' : 'destructive'}
              onClick={confirmarAccion}
              disabled={
                isUpdating || 
                (accionActual?.accion === 'rechazar' && !observaciones.trim())
              }
            >
              {isUpdating ? 'Procesando...' : (
                accionActual?.accion === 'aprobar' ? 'Aprobar' : 'Rechazar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de detalle */}
      {solicitudSeleccionada && (
        <DetalleSolicitudDialog
          solicitudId={solicitudSeleccionada}
          open={!!solicitudSeleccionada}
          onOpenChange={(open) => !open && setSolicitudSeleccionada(null)}
        />
      )}
    </>
  );
};