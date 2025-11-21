import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { FileDown, ArrowUpDown, ArrowDown, ArrowUp, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Movimiento } from '@/hooks/useMovimientoActivos';
import * as XLSX from 'xlsx';

interface MovimientosListProps {
  movimientos: Movimiento[];
}

const tipoIconos = {
  asignacion: ArrowDown,
  baja: ArrowUpDown,
  traslado: ArrowUp,
  mantenimiento: Wrench,
};

const tipoColores = {
  asignacion: 'default',
  baja: 'destructive',
  traslado: 'secondary',
  mantenimiento: 'outline',
} as const;

const tipoLabels = {
  asignacion: 'Asignación',
  baja: 'Baja',
  traslado: 'Traslado',
  mantenimiento: 'Mantenimiento',
};

export const MovimientosList = ({ movimientos }: MovimientosListProps) => {
  const exportarExcel = () => {
    // Crear datos simplificados
    const datosExcel = movimientos.map(movimiento => ({
      'Fecha': format(new Date(movimiento.fecha_movimiento), 'dd/MM/yyyy'),
      'Código': movimiento.activos_salas?.codigo || '',
      'Tipo Movimiento': tipoLabels[movimiento.tipo_movimiento],
      'Sala Origen': movimiento.sala_origen?.nombre || '-',
      'Sala Destino': movimiento.sala_destino?.nombre || '-',
      'Motivo': movimiento.motivo,
    }));

    // Crear encabezado con logo
    const header = [
      ['GRUPO ESVA'],
      ['Sistema de Gestión de Activos'],
      ['Reporte de Movimientos de Activos'],
      [`Fecha de Generación: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
      [], // Línea vacía
    ];

    const ws = XLSX.utils.aoa_to_sheet(header);
    XLSX.utils.sheet_add_json(ws, datosExcel, { origin: -1 });

    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 12 }, // Fecha
      { wch: 15 }, // Código
      { wch: 18 }, // Tipo Movimiento
      { wch: 20 }, // Sala Origen
      { wch: 20 }, // Sala Destino
      { wch: 40 }, // Motivo
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
    
    const fecha = format(new Date(), 'yyyy-MM-dd');
    XLSX.writeFile(wb, `movimientos-activos-${fecha}.xlsx`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Historial de Movimientos ({movimientos.length})</CardTitle>
          <Button onClick={exportarExcel} variant="outline" size="sm">
            <FileDown className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead>Salas</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Observaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimientos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No se encontraron movimientos
                  </TableCell>
                </TableRow>
              ) : (
                movimientos.map((movimiento) => {
                  const TipoIcon = tipoIconos[movimiento.tipo_movimiento];
                  
                  return (
                    <TableRow key={movimiento.id}>
                      <TableCell>
                        {format(new Date(movimiento.fecha_movimiento), 'dd/MM/yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TipoIcon className="h-4 w-4" />
                          <Badge variant={tipoColores[movimiento.tipo_movimiento]}>
                            {tipoLabels[movimiento.tipo_movimiento]}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-mono font-medium">
                            {movimiento.activos_salas?.codigo}
                          </div>
                          <div className="text-muted-foreground">
                            {movimiento.activos_salas?.nombre}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {movimiento.sala_origen?.nombre && (
                            <div className="text-muted-foreground">
                              De: {movimiento.sala_origen.nombre}
                            </div>
                          )}
                          {movimiento.sala_destino?.nombre && (
                            <div className="font-medium">
                              {movimiento.tipo_movimiento === 'traslado' ? 'A:' : 'Sala:'} {movimiento.sala_destino.nombre}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={movimiento.motivo}>
                          {movimiento.motivo}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={movimiento.observaciones || ''}>
                          {movimiento.observaciones || '-'}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};