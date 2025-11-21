import { supabase } from '@/integrations/supabase/client';

const BUCKET_NAME = 'incidencias-multimedia';

export interface UploadedImage {
  id: string;
  url: string;
  path: string;
  fileName: string;
  size: number;
  type: string;
}

/**
 * Sube una imagen al bucket de Supabase Storage
 */
export const uploadImageToStorage = async (
  file: File, 
  filePath: string
): Promise<UploadedImage> => {
  try {
    // Subir archivo
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Error subiendo archivo: ${uploadError.message}`);
    }

  // Generar URL pública permanente (el bucket ya es público)
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return {
    id: crypto.randomUUID(),
    url: urlData.publicUrl,
    path: filePath,
    fileName: file.name,
    size: file.size,
    type: file.type
  };
  } catch (error) {
    console.error('Error en uploadImageToStorage:', error);
    throw error;
  }
};

/**
 * Elimina una imagen del bucket de Supabase Storage
 */
export const deleteImageFromStorage = async (filePath: string): Promise<void> => {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      throw new Error(`Error eliminando archivo: ${error.message}`);
    }

    console.log(`Archivo eliminado: ${filePath}`);
  } catch (error) {
    console.error('Error en deleteImageFromStorage:', error);
    throw error;
  }
};

/**
 * Guarda la información de la imagen en la base de datos
 */
export const saveImageRecord = async (
  incidenciaId: string,
  uploadedImage: UploadedImage
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('imagenes_incidencias')
      .insert({
        incidencia_id: incidenciaId,
        url_imagen: uploadedImage.url,
        nombre_archivo: uploadedImage.fileName,
        tipo_archivo: uploadedImage.type,
        tamaño_bytes: uploadedImage.size
      });

    if (error) {
      throw new Error(`Error guardando registro de imagen: ${error.message}`);
    }
  } catch (error) {
    console.error('Error en saveImageRecord:', error);
    throw error;
  }
};

/**
 * Elimina el registro de la imagen de la base de datos
 */
export const deleteImageRecord = async (incidenciaId: string, fileName: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('imagenes_incidencias')
      .delete()
      .eq('incidencia_id', incidenciaId)
      .eq('nombre_archivo', fileName);

    if (error) {
      throw new Error(`Error eliminando registro: ${error.message}`);
    }
  } catch (error) {
    console.error('Error en deleteImageRecord:', error);
    throw error;
  }
};