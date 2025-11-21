import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useSolicitudes, type CrearSolicitudData } from '@/hooks/useSolicitudes';

const tiposSolicitud = [
  { valor: 'mantenimiento', etiqueta: 'Mantenimiento y Reparaciones' },
  { valor: 'recursos', etiqueta: 'Solicitud de Recursos' },
  { valor: 'permisos', etiqueta: 'Permisos y Autorizaciones' },
  { valor: 'soporte_tecnico', etiqueta: 'Soporte Técnico' },
  { valor: 'capacitacion', etiqueta: 'Capacitación' },
  { valor: 'documentacion', etiqueta: 'Documentación' },
  { valor: 'reunion', etiqueta: 'Solicitud de Reunión' },
  { valor: 'video', etiqueta: 'Requirimiento de video' },
  { valor: 'otro', etiqueta: 'Otro' },
];

interface SolicitudFormProps {
  onCancel: () => void;
}

export const SolicitudForm = ({ onCancel }: SolicitudFormProps) => {
  const [formData, setFormData] = useState<CrearSolicitudData>({
    titulo: '',
    descripcion: '',
    area_id: '',
  });
  const [tipoSolicitud, setTipoSolicitud] = useState('');

  const { crearSolicitud, isCreating } = useSolicitudes();

  // Obtener áreas disponibles
  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('areas')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo.trim() || !formData.descripcion.trim() || !formData.area_id || !tipoSolicitud) {
      return;
    }

    try {
      const solicitudConTipo = {
        ...formData,
        titulo: `[${tiposSolicitud.find(t => t.valor === tipoSolicitud)?.etiqueta}] ${formData.titulo}`
      };
      await crearSolicitud(solicitudConTipo);
      setFormData({ titulo: '', descripcion: '', area_id: '' });
      setTipoSolicitud('');
      onCancel();
    } catch (error) {
      console.error('Error al crear solicitud:', error);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Nueva Solicssitud</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="tipo">Tipo de Solicitud</Label>
            <Select
              value={tipoSolicitud}
              onValueChange={setTipoSolicitud}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione el tipo de solicitud" />
              </SelectTrigger>
              <SelectContent>
                {tiposSolicitud.map((tipo) => (
                  <SelectItem key={tipo.valor} value={tipo.valor}>
                    {tipo.etiqueta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
              placeholder="Ingrese el título específico de la solicitud"
              required
            />
          </div>

          <div>
            <Label htmlFor="area">Área Destino</Label>
            <Select
              value={formData.area_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, area_id: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione el área destino" />
              </SelectTrigger>
              <SelectContent>
                {areas.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Describa detalladamente su solicitud"
              rows={4}
              required
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Creando...' : 'Crear Solicitud'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};