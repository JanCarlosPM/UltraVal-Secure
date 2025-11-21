import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, FileImage, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DocumentoUploadProps {
  onImageUpload: (file: File) => void;
  onImageRemove: () => void;
  uploadedImage: File | null;
  isUploading?: boolean;
}

export const DocumentoUpload = ({ 
  onImageUpload, 
  onImageRemove, 
  uploadedImage, 
  isUploading = false 
}: DocumentoUploadProps) => {
  const { toast } = useToast();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validar que sea una imagen
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Archivo no válido",
          description: "Solo se permiten archivos de imagen.",
          variant: "destructive",
        });
        return;
      }

      // Límite de 10MB
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Archivo muy grande",
          description: "El archivo no puede exceder 10MB.",
          variant: "destructive",
        });
        return;
      }

      onImageUpload(file);
    }
    
    // Limpiar el input
    event.target.value = '';
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
      const file = files[0];
      
      // Validar que sea una imagen
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Archivo no válido",
          description: "Solo se permiten archivos de imagen.",
          variant: "destructive",
        });
        return;
      }

      // Límite de 10MB
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Archivo muy grande",
          description: "El archivo no puede exceder 10MB.",
          variant: "destructive",
        });
        return;
      }

      onImageUpload(file);
    }
  };

  return (
    <div className="space-y-4">
      <Label>Foto del Documento de Identidad</Label>
      
      {!uploadedImage ? (
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
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            id="documento-upload"
            disabled={isUploading}
          />
          <label htmlFor="documento-upload" className={`cursor-pointer block ${isUploading ? 'cursor-not-allowed' : ''}`}>
            {isUploading ? (
              <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
            ) : (
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
            )}
            <p className="mt-2 text-sm text-gray-600">
              {isUploading 
                ? 'Procesando imagen...' 
                : isDragOver 
                ? 'Suelta la imagen aquí'
                : 'Haz clic para subir o arrastra una imagen aquí'
              }
            </p>
            <p className="text-xs text-gray-500">
              PNG, JPG, GIF hasta 10MB
            </p>
          </label>
        </div>
      ) : (
        <div className="relative">
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center space-x-3">
              <FileImage className="h-8 w-8 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {uploadedImage.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(uploadedImage.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onImageRemove}
                disabled={isUploading}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <p className="text-xs text-gray-500">
        Es obligatorio adjuntar una foto del documento de identidad del cliente
      </p>
    </div>
  );
};