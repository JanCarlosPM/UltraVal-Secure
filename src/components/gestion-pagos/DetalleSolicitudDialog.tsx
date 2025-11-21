import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calendar, User, Building, CreditCard, FileText, Image as ImageIcon } from 'lucide-react';
import { useGestionPagos } from '@/hooks/useGestionPagos';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DetalleSolicitudDialogProps {
  solicitudId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DetalleSolicitudDialog = ({ 
  solicitudId, 
  open, 
  onOpenChange 
}: DetalleSolicitudDialogProps) => {
  const { solicitudes } = useGestionPagos();
  
  const solicitud = solicitudes.find(s => s.id === solicitudId);

  if (!solicitud) {
    return null;
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Badge variant="secondary">Pendiente</Badge>;
      case 'aprobado':
        return <Badge variant="default">Aprobado</Badge>;
      case 'rechazado':
        return <Badge variant="destructive">Rechazado</Badge>;
      case 'pagado':
        return <Badge className="bg-green-600">Pagado</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Detalle de Solicitud: {solicitud.numero_solicitud}
            {getEstadoBadge(solicitud.estado)}
          </DialogTitle>
          <DialogDescription>
            Información completa de la solicitud de pago
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información básica */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Número de Solicitud
                  </label>
                  <p className="text-lg font-semibold">{solicitud.numero_solicitud}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Monto Solicitado
                  </label>
                  <p className="text-lg font-semibold text-green-600">
                    ${solicitud.monto.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Building className="h-4 w-4" />
                    Sala
                  </label>
                  <p>{solicitud.sala?.nombre || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Concepto de Pago
                  </label>
                  <p>{solicitud.concepto_pago?.nombre || 'N/A'}</p>
                  {solicitud.concepto_pago?.descripcion && (
                    <p className="text-sm text-muted-foreground">
                      {solicitud.concepto_pago.descripcion}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Descripción
                </label>
                <p className="text-sm mt-1 p-3 bg-muted rounded-lg">
                  {solicitud.descripcion}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Información de fechas y personas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Información de Proceso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Fecha de Creación
                  </label>
                  <p>{format(new Date(solicitud.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Solicitante
                  </label>
                  <p>{solicitud.solicitante?.full_name || 'N/A'}</p>
                </div>
              </div>

              {solicitud.fecha_aprobacion && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Fecha de Aprobación
                    </label>
                    <p>{format(new Date(solicitud.fecha_aprobacion), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Aprobado por
                    </label>
                    <p>{solicitud.aprobador?.full_name || 'N/A'}</p>
                  </div>
                </div>
              )}

              {solicitud.fecha_pago && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Fecha de Pago
                  </label>
                  <p>{format(new Date(solicitud.fecha_pago), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                </div>
              )}

              {solicitud.observaciones && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Observaciones
                  </label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-lg">
                    {solicitud.observaciones}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documentos adjuntos */}
          {solicitud.documentos && solicitud.documentos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Documentos Adjuntos ({solicitud.documentos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {solicitud.documentos.map((doc: any) => (
                    <div key={doc.id} className="group">
                      <img
                        src={doc.url_documento}
                        alt={doc.nombre_archivo}
                        className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(doc.url_documento, '_blank')}
                      />
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {doc.nombre_archivo}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Historial de estados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Historial de Estados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="font-medium">Solicitud Creada</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(solicitud.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </p>
                  </div>
                </div>

                {solicitud.fecha_aprobacion && (
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <div className={`w-3 h-3 rounded-full ${
                      solicitud.estado === 'aprobado' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="font-medium">
                        Solicitud {solicitud.estado === 'aprobado' ? 'Aprobada' : 'Rechazada'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(solicitud.fecha_aprobacion), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </p>
                    </div>
                  </div>
                )}

                {solicitud.fecha_pago && (
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="font-medium">Pago Realizado</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(solicitud.fecha_pago), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};