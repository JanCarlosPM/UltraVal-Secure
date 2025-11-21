import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react';
import { useGestionPagos, CrearSolicitudPagoData } from '@/hooks/useGestionPagos';
import { supabase } from '@/integrations/supabase/client';
import { compressImageToWebP } from '@/utils/imageCompression';
import { CameraCapture } from '@/components/ui/camera-capture';

const formSchema = z.object({
  sala_id: z.string().min(1, 'Debe seleccionar una sala'),
  concepto_pago_id: z.string().min(1, 'Debe seleccionar un concepto'),
  monto: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  descripcion: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
});

interface ImagenSubida {
  id: string;
  url: string;
  nombre: string;
}

interface SolicitudPagoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SolicitudPagoForm = ({ open, onOpenChange }: SolicitudPagoFormProps) => {
  const [imagenesSubidas, setImagenesSubidas] = useState<ImagenSubida[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  const { crearSolicitud, isCreating, conceptosPago, salas } = useGestionPagos();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sala_id: '',
      concepto_pago_id: '',
      monto: 0,
      descripcion: '',
    },
  });

  const handleImageUpload = async (file: File) => {
    try {
      setIsUploading(true);

      // Validar tipo de archivo
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        throw new Error('Solo se permiten imágenes y videos');
      }

      // Validar tamaño (10MB máximo)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('El archivo no debe superar 10MB');
      }

      let archivoParaSubir = file;

      // Comprimir imagen si es necesario
      if (file.type.startsWith('image/')) {
        archivoParaSubir = await compressImageToWebP(file);
      }

      const fileExt = archivoParaSubir.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `solicitudes-pago/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('incidencias-multimedia')
        .upload(filePath, archivoParaSubir);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('incidencias-multimedia')
        .getPublicUrl(filePath);

      const nuevaImagen: ImagenSubida = {
        id: Date.now().toString(),
        url: publicUrl,
        nombre: fileName,
      };

      setImagenesSubidas(prev => [...prev, nuevaImagen]);
    } catch (error: any) {
      console.error('Error al subir imagen:', error);
      alert('Error al subir la imagen: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = async (imagen: ImagenSubida) => {
    try {
      // Intentar eliminar del storage
      const filePath = imagen.url.split('/').pop();
      if (filePath) {
        await supabase.storage
          .from('incidencias-multimedia')
          .remove([`solicitudes-pago/${filePath}`]);
      }
    } catch (error) {
      console.error('Error al eliminar imagen del storage:', error);
    }

    setImagenesSubidas(prev => prev.filter(img => img.id !== imagen.id));
  };

  const handleCameraCapture = (canvas: HTMLCanvasElement) => {
    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], `captura-${Date.now()}.jpg`, { type: 'image/jpeg' });
        await handleImageUpload(file);
      }
    }, 'image/jpeg', 0.8);
    setShowCamera(false);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Crear la solicitud primero
      const solicitud = await crearSolicitud(values as CrearSolicitudPagoData);

      // Luego asociar las imágenes si existen
      if (imagenesSubidas.length > 0) {
        const documentosPromises = imagenesSubidas.map(imagen => 
          supabase.from('documentos_solicitudes_pago').insert({
            solicitud_pago_id: solicitud.id,
            url_documento: imagen.url,
            nombre_archivo: imagen.nombre,
            tipo_archivo: 'image/jpeg',
            tamaño_bytes: 0,
          })
        );

        await Promise.all(documentosPromises);
      }

      // Limpiar formulario y cerrar
      form.reset();
      setImagenesSubidas([]);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error al crear solicitud:', error);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nueva Solicitud de Pago</DialogTitle>
            <DialogDescription>
              Complete los datos para crear una nueva solicitud de pago
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sala_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sala</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una sala" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {salas.map((sala) => (
                            <SelectItem key={sala.id} value={sala.id}>
                              {sala.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="concepto_pago_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Concepto de Pago</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un concepto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {conceptosPago.map((concepto) => (
                            <SelectItem key={concepto.id} value={concepto.id}>
                              {concepto.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="monto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto</FormLabel>
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

              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe el motivo del pago..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sección de imágenes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Documentos de Soporte</CardTitle>
                  <CardDescription>
                    Adjunta documentos que respalden la solicitud de pago
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Botones de acción */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCamera(true)}
                      disabled={isUploading}
                      className="gap-2"
                    >
                      <Camera className="h-4 w-4" />
                      Tomar Foto
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploading}
                      className="gap-2"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*,video/*';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) handleImageUpload(file);
                        };
                        input.click();
                      }}
                    >
                      <Upload className="h-4 w-4" />
                      Subir Archivo
                    </Button>
                  </div>

                  {/* Preview de imágenes */}
                  {imagenesSubidas.length > 0 && (
                    <div className="grid grid-cols-2 gap-4">
                      {imagenesSubidas.map((imagen) => (
                        <div key={imagen.id} className="relative group">
                          <img
                            src={imagen.url}
                            alt="Documento"
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(imagen)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {isUploading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Subiendo archivo...
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isCreating}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isCreating || isUploading}>
                  {isCreating ? 'Creando...' : 'Crear Solicitud'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal de cámara */}
      {showCamera && (
        <Dialog open={showCamera} onOpenChange={setShowCamera}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Tomar Fotografía del Documento</DialogTitle>
            </DialogHeader>
            <CameraCapture
              onCapture={handleCameraCapture}
              onClose={() => setShowCamera(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};