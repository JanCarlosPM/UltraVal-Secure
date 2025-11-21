import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSolicitudes, type Solicitud } from '@/hooks/useSolicitudes';

interface ProgresoEjecucionDialogProps {
  solicitud: Solicitud;
  isOpen: boolean;
  onClose: () => void;
}

export const ProgresoEjecucionDialog = ({ solicitud, isOpen, onClose }: ProgresoEjecucionDialogProps) => {
  const [progreso, setProgreso] = useState(solicitud.progreso_ejecucion || '');
  const { actualizarProgreso, isUpdatingProgress } = useSolicitudes();

  const handleSubmit = async () => {
    if (progreso.length < 20) {
      return;
    }

    try {
      await actualizarProgreso({ solicitudId: solicitud.id, progreso });
      onClose();
    } catch (error) {
      console.error('Error al actualizar progreso:', error);
    }
  };

  const caracteresRestantes = 20 - progreso.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Progreso de Ejecución</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="progreso">Describe el progreso de la solicitud:</Label>
            <Textarea
              id="progreso"
              value={progreso}
              onChange={(e) => setProgreso(e.target.value)}
              placeholder="Describe detalladamente el progreso, acciones tomadas y estado actual de la solicitud..."
              className="min-h-[150px] mt-2"
            />
            <div className="text-sm text-muted-foreground mt-1">
              {caracteresRestantes > 0 ? (
                <span className="text-red-500">
                  Faltan {caracteresRestantes} caracteres (mínimo 20)
                </span>
              ) : (
                <span className="text-green-600">
                  {progreso.length} caracteres
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={progreso.length < 20 || isUpdatingProgress}
          >
            {isUpdatingProgress ? 'Guardando...' : 'Actualizar Progreso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};