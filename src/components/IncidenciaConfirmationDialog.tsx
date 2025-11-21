
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface IncidenciaConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  formData: {
    titulo: string;
    descripcion: string;
    area_id: string;
    clasificacion_ids: string[];
    prioridad: string;
    sala_id: string;
  };
  areas: any[];
  clasificaciones: any[];
  salas: any[];
}

const IncidenciaConfirmationDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  formData,
  areas,
  clasificaciones,
  salas
}: IncidenciaConfirmationDialogProps) => {
  const getAreaName = () => areas?.find(a => a.id === formData.area_id)?.nombre || 'No seleccionada';
  const getClasificacionNames = () => {
    if (!formData.clasificacion_ids.length) return 'No seleccionadas';
    return clasificaciones?.filter(c => formData.clasificacion_ids.includes(c.id))
      .map(c => c.nombre).join(', ') || 'No seleccionadas';
  };
  const getSalaName = () => salas?.find(s => s.id === formData.sala_id)?.nombre || 'No seleccionada';

  const getPrioridadColor = () => {
    switch (formData.prioridad) {
      case 'critica': return 'text-red-600 bg-red-50';
      case 'alta': return 'text-orange-600 bg-orange-50';
      case 'media': return 'text-yellow-600 bg-yellow-50';
      case 'baja': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            Confirmar Registro de Incidencia
          </AlertDialogTitle>
          <AlertDialogDescription>
            Por favor revisa los datos antes de proceder. Esta acción registrará la incidencia en el sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-600">Título:</span>
              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border-l-4 border-blue-500">
                {formData.titulo}
              </p>
            </div>

            <div>
              <span className="text-sm font-medium text-gray-600">Descripción:</span>
              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded max-h-16 overflow-y-auto">
                {formData.descripcion}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-sm font-medium text-gray-600">Área:</span>
                <p className="text-sm text-gray-900">{getAreaName()}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Sala:</span>
                <p className="text-sm text-gray-900">{getSalaName()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-sm font-medium text-gray-600">Tipos de Incidencia:</span>
                <p className="text-sm text-gray-900">{getClasificacionNames()}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Prioridad:</span>
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${getPrioridadColor()}`}>
                  {formData.prioridad.charAt(0).toUpperCase() + formData.prioridad.slice(1)}
                </span>
              </div>
            </div>
          </div>

         
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            Confirmar y Registrar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default IncidenciaConfirmationDialog;
