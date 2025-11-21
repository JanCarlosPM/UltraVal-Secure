import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Search, RotateCcw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface ReportFiltersProps {
  areas: any[];
  clasificaciones: any[];
  onFiltersChange: (filters: any) => void;
}

const ReportFilters = ({ areas, clasificaciones, onFiltersChange }: ReportFiltersProps) => {
  const [filtros, setFiltros] = useState({
    fechaInicio: null as Date | null,
    fechaFin: null as Date | null,
    area_id: "",
    clasificacion_id: "",
    prioridad: "",
    buscarTexto: ""
  });

  const [mostrarFechaInicio, setMostrarFechaInicio] = useState(false);
  const [mostrarFechaFin, setMostrarFechaFin] = useState(false);

  const handleFiltroChange = (campo: string, valor: any) => {
    const nuevosFiltros = { ...filtros, [campo]: valor };
    setFiltros(nuevosFiltros);
    aplicarFiltros(nuevosFiltros);
  };

  const aplicarFiltros = (filtrosActuales: any) => {
    const filtrosFormateados: any = {};

    // Filtro de texto
    if (filtrosActuales.buscarTexto?.trim()) {
      filtrosFormateados.buscarTexto = filtrosActuales.buscarTexto.trim();
    }

    // Filtros de selección
    if (filtrosActuales.area_id) {
      filtrosFormateados.area_id = filtrosActuales.area_id;
    }

    if (filtrosActuales.clasificacion_id) {
      filtrosFormateados.clasificacion_id = filtrosActuales.clasificacion_id;
    }

    if (filtrosActuales.prioridad) {
      filtrosFormateados.prioridad = filtrosActuales.prioridad;
    }

    // Filtros de fecha - convertir a ISO string con zona horaria
    if (filtrosActuales.fechaInicio) {
      filtrosFormateados.fechaInicio = startOfDay(filtrosActuales.fechaInicio).toISOString();
    }

    if (filtrosActuales.fechaFin) {
      filtrosFormateados.fechaFin = endOfDay(filtrosActuales.fechaFin).toISOString();
    }

    console.log("Aplicando filtros:", filtrosFormateados);
    onFiltersChange(filtrosFormateados);
  };

  const limpiarFiltros = () => {
    const filtrosLimpios = {
      fechaInicio: null,
      fechaFin: null,
      area_id: "",
      clasificacion_id: "",
      prioridad: "",
      buscarTexto: ""
    };
    setFiltros(filtrosLimpios);
    onFiltersChange({});
  };

  // Preparar datos para los selects con búsqueda
  const areasItems = areas?.map(area => ({
    value: area.id,
    label: area.nombre
  })) || [];

  const clasificacionesItems = clasificaciones?.map(clasificacion => ({
    value: clasificacion.id,
    label: clasificacion.nombre,
    color: clasificacion.color
  })) || [];

  const prioridadItems = [
    { value: "baja", label: "Baja" },
    { value: "media", label: "Media" },
    { value: "alta", label: "Alta" },
    { value: "critica", label: "Crítica" }
  ];

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <Search className="h-5 w-5 text-gray-500" />
        <h3 className="text-lg font-semibold">Filtros de Búsqueda</h3>
      </div>

      {/* Filtro de texto */}
      <div className="space-y-2">
        <Label htmlFor="buscar">Buscar en título o descripción</Label>
        <Input
          id="buscar"
          placeholder="Buscar en incidencias..."
          value={filtros.buscarTexto}
          onChange={(e) => handleFiltroChange("buscarTexto", e.target.value)}
        />
      </div>

      {/* Filtros de fecha */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Fecha inicio</Label>
          <Popover open={mostrarFechaInicio} onOpenChange={setMostrarFechaInicio}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filtros.fechaInicio ? (
                  format(filtros.fechaInicio, "dd/MM/yyyy", { locale: es })
                ) : (
                  "Seleccionar fecha"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filtros.fechaInicio || undefined}
                onSelect={(fecha) => {
                  handleFiltroChange("fechaInicio", fecha);
                  setMostrarFechaInicio(false);
                }}
                locale={es}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Fecha fin</Label>
          <Popover open={mostrarFechaFin} onOpenChange={setMostrarFechaFin}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filtros.fechaFin ? (
                  format(filtros.fechaFin, "dd/MM/yyyy", { locale: es })
                ) : (
                  "Seleccionar fecha"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filtros.fechaFin || undefined}
                onSelect={(fecha) => {
                  handleFiltroChange("fechaFin", fecha);
                  setMostrarFechaFin(false);
                }}
                locale={es}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Filtros de selección con búsqueda */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Área</Label>
          <SearchableSelect
            value={filtros.area_id}
            onValueChange={(value) => handleFiltroChange("area_id", value)}
            placeholder="Todas las áreas"
            emptyText="No se encontraron áreas"
            items={areasItems}
          />
        </div>

        <div className="space-y-2">
          <Label>Clasificación</Label>
          <SearchableSelect
            value={filtros.clasificacion_id}
            onValueChange={(value) => handleFiltroChange("clasificacion_id", value)}
            placeholder="Todas las clasificaciones"
            emptyText="No se encontraron clasificaciones"
            items={clasificacionesItems}
          />
        </div>

        <div className="space-y-2">
          <Label>Prioridad</Label>
          <SearchableSelect
            value={filtros.prioridad}
            onValueChange={(value) => handleFiltroChange("prioridad", value)}
            placeholder="Todas las prioridades"
            emptyText="No se encontraron prioridades"
            items={prioridadItems}
          />
        </div>
      </div>

      {/* Botón para limpiar filtros */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={limpiarFiltros} className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          Limpiar filtros
        </Button>
      </div>
    </div>
  );
};

export default ReportFilters;
