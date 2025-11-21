import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { FiltrosActivos } from '@/hooks/useMovimientoActivos';

interface ActivosFiltersProps {
  onFilterChange: (filtros: FiltrosActivos) => void;
  onClearFilters: () => void;
}

const tiposActivo = [
  { value: 'camara', label: 'Cámara' },
  { value: 'dvr', label: 'DVR' },
  { value: 'fuente_poder', label: 'Fuente de Poder' },
  { value: 'ups', label: 'UPS' },
  { value: 'otro', label: 'Otro' },
];

const estadosActivo = [
  { value: 'activo', label: 'Activo' },
  { value: 'inactivo', label: 'Inactivo' },
  { value: 'dado_baja', label: 'Dado de Baja' },
  { value: 'en_mantenimiento', label: 'En Mantenimiento' },
];

export const ActivosFilters = ({ onFilterChange, onClearFilters }: ActivosFiltersProps) => {
  const [salas, setSalas] = useState<{ id: string; nombre: string }[]>([]);
  const [fechaDesde, setFechaDesde] = useState<Date>();
  const [fechaHasta, setFechaHasta] = useState<Date>();
  const [filtros, setFiltros] = useState<FiltrosActivos>({});

  useEffect(() => {
    const cargarSalas = async () => {
      const { data } = await supabase
        .from('salas')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');
      
      if (data) setSalas(data);
    };

    cargarSalas();
  }, []);

  const handleFiltroChange = (key: keyof FiltrosActivos, value: string | undefined) => {
    // Convert "all" values back to undefined for filtering
    const filteredValue = value === 'all' ? undefined : value;
    const nuevosFiltros = { ...filtros, [key]: filteredValue || undefined };
    setFiltros(nuevosFiltros);
  };

  const handleFechaChange = (tipo: 'desde' | 'hasta', fecha: Date | undefined) => {
    if (tipo === 'desde') {
      setFechaDesde(fecha);
      handleFiltroChange('fecha_desde', fecha ? format(fecha, 'yyyy-MM-dd') : undefined);
    } else {
      setFechaHasta(fecha);
      handleFiltroChange('fecha_hasta', fecha ? format(fecha, 'yyyy-MM-dd') : undefined);
    }
  };

  const aplicarFiltros = () => {
    onFilterChange(filtros);
  };

  const limpiarFiltros = () => {
    setFiltros({});
    setFechaDesde(undefined);
    setFechaHasta(undefined);
    onClearFilters();
  };

  const hayFiltrosActivos = Object.values(filtros).some(value => value !== undefined && value !== '');

  return (
    <div className="bg-muted/30 p-4 rounded-lg space-y-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4" />
        <h3 className="text-sm font-medium">Filtros de Búsqueda</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Código */}
        <div className="space-y-2">
          <Label htmlFor="filter-codigo">Código</Label>
          <Input
            id="filter-codigo"
            placeholder="TR..."
            value={filtros.codigo || ''}
            onChange={(e) => handleFiltroChange('codigo', e.target.value)}
          />
        </div>

        {/* Tipo de Activo */}
        <div className="space-y-2">
          <Label>Tipo de Activo</Label>
          <Select
            value={filtros.tipo_activo || 'all'}
            onValueChange={(value) => handleFiltroChange('tipo_activo', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {tiposActivo.map((tipo) => (
                <SelectItem key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sala */}
        <div className="space-y-2">
          <Label>Sala</Label>
          <Select
            value={filtros.sala_id || 'all'}
            onValueChange={(value) => handleFiltroChange('sala_id', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas las salas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las salas</SelectItem>
              {salas.map((sala) => (
                <SelectItem key={sala.id} value={sala.id}>
                  {sala.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Estado */}
        <div className="space-y-2">
          <Label>Estado</Label>
          <Select
            value={filtros.estado || 'all'}
            onValueChange={(value) => handleFiltroChange('estado', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {estadosActivo.map((estado) => (
                <SelectItem key={estado.value} value={estado.value}>
                  {estado.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fecha Desde */}
        <div className="space-y-2">
          <Label>Fecha Desde</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !fechaDesde && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fechaDesde ? format(fechaDesde, "dd/MM/yyyy", { locale: es }) : "Fecha inicial"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fechaDesde}
                onSelect={(date) => handleFechaChange('desde', date)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Fecha Hasta */}
        <div className="space-y-2">
          <Label>Fecha Hasta</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !fechaHasta && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fechaHasta ? format(fechaHasta, "dd/MM/yyyy", { locale: es }) : "Fecha final"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fechaHasta}
                onSelect={(date) => handleFechaChange('hasta', date)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={aplicarFiltros} size="sm">
          Aplicar Filtros
        </Button>
        {hayFiltrosActivos && (
          <Button onClick={limpiarFiltros} variant="outline" size="sm">
            <X className="h-4 w-4 mr-1" />
            Limpiar Filtros
          </Button>
        )}
      </div>
    </div>
  );
};