import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building, Lock, Clock, X } from "lucide-react";

interface Area {
  id: string;
  nombre: string;
}

interface Clasificacion {
  id: string;
  nombre: string;
  color: string;
}

interface Sala {
  id: string;
  nombre: string;
  descripcion?: string;
}

interface FormData {
  titulo: string;
  descripcion: string;
  observaciones: string;
  area_id: string;
  clasificacion_ids: string[]; // Cambiado a array para múltiples clasificaciones
  prioridad: string;
  reportado_por: string;
  sala_id: string;
  tiempo_minutos?: number;
}

interface IncidentFormFieldsProps {
  formData: FormData;
  areas?: Area[];
  clasificaciones?: Clasificacion[];
  salas?: Sala[];
  onInputChange: (field: string, value: string | number | string[]) => Promise<void> | void;
}

const IncidentFormFields = ({ formData, areas, clasificaciones, salas, onInputChange }: IncidentFormFieldsProps) => {
  const selectedArea = areas?.find(area => area.id === formData.area_id);
  const selectedClasificaciones = clasificaciones?.filter(c => formData.clasificacion_ids.includes(c.id)) || [];
  
  // Verificar si alguna clasificación requiere campo de tiempo
  const requiresTimeField = selectedClasificaciones.some(clasificacion => 
    clasificacion.nombre.toLowerCase().includes('tardio') ||
    clasificacion.nombre.toLowerCase().includes('tardío') ||
    clasificacion.nombre.toLowerCase().includes('prematuro') ||
    clasificacion.nombre.toLowerCase().includes('ingreso') ||
    clasificacion.nombre.toLowerCase().includes('cierre') ||
    (clasificacion.nombre.toLowerCase().includes('maquina') && 
     clasificacion.nombre.toLowerCase().includes('apagada'))
  );

  const handleClasificacionToggle = async (clasificacionId: string) => {
    const currentIds = formData.clasificacion_ids;
    const newIds = currentIds.includes(clasificacionId)
      ? currentIds.filter(id => id !== clasificacionId)
      : [...currentIds, clasificacionId];
    
    await onInputChange("clasificacion_ids", newIds);
  };

  const removeClasificacion = async (clasificacionId: string) => {
    const newIds = formData.clasificacion_ids.filter(id => id !== clasificacionId);
    await onInputChange("clasificacion_ids", newIds);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="space-y-2">
          <Label htmlFor="titulo">Título *</Label>
          <Input
            id="titulo"
            value={formData.titulo}
            onChange={(e) => onInputChange("titulo", e.target.value)}
            placeholder="Título descriptivo de la incidencia"
            required
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="reportado_por">Reportado por *</Label>
          <Input
            id="reportado_por"
            value={formData.reportado_por}
            onChange={(e) => onInputChange("reportado_por", e.target.value)}
            placeholder="Nombre del reportante"
            required
            className="bg-blue-50 border-blue-200 w-full"
            disabled
          />
          <p className="text-xs text-blue-600">Capturado automáticamente del usuario logueado</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="space-y-2">
          <Label htmlFor="sala" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Sucursal *
          </Label>
          <Select value={formData.sala_id} onValueChange={(value) => onInputChange("sala_id", value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona una sucursal" />
            </SelectTrigger>
            <SelectContent>
              {salas?.map((sala) => (
                <SelectItem key={sala.id} value={sala.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{sala.nombre}</span>
                    {sala.descripcion && (
                      <span className="text-xs text-gray-500">{sala.descripcion}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="area" className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Área (Auto-seleccionada)
          </Label>
          <div className="relative">
            <Input
              id="area"
              value={selectedArea?.nombre || "Selecciona tipo de incidencia primero"}
              className="bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed w-full"
              disabled
              readOnly
            />
            <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <p className="text-xs text-gray-500">Campo de solo lectura - Se asigna automáticamente según tipo de incidencia</p>
        </div>
      </div>

      {/* Selector múltiple de clasificaciones */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Tipos de Incidencia * (Puedes seleccionar múltiples)</Label>
          <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {clasificaciones?.map((clasificacion) => (
                <div key={clasificacion.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`clasificacion-${clasificacion.id}`}
                    checked={formData.clasificacion_ids.includes(clasificacion.id)}
                    onCheckedChange={() => handleClasificacionToggle(clasificacion.id)}
                  />
                  <Label 
                    htmlFor={`clasificacion-${clasificacion.id}`} 
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: clasificacion.color || '#6B7280' }}
                    />
                    {clasificacion.nombre}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-orange-600">El sistema seleccionará automáticamente el área correspondiente</p>
        </div>

        {/* Mostrar clasificaciones seleccionadas */}
        {formData.clasificacion_ids.length > 0 && (
          <div className="space-y-2">
            <Label>Tipos Seleccionados:</Label>
            <div className="flex flex-wrap gap-2">
              {selectedClasificaciones.map((clasificacion) => (
                <Badge 
                  key={clasificacion.id} 
                  variant="secondary" 
                  className="flex items-center gap-2"
                >
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: clasificacion.color || '#6B7280' }}
                  />
                  {clasificacion.nombre}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => removeClasificacion(clasificacion.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="prioridad">Prioridad (Auto-sugerida)</Label>
        <Select value={formData.prioridad} onValueChange={(value) => onInputChange("prioridad", value)}>
          <SelectTrigger className="bg-purple-50 border-purple-200 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="baja">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                Baja
              </div>
            </SelectItem>
            <SelectItem value="media">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                Media
              </div>
            </SelectItem>
            <SelectItem value="alta">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                Alta
              </div>
            </SelectItem>
            <SelectItem value="critica">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                Crítica
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-purple-600">Sugerida automáticamente según tipo de incidencia</p>
      </div>

      {/* Campo de tiempo condicional */}
      {requiresTimeField && (
        <div className="space-y-2 bg-yellow-50 p-3 sm:p-4 rounded-lg border border-yellow-200">
          <Label htmlFor="tiempo_minutos" className="flex items-center gap-2 text-orange-700">
            <Clock className="w-4 h-4" />
            {selectedClasificaciones.some(c => c.nombre.toLowerCase().includes('maquina') && c.nombre.toLowerCase().includes('apagada'))
              ? 'Número de Máquinas Apagadas *'
              : 'Tiempo en Minutos *'
            }
          </Label>
          <Input
            id="tiempo_minutos"
            type="number"
            min="1"
            value={formData.tiempo_minutos || ''}
            onChange={(e) => onInputChange("tiempo_minutos", parseInt(e.target.value) || 0)}
            placeholder={selectedClasificaciones.some(c => c.nombre.toLowerCase().includes('maquina') && c.nombre.toLowerCase().includes('apagada'))
              ? 'Ej: 5 máquinas'
              : 'Ingresa el tiempo en minutos'
            }
            className="bg-white border-yellow-300 w-full max-w-xs"
            required={requiresTimeField}
          />
          <p className="text-xs text-orange-600">
            {selectedClasificaciones.some(c => c.nombre.toLowerCase().includes('maquina') && c.nombre.toLowerCase().includes('apagada'))
              ? 'Indique cuántas máquinas están apagadas'
              : 'Este campo es requerido para incidencias de ingresos tardíos o cierres prematuros'
            }
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripción *</Label>
        <Textarea
          id="descripcion"
          value={formData.descripcion}
          onChange={(e) => onInputChange("descripcion", e.target.value)}
          placeholder="Describe detalladamente la incidencia"
          rows={4}
          required
          className="w-full resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observaciones">Observaciones</Label>
        <Textarea
          id="observaciones"
          value={formData.observaciones}
          onChange={(e) => onInputChange("observaciones", e.target.value)}
          placeholder="Observaciones adicionales (opcional)"
          rows={3}
          className="w-full resize-none"
        />
      </div>
    </div>
  );
};

export default IncidentFormFields;