import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, RotateCcw, X } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (canvas: HTMLCanvasElement) => void;
  onClose: () => void;
}

export const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      setError(null);
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        setStream(newStream);
        setHasPermission(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Call the callback with the canvas
    onCapture(canvas);
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <div className="text-red-500 mb-4">
            <Camera className="h-12 w-12 mx-auto mb-2" />
            <p className="text-sm">{error}</p>
          </div>
          <Button onClick={handleClose} variant="outline">
            Cerrar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 bg-black rounded-lg object-cover"
            />
            {!hasPermission && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                <p className="text-white text-sm">Iniciando cámara...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center gap-3">
        <Button
          variant="outline"
          onClick={switchCamera}
          disabled={!hasPermission}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Cambiar Cámara
        </Button>
        
        <Button
          onClick={capturePhoto}
          disabled={!hasPermission}
          className="gap-2"
        >
          <Camera className="h-4 w-4" />
          Capturar
        </Button>

        <Button
          variant="outline"
          onClick={handleClose}
          className="gap-2"
        >
          <X className="h-4 w-4" />
          Cerrar
        </Button>
      </div>

      {/* Hidden canvas for capturing */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />
    </div>
  );
};