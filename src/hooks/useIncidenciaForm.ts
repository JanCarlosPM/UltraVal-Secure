import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useAuditLog } from "./useAuditLog";
import { toast } from "sonner";
import { useSmartAreaSelection } from "./useSmartAreaSelection";
import { processMediaFile, getFullFilePath } from "@/utils/imageCompression";
import { uploadImageToStorage, deleteImageFromStorage, saveImageRecord, deleteImageRecord, UploadedImage } from "@/utils/supabaseStorage";

export interface IncidenciaData {
  titulo: string;
  descripcion: string;
  area_id: string;
  sala_id: string;
  clasificacion_ids: string[]; // Array para múltiples clasificaciones
  prioridad: "baja" | "media" | "alta" | "critica";
  fecha_incidencia: string;
  observaciones: string;
  reportado_por: string;
  tiempo_minutos?: number;
}

export const useIncidenciaForm = () => {
  const { user, profile } = useAuth();
  const { logAction } = useAuditLog();
  const { getSuggestedArea, getSuggestedAreasMultiple } = useSmartAreaSelection();
  
  const [formData, setFormData] = useState<IncidenciaData>({
    titulo: "",
    descripcion: "",
    area_id: "",
    sala_id: "",
    clasificacion_ids: [], // Array vacío inicialmente
    prioridad: "media",
    fecha_incidencia: new Date().toISOString(),
    observaciones: "",
    reportado_por: profile?.full_name || user?.email || "",
    tiempo_minutos: undefined,
  });

  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleInputChange = useCallback(async (field: string, value: string | number | string[]) => {
    if (field === "clasificacion_ids" && Array.isArray(value) && value.length > 0) {
      // Obtener múltiples áreas sugeridas para todas las clasificaciones seleccionadas
      const areasMultiples = await getSuggestedAreasMultiple(value);
      if (areasMultiples.length > 0) {
        // Usar la primera área con mayor prioridad
        const areaPrincipal = areasMultiples[0];
        
        setFormData(prev => ({
          ...prev,
          [field]: value,
          area_id: areaPrincipal.areaId,
          prioridad: areaPrincipal.prioridad as any
        }));
        
        // Log para mostrar las áreas sugeridas
        console.log('Áreas sugeridas para las clasificaciones:', areasMultiples.map(a => a.areaNombre).join(', '));
        return;
      }
    }
    
    // Para otros campos, aplicar lógica simple
    setFormData(prev => ({ ...prev, [field]: value }));
  }, [getSuggestedAreasMultiple]);

  const handleImageUpload = useCallback(async (files: FileList) => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        try {
          // Procesar archivo multimedia (comprimir imagen o validar video)
          const processedFile = await processMediaFile(file);
          
          // Generar ruta del archivo
          const filePath = getFullFilePath(formData.titulo || 'sin_titulo', processedFile.name);
          
          // Subir a Supabase Storage
          const uploadedImage = await uploadImageToStorage(processedFile, filePath);
          
          // Log de auditoría
          await logAction('compress_and_upload_media', 'incident_media', null, {
            originalSize: file.size,
            processedSize: processedFile.size,
            originalName: file.name,
            processedName: processedFile.name,
            fileType: file.type,
            filePath,
            timestamp: new Date().toISOString()
          });
          
          return uploadedImage;
        } catch (error) {
          console.error(`Error procesando ${file.name}:`, error);
          toast.error(`Error procesando ${file.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
          return null;
        }
      });
      
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((result): result is UploadedImage => result !== null);
      
      if (successfulUploads.length > 0) {
        setUploadedImages(prev => [...prev, ...successfulUploads]);
        toast.success(`${successfulUploads.length} imagen(es) subida(s) exitosamente`);
      }
      
    } catch (error) {
      console.error('Error en handleImageUpload:', error);
      toast.error('Error procesando las imágenes');
    } finally {
      setIsUploading(false);
    }
  }, [formData.titulo, logAction]);

  const removeImage = useCallback(async (imageId: string) => {
    const imageToRemove = uploadedImages.find(img => img.id === imageId);
    if (!imageToRemove) return;
    
    try {
      // Eliminar del storage
      await deleteImageFromStorage(imageToRemove.path);
      
      // Actualizar estado
      setUploadedImages(prev => prev.filter(img => img.id !== imageId));
      
      // Log de auditoría
      await logAction('delete_uploaded_image', 'incident_image', null, {
        imageId,
        fileName: imageToRemove.fileName,
        path: imageToRemove.path,
        timestamp: new Date().toISOString()
      });
      
      toast.success('Imagen eliminada exitosamente');
    } catch (error) {
      console.error('Error eliminando imagen:', error);
      toast.error('Error eliminando la imagen');
    }
  }, [uploadedImages, logAction]);

  const submitIncidencia = useCallback(async (data: IncidenciaData) => {
    if (!user) {
      toast.error("Debes estar autenticado para crear una incidencia");
      return { success: false };
    }

    if (data.clasificacion_ids.length === 0) {
      toast.error("Debes seleccionar al menos un tipo de incidencia");
      return { success: false };
    }

    try {
      // Usar la primera clasificación para crear la incidencia principal
      const incidenciaData = {
        titulo: data.titulo,
        descripcion: data.descripcion,
        area_id: data.area_id,
        sala_id: data.sala_id,
        clasificacion_id: data.clasificacion_ids[0], // Primera clasificación como principal
        prioridad: data.prioridad,
        fecha_incidencia: data.fecha_incidencia,
        observaciones: data.observaciones,
        reportado_por: user.id,
        tiempo_minutos: data.tiempo_minutos,
        estado: 'pendiente' // Las incidencias inician como borrador
      };

      const { data: incidencia, error: incidenciaError } = await supabase
        .from("incidencias")
        .insert(incidenciaData)
        .select()
        .single();

      if (incidenciaError) {
        console.error("Error creating incidencia:", incidenciaError);
        toast.error("Error al crear la incidencia: " + incidenciaError.message);
        return { success: false };
      }

      // Crear registros de clasificaciones múltiples
      const clasificacionRecords = data.clasificacion_ids.map(clasificacionId => ({
        incidencia_id: incidencia.id,
        clasificacion_id: clasificacionId
      }));

      const { error: clasificacionError } = await supabase
        .from("incidencia_clasificaciones")
        .insert(clasificacionRecords);

      if (clasificacionError) {
        console.error("Error creating clasificaciones:", clasificacionError);
        // No fallar completamente si las clasificaciones adicionales fallan
        toast.warning("Incidencia creada, pero hubo problemas con las clasificaciones adicionales");
      }

      // Registrar acción de auditoría
      await logAction('create_incident', 'incident', incidencia.id, {
        titulo: data.titulo,
        prioridad: data.prioridad,
        area_id: data.area_id,
        clasificacion_ids: data.clasificacion_ids,
        tiempo_minutos: data.tiempo_minutos,
        images_count: uploadedImages.length,
        timestamp: new Date().toISOString()
      });

      // Guardar registros de imágenes en la base de datos
      if (uploadedImages.length > 0) {
        const imageRecordPromises = uploadedImages.map(async (image) => {
          await saveImageRecord(incidencia.id, image);
          
          // Log individual por imagen
          await logAction('link_image_to_incident', 'incident_image', incidencia.id, {
            imageId: image.id,
            fileName: image.fileName,
            fileSize: image.size,
            timestamp: new Date().toISOString()
          });
        });

        await Promise.all(imageRecordPromises);
      }

      toast.success("Incidencia creada exitosamente");
      
      // Enviar notificación si es prioridad alta o crítica
      if (data.prioridad === 'alta' || data.prioridad === 'critica') {
        console.log('🚨 Sending notification for high/critical priority incident');
        
        try {
          const { data: notificationResult, error: notificationError } = await supabase.functions.invoke('send-notification', {
            body: {
              incidencia_id: incidencia.id,
              titulo: incidencia.titulo,
              descripcion: incidencia.descripcion,
              prioridad: incidencia.prioridad,
              area_nombre: (await supabase.from('areas').select('nombre').eq('id', incidencia.area_id).single()).data?.nombre || '',
              clasificacion_nombre: (await supabase.from('clasificaciones').select('nombre').eq('id', incidencia.clasificacion_id).single()).data?.nombre || '',
              reportado_por: incidencia.reportado_por
            }
          });

          if (notificationError) {
            console.error('❌ Error sending notification:', notificationError);
            toast.error('Incidencia creada, pero hubo un error enviando las notificaciones');
          } else {
            console.log('✅ Notification sent successfully:', notificationResult);
            toast.success('Incidencia creada y notificaciones enviadas exitosamente');
          }
        } catch (notifError) {
          console.error('❌ Unexpected error sending notification:', notifError);
          toast.error('Incidencia creada, pero hubo un problema enviando las notificaciones');
        }
      } else {
        console.log('ℹ️ Priority is not high enough for notification:', data.prioridad);
      }
      
      // Limpiar formulario
      setFormData({
        titulo: "",
        descripcion: "",
        area_id: "",
        sala_id: "",
        clasificacion_ids: [],
        prioridad: "media",
        fecha_incidencia: new Date().toISOString(),
        observaciones: "",
        reportado_por: profile?.full_name || user?.email || "",
        tiempo_minutos: undefined,
      });
      setUploadedImages([]);

      return { success: true, data: incidencia };

    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("Error inesperado al crear la incidencia");
      
      // Registrar error en auditoría
      await logAction('create_incident_failed', 'incident', null, {
        error: error instanceof Error ? error.message : 'Unknown error',
        incidenciaData: data,
        timestamp: new Date().toISOString()
      });
      
      return { success: false };
    }
  }, [user, profile, uploadedImages, logAction]);

  const crearIncidencia = useMutation({
    mutationFn: () => submitIncidencia(formData),
    onSuccess: (result) => {
      if (result.success) {
        console.log('Incidencia creada exitosamente');
      }
    },
    onError: (error) => {
      console.error('Error en mutación:', error);
    }
  });

  return {
    formData,
    uploadedImages,
    isUploading,
    handleInputChange,
    handleImageUpload,
    removeImage,
    submitIncidencia,
    crearIncidencia,
    user,
    profile,
    isSubmitting: crearIncidencia.isPending
  };
};