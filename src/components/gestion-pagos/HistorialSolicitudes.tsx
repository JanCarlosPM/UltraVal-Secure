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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, Search, Download } from 'lucide-react';
import { useGestionPagos } from '@/hooks/useGestionPagos';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DetalleSolicitudDialog } from './DetalleSolicitudDialog';

interface HistorialSolicitudesProps {
  soloMias?: boolean;
}

export const HistorialSolicitudes = ({ soloMias = false }: HistorialSolicitudesProps) => {
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroSala, setFiltroSala] = useState<string>('todas');
  const [busqueda, setBusqueda] = useState('');
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<string | null>(null);
  
  const { solicitudes, salas, isLoading } = useGestionPagos();
  const { user } = useAuth();

  // Filtrar solicitudes
  const solicitudesFiltradas = solicitudes.filter(solicitud => {
    // Filtro por usuario si es "solo mías"
    if (soloMias && solicitud.solicitante_id !== user?.id) {
      return false;
    }

    // Filtro por estado
    if (filtroEstado !== 'todos' && solicitud.estado !== filtroEstado) {
      return false;
    }

    // Filtro por sala
    if (filtroSala !== 'todas' && solicitud.sala_id !== filtroSala) {
      return false;
    }

    // Filtro por búsqueda
    if (busqueda) {
      const textoCompleto = `${solicitud.numero_solicitud} ${solicitud.descripcion} ${solicitud.sala?.nombre || ''} ${solicitud.concepto_pago?.nombre || ''}`.toLowerCase();
      if (!textoCompleto.includes(busqueda.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  // Función para descargar CSV
  const descargarCSV = () => {
    if (solicitudesFiltradas.length === 0) return;

    const headers = [
      'Número Solicitud',
      'Fecha',
      'Sala',
      'Concepto',
      'Monto',
      'Estado',
      ...(soloMias ? [] : ['Solicitante']),
      'Observaciones'
    ];

    const rows = solicitudesFiltradas.map(solicitud => [
      solicitud.numero_solicitud,
      format(new Date(solicitud.created_at), 'dd/MM/yyyy', { locale: es }),
      solicitud.sala?.nombre || 'N/A',
      solicitud.concepto_pago?.nombre || 'N/A',
      solicitud.monto.toLocaleString(),
      solicitud.estado,
      ...(soloMias ? [] : [solicitud.solicitante?.full_name || 'N/A']),
      solicitud.observaciones || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `solicitudes-pago-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            {soloMias ? 'Mis Solicitudes de Pago' : 'Historial de Solicitudes'}
          </CardTitle>
          <CardDescription>
            {soloMias 
              ? 'Visualiza todas tus solicitudes de pago'
              : 'Historial completo de solicitudes de pago del sistema'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros y acciones */}
          <div className="space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, descripción, sala..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="aprobado">Aprobado</SelectItem>
                  <SelectItem value="rechazado">Rechazado</SelectItem>
                  <SelectItem value="pagado">Pagado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroSala} onValueChange={setFiltroSala}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filtrar por sala" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las salas</SelectItem>
                  {salas?.map((sala) => (
                    <SelectItem key={sala.id} value={sala.id}>
                      {sala.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={descargarCSV}
                disabled={solicitudesFiltradas.length === 0}
                className="gap-2"
                variant="outline"
              >
                <Download className="h-4 w-4" />
                Descargar CSV
              </Button>
            </div>
          </div>

          {/* Tabla */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Sala</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  {!soloMias && <TableHead>Solicitante</TableHead>}
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitudesFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell 
                      colSpan={soloMias ? 7 : 8} 
                      className="h-24 text-center text-muted-foreground"
                    >
                      No se encontraron solicitudes
                    </TableCell>
                  </TableRow>
                ) : (
                  solicitudesFiltradas.map((solicitud) => (
                    <TableRow key={solicitud.id}>
                      <TableCell className="font-medium">
                        {solicitud.numero_solicitud}
                      </TableCell>
                      <TableCell>
                        {format(new Date(solicitud.created_at), 'dd/MM/yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>{solicitud.sala?.nombre || 'N/A'}</TableCell>
                      <TableCell>{solicitud.concepto_pago?.nombre || 'N/A'}</TableCell>
                      <TableCell className="font-medium">
                        ${solicitud.monto.toLocaleString()}
                      </TableCell>
                      <TableCell>{getEstadoBadge(solicitud.estado)}</TableCell>
                      {!soloMias && (
                        <TableCell>{solicitud.solicitante?.full_name || 'N/A'}</TableCell>
                      )}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSolicitudSeleccionada(solicitud.id)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Ver Detalle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Resumen */}
          {solicitudesFiltradas.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Mostrando {solicitudesFiltradas.length} de {solicitudes.length} solicitudes
            </div>
          )}
        </CardContent>
      </Card>

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