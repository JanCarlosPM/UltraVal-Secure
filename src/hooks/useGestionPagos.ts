import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SolicitudPago {
  id: string;
  numero_solicitud: string;
  sala_id: string;
  concepto_pago_id: string;
  monto: number;
  descripcion: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'pagado';
  solicitante_id: string;
  aprobado_por?: string;
  fecha_aprobacion?: string;
  fecha_pago?: string;
  observaciones?: string;
  created_at: string;
  updated_at: string;
  // Relaciones
  sala?: { nombre: string } | null;
  concepto_pago?: { nombre: string; descripcion?: string } | null;
  solicitante?: { full_name: string } | null;
  aprobador?: { full_name: string } | null;
  documentos?: any[];
}

export interface ConceptoPago {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export interface Sala {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export interface CrearSolicitudPagoData {
  sala_id: string;
  concepto_pago_id: string;
  monto: number;
  descripcion: string;
}

export interface EstadisticasPago {
  total_solicitudes: number;
  solicitudes_pendientes: number;
  solicitudes_aprobadas: number;
  solicitudes_rechazadas: number;
  solicitudes_pagadas: number;
  monto_total_pendiente: number;
  monto_total_aprobado: number;
  monto_total_pagado: number;
}

export const useGestionPagos = () => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Obtener solicitudes de pago
  const { data: solicitudes = [], isLoading: isLoadingSolicitudes } = useQuery({
    queryKey: ['solicitudes-pago'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solicitudes_pago')
        .select(`
          *,
          sala:salas(nombre),
          concepto_pago:conceptos_pago(nombre, descripcion),
          solicitante:profiles!solicitudes_pago_solicitante_id_fkey(full_name),
          aprobador:profiles!solicitudes_pago_aprobado_por_fkey1(full_name),
          documentos:documentos_solicitudes_pago(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data?.map((item: any) => ({
        ...item,
        sala: Array.isArray(item.sala) ? item.sala[0] : item.sala,
        concepto_pago: Array.isArray(item.concepto_pago) ? item.concepto_pago[0] : item.concepto_pago,
        solicitante: Array.isArray(item.solicitante) ? item.solicitante[0] : item.solicitante,
        aprobador: Array.isArray(item.aprobador) ? item.aprobador[0] : item.aprobador,
        documentos: item.documentos || [],
      })) as SolicitudPago[];
    },
  });

  // Obtener conceptos de pago
  const { data: conceptosPago = [] } = useQuery({
    queryKey: ['conceptos-pago'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conceptos_pago')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      return data as ConceptoPago[];
    },
  });

  // Obtener salas
  const { data: salas = [] } = useQuery({
    queryKey: ['salas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salas')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      return data as Sala[];
    },
  });

  // Obtener estadísticas
  const { data: estadisticas } = useQuery({
    queryKey: ['estadisticas-solicitudes-pago'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('obtener_estadisticas_solicitudes_pago');

      if (error) throw error;
      return data[0] as EstadisticasPago;
    },
  });

  // Crear solicitud de pago
  const crearSolicitud = useMutation({
    mutationFn: async (datos: CrearSolicitudPagoData) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('solicitudes_pago')
        .insert({
          ...datos,
          solicitante_id: userData.user.id,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitudes-pago'] });
      queryClient.invalidateQueries({ queryKey: ['estadisticas-solicitudes-pago'] });
      toast({
        title: "Solicitud creada",
        description: "La solicitud de pago se ha creado correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear la solicitud de pago: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Aprobar/Rechazar solicitud
  const actualizarEstadoSolicitud = useMutation({
    mutationFn: async ({ 
      solicitudId, 
      estado, 
      observaciones 
    }: { 
      solicitudId: string; 
      estado: 'aprobado' | 'rechazado' | 'pagado'; 
      observaciones?: string; 
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuario no autenticado');

      const updateData: any = {
        estado,
        observaciones,
      };

      if (estado === 'aprobado') {
        updateData.aprobado_por = userData.user.id;
        updateData.fecha_aprobacion = new Date().toISOString();
      } else if (estado === 'pagado') {
        updateData.fecha_pago = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('solicitudes_pago')
        .update(updateData)
        .eq('id', solicitudId)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitudes-pago'] });
      queryClient.invalidateQueries({ queryKey: ['estadisticas-solicitudes-pago'] });
      toast({
        title: "Estado actualizado",
        description: "El estado de la solicitud se ha actualizado correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado: " + error.message,
        variant: "destructive",
      });
    },
  });

  return {
    // Datos
    solicitudes,
    conceptosPago,
    salas,
    estadisticas,
    
    // Estados de carga
    isLoading: isLoadingSolicitudes || isLoading,
    isCreating: crearSolicitud.isPending,
    isUpdating: actualizarEstadoSolicitud.isPending,
    
    // Mutaciones
    crearSolicitud: crearSolicitud.mutateAsync,
    actualizarEstadoSolicitud: actualizarEstadoSolicitud.mutateAsync,
  };
};