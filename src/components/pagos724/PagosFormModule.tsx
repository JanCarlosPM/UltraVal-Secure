import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePagos724 } from "@/hooks/usePagos724";
import { DocumentoUpload } from "./DocumentoUpload";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { DollarSign, User, FileImage } from "lucide-react";

const formSchema = z.object({
  nombres: z.string().min(2, "Los nombres deben tener al menos 2 caracteres"),
  apellidos: z.string().min(2, "Los apellidos deben tener al menos 2 caracteres"),
  monto_pagar: z.number().min(0.01, "El monto debe ser mayor a 0"),
});

type FormData = z.infer<typeof formSchema>;

export const PagosFormModule = () => {
  const [documentoImage, setDocumentoImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { crearPago } = usePagos724();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombres: "",
      apellidos: "",
      monto_pagar: 0,
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!documentoImage) {
      toast({
        title: "Error",
        description: "Debe adjuntar una foto del documento de identidad",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await crearPago({
        nombres: data.nombres,
        apellidos: data.apellidos,
        monto_pagar: data.monto_pagar,
        documento_imagen: documentoImage,
      });

      toast({
        title: "Pago registrado",
        description: "El pago ha sido registrado exitosamente",
      });

      // Reset form
      form.reset();
      setDocumentoImage(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el pago. Inténtelo nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5" />
          <span>Registrar Nuevo Pago</span>
        </CardTitle>
        <CardDescription>
          Complete el formulario para registrar un pago de efectivo a un cliente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Información del Cliente */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <User className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Información del Cliente</h3>
                </div>
                
                <FormField
                  control={form.control}
                  name="nombres"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombres</FormLabel>
                      <FormControl>
                        <Input placeholder="Ingrese los nombres del cliente" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="apellidos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellidos</FormLabel>
                      <FormControl>
                        <Input placeholder="Ingrese los apellidos del cliente" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="monto_pagar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monto a Pagar</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Documento de Identidad */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <FileImage className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Documento de Identidad</h3>
                </div>
                
                  <div>
                  <DocumentoUpload
                    onImageUpload={(file) => setDocumentoImage(file)}
                    onImageRemove={() => setDocumentoImage(null)}
                    uploadedImage={documentoImage}
                    isUploading={isSubmitting}
                  />
                  </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setDocumentoImage(null);
                }}
                disabled={isSubmitting}
              >
                Limpiar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <LoadingSpinner className="mr-2" />
                    Registrando...
                  </>
                ) : (
                  "Registrar Pago"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};