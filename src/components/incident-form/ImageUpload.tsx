import { Label } from "@/components/ui/label";
import { Upload, X, Video, Image, Loader2, Camera, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UploadedImage } from "@/utils/supabaseStorage";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

interface ImageUploadProps {
  uploadedImages: UploadedImage[];
  onImageUpload: (files: FileList) => void;
  onRemoveImage: (imageId: string) => void;
  isUploading: boolean;
}

const ImageUpload = ({ uploadedImages, onImageUpload, onRemoveImage, isUploading }: ImageUploadProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    
    // Limpiar el input
    event.target.value = '';
  };

  const processFiles = (files: FileList) => {
    // Validar que sean imágenes o videos
    const validFiles = Array.from(files).filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        toast({
          title: "Archivo no válido",
          description: `${file.name} no es una imagen o video válido.`,
          variant: "destructive",
        });
        return false;
      }

      // Límites: 10MB para imágenes y 50MB para videos
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: "Archivo muy grande",
          description: `${file.name} excede ${isVideo ? '50MB' : '10MB'}.`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length > 0) {
      // Crear FileList con archivos válidos
      const dt = new DataTransfer();
      validFiles.forEach(file => dt.items.add(file));
      onImageUpload(dt.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isUploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <Label>Evidencia Multimedia (Imágenes y Videos)</Label>
      
      {/* Botones específicos para móvil */}
      {isMobile ? (
        <div className="space-y-3">
          {/* Botón para cámara - Solo fotos */}
          <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${
            isUploading 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-green-300 hover:border-green-400 bg-green-50'
          }`}>
            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileUpload}
              className="hidden"
              id="camera-photo-upload"
              disabled={isUploading}
            />
            <label htmlFor="camera-photo-upload" className={`cursor-pointer block ${isUploading ? 'cursor-not-allowed' : ''}`}>
              {isUploading ? (
                <Loader2 className="mx-auto h-8 w-8 text-blue-500 animate-spin" />
              ) : (
                <Camera className="mx-auto h-8 w-8 text-green-600" />
              )}
              <p className="mt-2 text-sm font-medium text-green-700">
                {isUploading ? 'Procesando...' : 'Tomar Foto'}
              </p>
              <p className="text-xs text-green-600">
                Abre la cámara para tomar foto
              </p>
            </label>
          </div>

          {/* Botón para video cámara */}
          <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${
            isUploading 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-orange-300 hover:border-orange-400 bg-orange-50'
          }`}>
            <input
              type="file"
              accept="video/*"
              capture="user"
              onChange={handleFileUpload}
              className="hidden"
              id="camera-video-upload"
              disabled={isUploading}
            />
            <label htmlFor="camera-video-upload" className={`cursor-pointer block ${isUploading ? 'cursor-not-allowed' : ''}`}>
              {isUploading ? (
                <Loader2 className="mx-auto h-8 w-8 text-blue-500 animate-spin" />
              ) : (
                <Video className="mx-auto h-8 w-8 text-orange-600" />
              )}
              <p className="mt-2 text-sm font-medium text-orange-700">
                {isUploading ? 'Procesando...' : 'Grabar Video'}
              </p>
              <p className="text-xs text-orange-600">
                Abre la cámara para grabar video
              </p>
            </label>
          </div>

          {/* Botón para galería con drag & drop */}
          <div 
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${
              isUploading 
                ? 'border-blue-400 bg-blue-50' 
                : isDragOver
                ? 'border-purple-500 bg-purple-100'
                : 'border-purple-300 hover:border-purple-400 bg-purple-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
              id="gallery-upload"
              disabled={isUploading}
            />
            <label htmlFor="gallery-upload" className={`cursor-pointer block ${isUploading ? 'cursor-not-allowed' : ''}`}>
              {isUploading ? (
                <Loader2 className="mx-auto h-8 w-8 text-blue-500 animate-spin" />
              ) : (
                <FolderOpen className="mx-auto h-8 w-8 text-purple-600" />
              )}
              <p className="mt-2 text-sm font-medium text-purple-700">
                {isUploading ? 'Procesando...' : isDragOver ? 'Suelta aquí los archivos' : 'Seleccionar de Galería'}
              </p>
              <p className="text-xs text-purple-600">
                {isDragOver ? 'Suelta para subir' : 'Elige archivos existentes o arrastra aquí'}
              </p>
            </label>
          </div>
        </div>
      ) : (
        /* Interfaz para escritorio con drag & drop mejorado */
        <div 
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
            isUploading 
              ? 'border-blue-400 bg-blue-50' 
              : isDragOver
              ? 'border-blue-500 bg-blue-100'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileUpload}
            className="hidden"
            id="media-upload"
            disabled={isUploading}
          />
          <label htmlFor="media-upload" className={`cursor-pointer ${isUploading ? 'cursor-not-allowed' : ''}`}>
            {isUploading ? (
              <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
            ) : (
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
            )}
            <p className="mt-2 text-sm text-gray-600">
              {isUploading 
                ? 'Procesando archivos multimedia...' 
                : isDragOver 
                ? 'Suelta los archivos aquí para subirlos'
                : 'Haz clic para subir o arrastra archivos aquí'
              }
            </p>
            <p className="text-xs text-gray-500">
              Imágenes: PNG, JPG, GIF hasta 10MB | Videos: MP4, MOV, AVI hasta 50MB
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Las imágenes se comprimen automáticamente a WebP (máx. 2MB, 1024px)
            </p>
          </label>
        </div>
      )}

      <div className="text-xs text-gray-500 text-center">
        <p>Límites: Imágenes hasta 10MB | Videos hasta 50MB</p>
        <p className="text-blue-600">Las imágenes se comprimen automáticamente a WebP</p>
        <p className="text-green-600 mt-1">💡 También puedes arrastrar y soltar archivos</p>
      </div>

      {/* Preview de imágenes subidas */}
      {uploadedImages.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              Archivos multimedia ({uploadedImages.length})
            </h4>
            <span className="text-xs text-gray-500">
              Total: {formatFileSize(uploadedImages.reduce((sum, img) => sum + img.size, 0))}
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {uploadedImages.map((image) => {
              const isVideo = image.type.startsWith('video/');
              return (
                <div key={image.id} className="relative group">
                  <div className="relative">
                    {isVideo ? (
                      <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <Video className="w-6 h-6 mx-auto text-gray-600 mb-1" />
                          <span className="text-xs text-gray-500">Video</span>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={image.url}
                        alt={`Imagen ${image.fileName}`}
                        className="w-full h-24 object-cover rounded-lg"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute top-1 left-1 bg-green-600 bg-opacity-80 rounded-full p-1">
                      {isVideo ? <Video className="w-3 h-3 text-white" /> : <Image className="w-3 h-3 text-white" />}
                    </div>
                    {!isVideo && (
                      <div className="absolute top-1 right-1 bg-blue-600 bg-opacity-80 rounded px-1">
                        <span className="text-xs text-white font-medium">WebP</span>
                      </div>
                    )}
                  </div>
                <button
                  type="button"
                  onClick={() => onRemoveImage(image.id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={isUploading}
                >
                  <X className="h-3 w-3" />
                </button>
                  <div className="mt-1">
                    <p className="text-xs text-gray-500 truncate">
                      {image.fileName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatFileSize(image.size)}
                    </p>
                    <p className="text-xs text-green-600">
                      Subida exitosa
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
