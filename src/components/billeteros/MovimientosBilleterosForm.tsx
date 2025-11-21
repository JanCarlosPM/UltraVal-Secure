import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CrearMovimientoBilleteroData, useBilleteros, Billetero } from "@/hooks/useBilleteros";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface MovimientosBilleterosFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billetero: Billetero;
}

export const MovimientosBilleterosForm = ({ open, onOpenChange, billetero }: MovimientosBilleterosFormProps) => {
  const { registrarMovimiento } = useBilleteros();
  
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<Partial<CrearMovimientoBilleteroData>>({
    defaultValues: {
      billetero_id: billetero.id,
    }
  });

  const tipoMovimiento = watch('tipo_movimiento');
  const puedeAsignar = billetero.estado === 'en_stock';

  const { data: salas = [] } = useQuery({
    queryKey: ['salas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salas')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');
      
      if (error) throw error;
      return data;
    },
  });

  const onSubmit = async (data: Partial<CrearMovimientoBilleteroData>) => {
    if (!data.tipo_movimiento || !data.motivo) return;

    try {
      await registrarMovimiento.mutateAsync({
        billetero_id: billetero.id,
        tipo_movimiento: data.tipo_movimiento,
        sala_destino_id: data.sala_destino_id,
        numero_maquina_nuevo: data.numero_maquina_nuevo,
        motivo: data.motivo,
        observaciones: data.observaciones,
      });
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error al registrar movimiento:', error);
    }
  };

  const requiereSala = tipoMovimiento === 'asignacion';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Movimiento - {billetero.codigo}</DialogTitle>
        </DialogHeader>

        {!puedeAsignar && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Este billetero está en estado "{billetero.estado}". Solo los billeteros "En Stock" pueden ser asignados a una sala.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><strong>Código:</strong> {billetero.codigo}</div>
              <div><strong>Serial:</strong> {billetero.serial || '-'}</div>
              <div><strong>Tipo:</strong> {billetero.tipo}</div>
              <div><strong>Estado Actual:</strong> {billetero.estado}</div>
              <div><strong>Sala Actual:</strong> {billetero.salas?.nombre || 'Sin asignar'}</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo_movimiento">
              Tipo de Movimiento <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={tipoMovimiento} 
              onValueChange={(value) => setValue('tipo_movimiento', value as any)}
            >
              <SelectTrigger className={errors.tipo_movimiento ? 'border-red-500' : ''}>
                <SelectValue placeholder="Seleccionar tipo de movimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asignacion" disabled={!puedeAsignar}>
                  Asignación a Sala {!puedeAsignar && '(Solo para billeteros en stock)'}
                </SelectItem>
                <SelectItem value="cambio_estado">Cambio de Estado</SelectItem>
                <SelectItem value="transferencia">Transferencia entre Salas</SelectItem>
                <SelectItem value="baja">Dar de Baja</SelectItem>
              </SelectContent>
            </Select>
            {errors.tipo_movimiento && (
              <p className="text-sm text-red-500">Debe seleccionar un tipo de movimiento</p>
            )}
          </div>

          {requiereSala && (
            <>
              <div className="space-y-2">
                <Label htmlFor="sala_destino_id">
                  Sala Destino <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={watch('sala_destino_id')} 
                  onValueChange={(value) => setValue('sala_destino_id', value)}
                >
                  <SelectTrigger className={errors.sala_destino_id ? 'border-red-500' : ''}>
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
                {errors.sala_destino_id && (
                  <p className="text-sm text-red-500">Debe seleccionar una sala</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero_maquina_nuevo">
                  Número de Máquina <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="numero_maquina_nuevo"
                  {...register('numero_maquina_nuevo', { 
                    required: requiereSala ? 'El número de máquina es requerido' : false 
                  })}
                  placeholder="Ej: 001, A-15, etc."
                  className={errors.numero_maquina_nuevo ? 'border-red-500' : ''}
                />
                {errors.numero_maquina_nuevo && (
                  <p className="text-sm text-red-500">{errors.numero_maquina_nuevo.message}</p>
                )}
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="motivo">
              Motivo <span className="text-red-500">*</span>
              {tipoMovimiento === 'baja' && (
                <span className="text-red-500 ml-2 font-semibold">
                  (Detalle obligatorio para dar de baja)
                </span>
              )}
            </Label>
            <Textarea
              id="motivo"
              {...register('motivo', { 
                required: 'El motivo es requerido',
                minLength: {
                  value: tipoMovimiento === 'baja' ? 20 : 5,
                  message: tipoMovimiento === 'baja' 
                    ? 'Para dar de baja, el motivo debe tener al menos 20 caracteres' 
                    : 'El motivo debe tener al menos 5 caracteres'
                }
              })}
              placeholder={
                tipoMovimiento === 'baja'
                  ? "Describa detalladamente el motivo de la baja del billetero (mínimo 20 caracteres)..."
                  : "Describa el motivo del movimiento..."
              }
              rows={tipoMovimiento === 'baja' ? 5 : 3}
              className={errors.motivo ? 'border-red-500' : ''}
            />
            {errors.motivo && (
              <p className="text-sm text-red-500">{errors.motivo.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              {...register('observaciones')}
              placeholder="Observaciones adicionales..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={registrarMovimiento.isPending}>
              {registrarMovimiento.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Registrar Movimiento
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
