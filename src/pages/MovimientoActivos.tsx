import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Package } from 'lucide-react';
import { ActivosList } from '@/components/activos/ActivosList';
import { ActivosForm } from '@/components/activos/ActivosForm';
import { ActivosFilters } from '@/components/activos/ActivosFilters';
import { MovimientosList } from '@/components/activos/MovimientosList';
import { MovimientosForm } from '@/components/activos/MovimientosForm';
import { useMovimientoActivos, type Activo, type FiltrosActivos } from '@/hooks/useMovimientoActivos';

export default function MovimientoActivos() {
  const { 
    activos, 
    movimientos, 
    isLoading, 
    obtenerActivosFiltrados 
  } = useMovimientoActivos();

  const [activosFiltrados, setActivosFiltrados] = useState<Activo[]>([]);
  const [mostrandoFiltros, setMostrandoFiltros] = useState(false);
  const [dialogoActivo, setDialogoActivo] = useState(false);
  const [dialogoMovimiento, setDialogoMovimiento] = useState(false);
  const [activoSeleccionado, setActivoSeleccionado] = useState<Activo | undefined>();
  const [tabActiva, setTabActiva] = useState('activos');

  const manejarFiltros = async (filtros: FiltrosActivos) => {
    try {
      const resultados = await obtenerActivosFiltrados(filtros);
      setActivosFiltrados(resultados);
      setMostrandoFiltros(true);
    } catch (error) {
      console.error('Error al filtrar activos:', error);
    }
  };

  const limpiarFiltros = () => {
    setActivosFiltrados([]);
    setMostrandoFiltros(false);
  };

  const abrirFormularioActivo = (activo?: Activo) => {
    setActivoSeleccionado(activo);
    setDialogoActivo(true);
  };

  const cerrarDialogoActivo = () => {
    setDialogoActivo(false);
    setActivoSeleccionado(undefined);
  };

  const abrirFormularioMovimiento = (activo?: Activo) => {
    setActivoSeleccionado(activo);
    setDialogoMovimiento(true);
  };

  const cerrarDialogoMovimiento = () => {
    setDialogoMovimiento(false);
    setActivoSeleccionado(undefined);
  };

  const activosParaMostrar = mostrandoFiltros ? activosFiltrados : activos;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Cargando activos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Movimiento de Activos</h1>
          <p className="text-muted-foreground mt-1">
            Gestión y seguimiento de activos por sala
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => abrirFormularioMovimiento()} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Movimiento
          </Button>
          <Button onClick={() => abrirFormularioActivo()}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Activo
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tabActiva} onValueChange={setTabActiva} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="activos">Gestión de Activos</TabsTrigger>
          <TabsTrigger value="movimientos">Historial de Movimientos</TabsTrigger>
        </TabsList>

        <TabsContent value="activos" className="space-y-6">
          {/* Filtros */}
          <ActivosFilters 
            onFilterChange={manejarFiltros}
            onClearFilters={limpiarFiltros}
          />

          {/* Lista de Activos */}
          <ActivosList
            activos={activosParaMostrar}
            onEdit={abrirFormularioActivo}
            onNew={() => abrirFormularioActivo()}
          />
        </TabsContent>

        <TabsContent value="movimientos">
          <MovimientosList movimientos={movimientos} />
        </TabsContent>
      </Tabs>

      {/* Dialog para Activos */}
      <Dialog open={dialogoActivo} onOpenChange={setDialogoActivo}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {activoSeleccionado ? 'Editar Activo' : 'Nuevo Activo'}
            </DialogTitle>
          </DialogHeader>
          <ActivosForm
            activo={activoSeleccionado}
            onSuccess={cerrarDialogoActivo}
            onCancel={cerrarDialogoActivo}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para Movimientos */}
      <Dialog open={dialogoMovimiento} onOpenChange={setDialogoMovimiento}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Movimiento</DialogTitle>
          </DialogHeader>
          <MovimientosForm
            activo={activoSeleccionado}
            onSuccess={cerrarDialogoMovimiento}
            onCancel={cerrarDialogoMovimiento}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}