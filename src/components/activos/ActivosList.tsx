import { useState } from 'react';
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
import { 
  Edit, 
  FileDown, 
  Plus, 
  Camera, 
  HardDrive, 
  Zap, 
  Battery, 
  Package 
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Activo, FiltrosActivos } from '@/hooks/useMovimientoActivos';
import * as XLSX from 'xlsx';

interface ActivosListProps {
  activos: Activo[];
  onEdit: (activo: Activo) => void;
  onNew: () => void;
  filtros?: FiltrosActivos;
}

const tipoIconos = {
  camara: Camera,
  dvr: HardDrive,
  fuente_poder: Zap,
  ups: Battery,
  otro: Package,
};

const estadoColores = {
  activo: 'default',
  inactivo: 'secondary',
  dado_baja: 'destructive',
  en_mantenimiento: 'outline',
} as const;

const tipoLabels = {
  camara: 'Cámara',
  dvr: 'DVR',
  fuente_poder: 'Fuente de Poder',
  ups: 'UPS',
  otro: 'Otro',
};

const estadoLabels = {
  activo: 'Activo',
  inactivo: 'Inactivo',
  dado_baja: 'Dado de Baja',
  en_mantenimiento: 'En Mantenimiento',
};

export const ActivosList = ({ activos, onEdit, onNew, filtros }: ActivosListProps) => {
  const exportarExcel = () => {
    const datosExcel = activos.map(activo => ({
      'Código': activo.codigo,
      'Nombre': activo.nombre,
      'Tipo': tipoLabels[activo.tipo_activo],
      'Marca': activo.marca || '',
      'Modelo': activo.modelo || '',
      'Número de Serie': activo.numero_serie || '',
      'Sala': activo.salas?.nombre || '',
      'Estado': estadoLabels[activo.estado],
      'Fecha Asignación': format(new Date(activo.fecha_asignacion), 'dd/MM/yyyy'),
      'Valor Compra': activo.valor_compra || '',
      'Proveedor': activo.proveedor || '',
      'Garantía (meses)': activo.garantia_meses || '',
      'Observaciones': activo.observaciones || '',
    }));

    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Activos');
    
    const fecha = format(new Date(), 'yyyy-MM-dd');
    XLSX.writeFile(wb, `activos-${fecha}.xlsx`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Lista de Activos ({activos.length})</CardTitle>
          <div className="flex gap-2">
            <Button onClick={exportarExcel} variant="outline" size="sm">
              <FileDown className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
            <Button onClick={onNew} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Activo
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Marca/Modelo</TableHead>
                <TableHead>Sala</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Asignación</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No se encontraron activos
                  </TableCell>
                </TableRow>
              ) : (
                activos.map((activo) => {
                  const TipoIcon = tipoIconos[activo.tipo_activo] || Package;
                  
                  return (
                    <TableRow key={activo.id}>
                      <TableCell className="font-mono font-medium">
                        {activo.codigo}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TipoIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{activo.nombre}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {tipoLabels[activo.tipo_activo]}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {activo.marca && <div className="font-medium">{activo.marca}</div>}
                          {activo.modelo && <div className="text-muted-foreground">{activo.modelo}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {activo.salas?.nombre}
                      </TableCell>
                      <TableCell>
                        <Badge variant={estadoColores[activo.estado]}>
                          {estadoLabels[activo.estado]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(activo.fecha_asignacion), 'dd/MM/yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => onEdit(activo)}
                          variant="ghost"
                          size="sm"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
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