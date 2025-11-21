import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EstadoMaquinasStats {
  añoActual: number;
  mesActual: number;
  quincenaActual: number;
  totalMaquinasApagadas: number;
  totalIncidencias: number;
  totalSalasAfectadas: number;
}

interface QuincenalMaquinasData {
  sala_id: string;
  sala_nombre: string;
  año: number;
  mes: number;
  quincena: number;
  total_maquinas_apagadas: number;
  total_incidencias_maquinas: number;
}

export const useEstadoMaquinas = () => {
  const currentDate = new Date();
  const [añoSeleccionado] = useState<number>(currentDate.getFullYear());
  const [mesSeleccionado] = useState<number>(currentDate.getMonth() + 1);

  // Función para determinar la quincena actual
  const getCurrentQuincena = () => {
    const dia = currentDate.getDate();
    return dia <= 15 ? 1 : 2;
  };

  // Obtener estadísticas quincenales de máquinas
  const fetchEstadoMaquinasStats = async (): Promise<EstadoMaquinasStats> => {
    const { data, error } = await supabase.rpc('obtener_estadisticas_quincenales_maquinas', {
      p_año: añoSeleccionado,
      p_mes: mesSeleccionado
    });

    if (error) {
      console.error('Error fetching estado máquinas stats:', error);
      throw error;
    }

    const rawData = data as QuincenalMaquinasData[] || [];
    
    // Calcular estadísticas agregadas
    const totalMaquinasApagadas = rawData.reduce((acc, curr) => acc + curr.total_maquinas_apagadas, 0);
    const totalIncidencias = rawData.reduce((acc, curr) => acc + curr.total_incidencias_maquinas, 0);
    const totalSalasAfectadas = new Set(rawData.map(item => item.sala_id)).size;

    return {
      añoActual: añoSeleccionado,
      mesActual: mesSeleccionado,
      quincenaActual: getCurrentQuincena(),
      totalMaquinasApagadas,
      totalIncidencias,
      totalSalasAfectadas
    };
  };

  // Query para obtener estadísticas
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['estado-maquinas-stats', añoSeleccionado, mesSeleccionado],
    queryFn: fetchEstadoMaquinasStats,
    refetchOnWindowFocus: true,
    staleTime: 60000 // Cache por 1 minuto
  });

  // Función para agregar incidencia de máquinas
  const addIncidenciaMaquinas = async (detalles: {
    area_id: string;
    sala_id: string;
    clasificacion_id: string;
    reportado_por: string;
    cantidad_maquinas: number;
    fecha_incidencia?: string;
  }) => {
    try {
      const fecha = detalles.fecha_incidencia || new Date().toISOString();
      
      // Usar el RPC para actualizar conteo quincenal de máquinas
      const { error } = await supabase.rpc('actualizar_conteo_quincenal_maquinas', {
        p_sala_id: detalles.sala_id,
        p_cantidad_maquinas: detalles.cantidad_maquinas,
        p_fecha: fecha.split('T')[0] // Solo la fecha
      });

      if (error) {
        console.error('Error adding incidencia máquinas:', error);
        throw error;
      }

      // Refrescar datos después de agregar
      await refetch();
      
      return { success: true };
    } catch (error) {
      console.error('Error in addIncidenciaMaquinas:', error);
      return { success: false, error };
    }
  };

  return {
    stats,
    loading: isLoading,
    error,
    refetch,
    addIncidenciaMaquinas,
    getCurrentQuincena
  };
};