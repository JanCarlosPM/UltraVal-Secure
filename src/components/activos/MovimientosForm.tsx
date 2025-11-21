import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useMovimientoActivos, type CrearMovimientoData, type Activo } from '@/hooks/useMovimientoActivos';

interface MovimientosFormProps {
  activo?: Activo;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const tiposMovimiento = [
  { value: 'asignacion', label: 'Asignación' },
  { value: 'baja', label: 'Baja' },
  { value: 'traslado', label: 'Traslado' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
];

export const MovimientosForm = ({ activo, onSuccess, onCancel }: MovimientosFormProps) => {
  const { registrarMovimiento, isRegistering, activos } = useMovimientoActivos();
  
  const [salas, setSalas] = useState<{ id: string; nombre: string }[]>([]);
  const [fechaMovimiento, setFechaMovimiento] = useState<Date>(new Date());
  const [formData, setFormData] = useState<CrearMovimientoData>({
    activo_id: activo?.id || '',
    tipo_movimiento: 'asignacion',
    sala_origen_id: '',
    sala_destino_id: '',
    fecha_movimiento: format(new Date(), 'yyyy-MM-dd'),
    motivo: '',
    observaciones: '',
  });

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

  useEffect(() => {
    if (activo) {
      setFormData(prev => ({
        ...prev,
        activo_id: activo.id,
        sala_origen_id: activo.sala_id,
      }));
    }
  }, [activo]);

  const handleFechaChange = (fecha: Date | undefined) => {
    if (fecha) {
      setFechaMovimiento(fecha);
      setFormData(prev => ({
        ...prev,
        fecha_movimiento: format(fecha, 'yyyy-MM-dd')
      }));
    }
  };

  const handleTipoChange = (tipo: string) => {
    setFormData(prev => ({
      ...prev,
      tipo_movimiento: tipo as any,
      // Limpiar campos según el tipo
      sala_destino_id: tipo === 'baja' ? '' : prev.sala_destino_id,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await registrarMovimiento(formData);
      onSuccess?.();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const activoSeleccionado = activos.find(a => a.id === formData.activo_id);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Registrar Movimiento de Activo</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Activo */}
          <div className="space-y-2">
            <Label>Activo *</Label>
            <Select
              value={formData.activo_id}
              onValueChange={(value) => {
                const activoSel = activos.find(a => a.id === value);
                setFormData(prev => ({
                  ...prev,
                  activo_id: value,
                  sala_origen_id: activoSel?.sala_id || '',
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar activo" />
              </SelectTrigger>
              <SelectContent>
                {activos
                  .filter(a => a.estado === 'activo')
                  .map((activo) => (
                  <SelectItem key={activo.id} value={activo.id}>
                    {activo.codigo} - {activo.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activoSeleccionado && (
              <div className="text-sm text-muted-foreground">
                Sala actual: {activoSeleccionado.salas?.nombre}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tipo de Movimiento */}
            <div className="space-y-2">
              <Label>Tipo de Movimiento *</Label>
              <Select
                value={formData.tipo_movimiento}
                onValueChange={handleTipoChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposMovimiento.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fecha de Movimiento */}
            <div className="space-y-2">
              <Label>Fecha de Movimiento *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !fechaMovimiento && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fechaMovimiento 
                      ? format(fechaMovimiento, "PPP", { locale: es }) 
                      : "Seleccionar fecha"
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fechaMovimiento}
                    onSelect={handleFechaChange}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Sala Origen (solo para traslado) */}
            {formData.tipo_movimiento === 'traslado' && (
              <div className="space-y-2">
                <Label>Sala Origen</Label>
                <Select
                  value={formData.sala_origen_id || undefined}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, sala_origen_id: value || undefined }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sala actual" />
                  </SelectTrigger>
                  <SelectContent>
                    {salas.map((sala) => (
                      <SelectItem key={sala.id} value={sala.id}>
                        {sala.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Sala Destino (para asignación y traslado) */}
            {(formData.tipo_movimiento === 'asignacion' || formData.tipo_movimiento === 'traslado') && (
              <div className="space-y-2">
                <Label>
                  {formData.tipo_movimiento === 'traslado' ? 'Sala Destino *' : 'Sala Asignada *'}
                </Label>
                <Select
                  value={formData.sala_destino_id || undefined}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, sala_destino_id: value || undefined }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sala" />
                  </SelectTrigger>
                  <SelectContent>
                    {salas
                      .filter(sala => sala.id !== formData.sala_origen_id)
                      .map((sala) => (
                      <SelectItem key={sala.id} value={sala.id}>
                        {sala.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo *</Label>
            <Textarea
              id="motivo"
              value={formData.motivo}
              onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
              placeholder="Describe el motivo del movimiento..."
              rows={3}
              required
            />
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              value={formData.observaciones}
              onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
              placeholder="Observaciones adicionales..."
              rows={3}
            />
          </div>

          <div className="flex gap-4">
            <Button 
              type="submit" 
              disabled={isRegistering}
              className="flex-1"
            >
              Registrar Movimiento
            </Button>
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                className="flex-1"
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};