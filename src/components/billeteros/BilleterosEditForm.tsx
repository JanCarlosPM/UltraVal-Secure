import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Billetero, useBilleteros } from "@/hooks/useBilleteros";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

interface BilleterosEditFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billetero: Billetero;
}

export const BilleterosEditForm = ({
  open,
  onOpenChange,
  billetero,
}: BilleterosEditFormProps) => {
  const { actualizarBilletero } = useBilleteros();

  const form = useForm({
    defaultValues: {
      codigo: billetero.codigo,
      serial: billetero.serial || "",
      tipo: billetero.tipo,
      estado: billetero.estado,
      descripcion: billetero.descripcion || "",
      observaciones: billetero.observaciones || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        codigo: billetero.codigo,
        serial: billetero.serial || "",
        tipo: billetero.tipo,
        estado: billetero.estado,
        descripcion: billetero.descripcion || "",
        observaciones: billetero.observaciones || "",
      });
    }
  }, [open, billetero, form]);

  const onSubmit = async (data: any) => {
    await actualizarBilletero.mutateAsync({
      id: billetero.id,
      data: {
        codigo: data.codigo,
        serial: data.serial || null,
        tipo: data.tipo,
        estado: data.estado,
        descripcion: data.descripcion || null,
        observaciones: data.observaciones || null,
      },
    });
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Billetero</DialogTitle>
          <DialogDescription>
            Modifica los datos del billetero. Los cambios se guardarán inmediatamente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="codigo"
              rules={{
                required: "El código es requerido",
                pattern: {
                  value: /^TR[0-9A-Z]+$/,
                  message: "El código debe iniciar con TR seguido de números o letras mayúsculas",
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código del Billetero *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="TR00001"
                      {...field}
                      className="uppercase"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Serie</FormLabel>
                  <FormControl>
                    <Input placeholder="Número de serie del billetero" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo"
                rules={{ required: "El tipo es requerido" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MJ">Multijuegos (MJ)</SelectItem>
                        <SelectItem value="PK">Poker (PK)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estado"
                rules={{ required: "El estado es requerido" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="en_stock">En Stock</SelectItem>
                        <SelectItem value="asignado">Asignado</SelectItem>
                        <SelectItem value="reparacion">Reparación</SelectItem>
                        <SelectItem value="en_programacion">En Programación</SelectItem>
                        <SelectItem value="descarte">Descarte</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripción del billetero"
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observaciones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observaciones adicionales"
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={actualizarBilletero.isPending}>
                {actualizarBilletero.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Guardar Cambios
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
