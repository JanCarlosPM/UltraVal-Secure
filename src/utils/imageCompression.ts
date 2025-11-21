
import imageCompression from 'browser-image-compression';

interface CompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  fileType: string;
}

/**
 * Comprime una imagen a formato WebP con límites específicos
 */
export const compressImageToWebP = async (file: File): Promise<File> => {
  const options: CompressionOptions = {
    maxSizeMB: 2, // Límite de 2MB
    maxWidthOrHeight: 1024, // Ancho máximo de 1024px
    useWebWorker: true,
    fileType: 'image/webp'
  };

  try {
    const compressedFile = await imageCompression(file, options);
    
    // Crear un nuevo archivo con nombre actualizado para WebP
    const webpFileName = file.name.replace(/\.[^/.]+$/, '.webp');
    const webpFile = new File([compressedFile], webpFileName, {
      type: 'image/webp',
      lastModified: Date.now()
    });

    console.log(`Imagen comprimida: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB) → ${webpFile.name} (${(webpFile.size / 1024 / 1024).toFixed(2)}MB)`);
    
    return webpFile;
  } catch (error) {
    console.error('Error comprimiendo imagen:', error);
    throw new Error('No se pudo comprimir la imagen');
  }
};

/**
 * Procesa archivos multimedia (imágenes y videos) antes de la subida
 * @param file - Archivo multimedia original
 * @returns Archivo procesado (comprimido si es imagen, sin cambios si es video)
 */
export const processMediaFile = async (file: File): Promise<File> => {
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  
  if (isVideo) {
    // Para videos, verificar tamaño con el nuevo límite de 50MB
    if (file.size > 50 * 1024 * 1024) { // 50MB limit for videos
      throw new Error(`El video es demasiado grande. Máximo permitido: 50MB`);
    }
    
    console.log(`Video procesado: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    return file;
  } else if (isImage) {
    // Para imágenes, verificar tamaño con el nuevo límite de 10MB antes de comprimir
    if (file.size > 10 * 1024 * 1024) { // 10MB limit for images
      throw new Error(`La imagen es demasiado grande. Máximo permitido: 10MB`);
    }
    
    // Comprimir a WebP
    return compressImageToWebP(file);
  } else {
    throw new Error('Tipo de archivo no soportado. Solo se permiten imágenes y videos.');
  }
};

/**
 * Genera el nombre del archivo basado en la incidencia y fecha
 */
export const generateFileName = (incidenciaTitulo: string, originalName: string): string => {
  const now = new Date();
  const fecha = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timestamp = now.getTime();
  
  // Sanitizar el título de la incidencia
  const tituloSanitizado = incidenciaTitulo
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .substring(0, 30); // Limitar longitud
  
  const extension = originalName.split('.').pop() || 'webp';
  
  return `incidencia_${tituloSanitizado}_${fecha}_${timestamp}.${extension}`;
};

/**
 * Genera la estructura de carpetas por año/mes
 */
export const generateFolderPath = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.toLocaleDateString('es-ES', { month: 'long' });
  
  return `${year}/${month}`;
};

/**
 * Obtiene la ruta completa del archivo en el bucket
 */
export const getFullFilePath = (incidenciaTitulo: string, originalName: string): string => {
  const folderPath = generateFolderPath();
  const fileName = generateFileName(incidenciaTitulo, originalName);
  
  return `${folderPath}/${fileName}`;
};
