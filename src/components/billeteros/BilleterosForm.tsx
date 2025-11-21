import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CrearBilleteroData, useBilleteros } from "@/hooks/useBilleteros";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface BilleterosFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BilleterosForm = ({ open, onOpenChange }: BilleterosFormProps) => {
  const { crearBilletero, generarCodigoAutomatico } = useBilleteros();
  const [generandoCodigo, setGenerandoCodigo] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<CrearBilleteroData>({
    defaultValues: {
      estado: 'en_stock',
    }
  });

  const tipo = watch('tipo');
  const codigo = watch('codigo');
  const serial = watch('serial');

  const onSubmit = async (data: CrearBilleteroData) => {
    try {
      await crearBilletero.mutateAsync(data);
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error al crear billetero:', error);
    }
  };

  const handleGenerarCodigo = async () => {
    setGenerandoCodigo(true);
    try {
      const codigoGenerado = await generarCodigoAutomatico();
      setValue('codigo', codigoGenerado);
      toast.success('Código generado automáticamente');
    } catch (error: any) {
      toast.error(error.message || 'Error al generar código');
    } finally {
      setGenerandoCodigo(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Nuevo Billetero</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="codigo">
                Código TR <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="codigo"
                  {...register('codigo', { 
                    required: 'El código es requerido',
                    pattern: {
                      value: /^TR[0-9A-Z]+$/,
                      message: 'El código debe iniciar con TR seguido de números o letras'
                    }
                  })}
                  placeholder="TR00001"
                  className={errors.codigo ? 'border-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleGenerarCodigo}
                  disabled={generandoCodigo}
                  title="Generar código automático"
                >
                  {generandoCodigo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.codigo && (
                <p className="text-sm text-red-500">{errors.codigo.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="serial">Número de Serie</Label>
              <Input
                id="serial"
                {...register('serial', { 
                  pattern: {
                    value: /^[0-9A-Z]+$/,
                    message: 'El número de serie debe contener solo números o letras'
                  }
                })}
                placeholder="123ABC"
                className={errors.serial ? 'border-red-500' : ''}
              />
              {errors.serial && (
                <p className="text-sm text-red-500">{errors.serial.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">
                Tipo <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={tipo} 
                onValueChange={(value) => setValue('tipo', value as 'MJ' | 'PK')}
              >
                <SelectTrigger className={errors.tipo ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MJ">Multijuegos (MJ)</SelectItem>
                  <SelectItem value="PK">Poker (PK)</SelectItem>
                </SelectContent>
              </Select>
              {errors.tipo && (
                <p className="text-sm text-red-500">{errors.tipo.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado Inicial</Label>
              <Select 
                defaultValue="en_stock"
                onValueChange={(value) => setValue('estado', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_stock">En Stock</SelectItem>
                  <SelectItem value="asignado">Asignado</SelectItem>
                  <SelectItem value="reparacion">En Reparación</SelectItem>
                  <SelectItem value="en_programacion">En Programación</SelectItem>
                  <SelectItem value="descarte">Descarte</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              {...register('descripcion')}
              placeholder="Descripción del billetero..."
              rows={3}
            />
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
            <Button type="submit" disabled={crearBilletero.isPending}>
              {crearBilletero.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Registrar Billetero
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
