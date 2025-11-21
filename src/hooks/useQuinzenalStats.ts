
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface QuinzenalStats {
  primera_quincena: {
    ingresos_tardios: number;
    cierres_prematuros: number;
    periodo: string;
    minutos_totales_por_sala: Record<string, number>;
  };
  segunda_quincena: {
    ingresos_tardios: number;
    cierres_prematuros: number;
    periodo: string;
    minutos_totales_por_sala: Record<string, number>;
  };
}

export const useQuinzenalStats = () => {
  const [stats, setStats] = useState<QuinzenalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCurrentQuincena = () => {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    if (day <= 15) {
      return {
        periodo: 'primera',
        inicio: new Date(year, month - 1, 1),
        fin: new Date(year, month - 1, 15, 23, 59, 59)
      };
    } else {
      const lastDay = new Date(year, month, 0).getDate();
      return {
        periodo: 'segunda',
        inicio: new Date(year, month - 1, 16),
        fin: new Date(year, month - 1, lastDay, 23, 59, 59)
      };
    }
  };

  const fetchQuinzenalStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      console.log('Fetching quincenal stats for year:', year, 'month:', month);

      // Usar la función de base de datos para obtener estadísticas quincenales
      const { data: estadisticas, error: statsError } = await supabase
        .rpc('obtener_estadisticas_quincenales_sala', {
          p_año: year,
          p_mes: month
        });

      if (statsError) {
        console.error('Error fetching quincenal stats:', statsError);
        throw statsError;
      }

      console.log('Quincenal stats data:', estadisticas);

      // Procesar datos para primera quincena
      const primeraQuincena = estadisticas?.filter((stat: any) => stat.quincena === 1) || [];
      const segundaQuincena = estadisticas?.filter((stat: any) => stat.quincena === 2) || [];

      // Calcular totales y minutos por sala para primera quincena
      const primeraMinutosPorSala: Record<string, number> = {};
      let primeraIngresosTotal = 0;
      let primeraCierresTotal = 0;

      primeraQuincena.forEach((stat: any) => {
        const totalMinutos = stat.minutos_ingresos_tardios + stat.minutos_cierres_prematuros;
        if (totalMinutos > 0) {
          primeraMinutosPorSala[stat.sala_nombre] = totalMinutos;
        }
        primeraIngresosTotal += stat.total_incidencias_ingresos;
        primeraCierresTotal += stat.total_incidencias_cierres;
      });

      // Calcular totales y minutos por sala para segunda quincena
      const segundaMinutosPorSala: Record<string, number> = {};
      let segundaIngresosTotal = 0;
      let segundaCierresTotal = 0;

      segundaQuincena.forEach((stat: any) => {
        const totalMinutos = stat.minutos_ingresos_tardios + stat.minutos_cierres_prematuros;
        if (totalMinutos > 0) {
          segundaMinutosPorSala[stat.sala_nombre] = totalMinutos;
        }
        segundaIngresosTotal += stat.total_incidencias_ingresos;
        segundaCierresTotal += stat.total_incidencias_cierres;
      });

      const statsResult = {
        primera_quincena: {
          ingresos_tardios: primeraIngresosTotal,
          cierres_prematuros: primeraCierresTotal,
          periodo: `Primera quincena ${month}/${year}`,
          minutos_totales_por_sala: primeraMinutosPorSala
        },
        segunda_quincena: {
          ingresos_tardios: segundaIngresosTotal,
          cierres_prematuros: segundaCierresTotal,
          periodo: `Segunda quincena ${month}/${year}`,
          minutos_totales_por_sala: segundaMinutosPorSala
        }
      };

      console.log('Processed stats:', statsResult);
      setStats(statsResult);

    } catch (error) {
      console.error('Error fetching quinzenal stats:', error);
      setError('Error al cargar las estadísticas quincenales');
    } finally {
      setLoading(false);
    }
  };

  const addIncidenciaToCount = async (
    tipo: 'ingreso_tardio' | 'cierre_prematuro', 
    detalles: {
      area_id: string;
      sala_id: string;
      clasificacion_id: string;
      reportado_por: string;
      tiempo_minutos: number;
      fecha_incidencia?: string;
    }
  ) => {
    try {
      console.log('Adding incidencia to quinzenal count:', { tipo, detalles });

      // Usar la función de base de datos para actualizar el conteo
      const { data, error } = await supabase
        .rpc('actualizar_conteo_quincenal_sala', {
          p_sala_id: detalles.sala_id,
          p_tipo_incidencia: tipo,
          p_minutos: detalles.tiempo_minutos || 0,
          p_fecha: detalles.fecha_incidencia ? detalles.fecha_incidencia.split('T')[0] : new Date().toISOString().split('T')[0]
        });

      if (error) {
        console.error('Error updating quinzenal count:', error);
        throw error;
      }

      console.log('Quinzenal count updated successfully:', data);
      
      // Refrescar estadísticas
      await fetchQuinzenalStats();
      
      return true;
    } catch (error) {
      console.error('Error adding quinzenal count:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchQuinzenalStats();
  }, []);

  return {
    stats,
    loading,
    error,
    refetch: fetchQuinzenalStats,
    addIncidenciaToCount,
    getCurrentQuincena
  };
};
