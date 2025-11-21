import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useMovimientoActivos, type CrearActivoData, type Activo } from '@/hooks/useMovimientoActivos';

interface ActivosFormProps {
  activo?: Activo;
  onSuccess?: () => void;
  onCancel?: () => void;
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

export const ActivosForm = ({ activo, onSuccess, onCancel }: ActivosFormProps) => {
  const { crearActivo, actualizarActivo, isCreating, isUpdating, generarCodigoAutomatico, validarCodigoUnico } = useMovimientoActivos();
  
  const [salas, setSalas] = useState<{ id: string; nombre: string }[]>([]);
  const [fechaCompra, setFechaCompra] = useState<Date>();
  const [codigoError, setCodigoError] = useState<string>('');
  const [formData, setFormData] = useState<CrearActivoData & { estado?: string; fecha_baja?: string }>({
    codigo: '',
    nombre: '',
    descripcion: '',
    tipo_activo: 'camara',
    marca: '',
    modelo: '',
    numero_serie: '',
    sala_id: '',
    valor_compra: undefined,
    fecha_compra: '',
    garantia_meses: undefined,
    proveedor: '',
    observaciones: '',
    estado: 'activo',
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
      setFormData({
        codigo: activo.codigo,
        nombre: activo.nombre,
        descripcion: activo.descripcion || '',
        tipo_activo: activo.tipo_activo,
        marca: activo.marca || '',
        modelo: activo.modelo || '',
        numero_serie: activo.numero_serie || '',
        sala_id: activo.sala_id,
        valor_compra: activo.valor_compra,
        fecha_compra: activo.fecha_compra || '',
        garantia_meses: activo.garantia_meses,
        proveedor: activo.proveedor || '',
        observaciones: activo.observaciones || '',
        estado: activo.estado,
        fecha_baja: activo.fecha_baja || '',
      });

      if (activo.fecha_compra) {
        setFechaCompra(new Date(activo.fecha_compra));
      }
    }
  }, [activo]);

  const handleGenerarCodigo = async () => {
    try {
      const nuevoCodigo = await generarCodigoAutomatico();
      setFormData({ ...formData, codigo: nuevoCodigo });
      setCodigoError('');
    } catch (error) {
      console.error('Error al generar código:', error);
    }
  };

  const validateCodigo = async (codigo: string) => {
    if (!codigo.startsWith('TR')) {
      setCodigoError('El código debe iniciar con TR');
      return false;
    }

    try {
      await validarCodigoUnico(codigo, activo?.id);
      setCodigoError('');
      return true;
    } catch (error: any) {
      setCodigoError(error.message);
      return false;
    }
  };

  const handleCodigoChange = (codigo: string) => {
    setFormData({ ...formData, codigo });
    if (codigo) {
      validateCodigo(codigo);
    } else {
      setCodigoError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (codigoError) return;

    const isCodigoValid = await validateCodigo(formData.codigo);
    if (!isCodigoValid) return;

    try {
      const dataToSubmit = {
        ...formData,
        fecha_compra: fechaCompra ? format(fechaCompra, 'yyyy-MM-dd') : undefined,
      };

      if (activo) {
        await actualizarActivo({ 
          id: activo.id, 
          datos: {
            ...dataToSubmit,
            estado: formData.estado as any,
            fecha_baja: formData.fecha_baja,
          }
        });
      } else {
        await crearActivo(dataToSubmit);
      }
      
      onSuccess?.();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {activo ? 'Editar Activo' : 'Registrar Nuevo Activo'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Código */}
            <div className="space-y-2">
              <Label htmlFor="codigo">Código del Activo *</Label>
              <div className="flex gap-2">
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => handleCodigoChange(e.target.value)}
                  placeholder="TR000001"
                  required
                  className={codigoError ? 'border-destructive' : ''}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleGenerarCodigo}
                  disabled={isCreating || isUpdating}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              {codigoError && (
                <p className="text-sm text-destructive">{codigoError}</p>
              )}
            </div>

            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del Activo *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </div>

            {/* Tipo de Activo */}
            <div className="space-y-2">
              <Label>Tipo de Activo *</Label>
              <Select
                value={formData.tipo_activo}
                onValueChange={(value) => setFormData({ ...formData, tipo_activo: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
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
              <Label>Sala Asignada *</Label>
              <Select
                value={formData.sala_id}
                onValueChange={(value) => setFormData({ ...formData, sala_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sala" />
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

            {/* Estado (solo en edición) *
            {activo && (
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(value) => setFormData({ ...formData, estado: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {estadosActivo.map((estado) => (
                      <SelectItem key={estado.value} value={estado.value}>
                        {estado.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Marca *
            <div className="space-y-2">
              <Label htmlFor="marca">Marca</Label>
              <Input
                id="marca"
                value={formData.marca}
                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
              />
            </div>

            {/* Modelo *
            <div className="space-y-2">
              <Label htmlFor="modelo">Modelo</Label>
              <Input
                id="modelo"
                value={formData.modelo}
                onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
              />
            </div>

            {/* Número de Serie *
            <div className="space-y-2">
              <Label htmlFor="numero_serie">Número de Serie</Label>
              <Input
                id="numero_serie"
                value={formData.numero_serie}
                onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
              />
            </div>

            {/* Valor de Compra *
            <div className="space-y-2">
              <Label htmlFor="valor_compra">Valor de Compra</Label>
              <Input
                id="valor_compra"
                type="number"
                step="0.01"
                value={formData.valor_compra || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  valor_compra: e.target.value ? parseFloat(e.target.value) : undefined 
                })}
              />
            </div>

            {/* Fecha de Compra *
            <div className="space-y-2">
              <Label>Fecha de Compra</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !fechaCompra && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fechaCompra ? format(fechaCompra, "PPP", { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fechaCompra}
                    onSelect={setFechaCompra}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Garantía en Meses *
            <div className="space-y-2">
              <Label htmlFor="garantia_meses">Garantía (meses)</Label>
              <Input
                id="garantia_meses"
                type="number"
                value={formData.garantia_meses || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  garantia_meses: e.target.value ? parseInt(e.target.value) : undefined 
                })}
              />
            </div>

            {/* Proveedor *
            <div className="space-y-2">
              <Label htmlFor="proveedor">Proveedor</Label>
              <Input
                id="proveedor"
                value={formData.proveedor}
                onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
              />
            </div>*/}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={3}
            />
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex gap-4">
            <Button 
              type="submit" 
              disabled={isCreating || isUpdating || !!codigoError}
              className="flex-1"
            >
              {activo ? 'Actualizar Activo' : 'Registrar Activo'}
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