import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { es } from "date-fns/locale";

export const usePeriodComparison = () => {
  return useQuery({
    queryKey: ["period-comparison"],
    queryFn: async () => {
      const ahora = new Date();
      const mesActual = {
        inicio: startOfMonth(ahora),
        fin: endOfMonth(ahora)
      };
      const mesAnterior = {
        inicio: startOfMonth(subMonths(ahora, 1)),
        fin: endOfMonth(subMonths(ahora, 1))
      };

      // Obtener datos del mes actual - SOLO INCIDENCIAS APROBADAS
      const { data: datosActuales, error: errorActual } = await supabase
        .from("incidencias")
        .select(`
          id,
          prioridad,
          area_id,
          clasificacion_id,
          sala_id,
          tiempo_minutos,
          created_at,
          areas(nombre),
          clasificaciones(nombre),
          salas(nombre)
        `)
        .eq("estado", "aprobado")
        .gte("created_at", mesActual.inicio.toISOString())
        .lte("created_at", mesActual.fin.toISOString());

      if (errorActual) {
        console.error("Error fetching current month data:", errorActual);
        return null;
      }

      // Obtener datos del mes anterior - SOLO INCIDENCIAS APROBADAS
      const { data: datosAnteriores, error: errorAnterior } = await supabase
        .from("incidencias")
        .select(`
          id,
          prioridad,
          area_id,
          clasificacion_id,
          sala_id,
          tiempo_minutos,
          created_at,
          areas(nombre),
          clasificaciones(nombre),
          salas(nombre)
        `)
        .eq("estado", "aprobado")
        .gte("created_at", mesAnterior.inicio.toISOString())
        .lte("created_at", mesAnterior.fin.toISOString());

      if (errorAnterior) {
        console.error("Error fetching previous month data:", errorAnterior);
        return null;
      }

      // Procesar estadísticas del mes actual
      const statsActuales = procesarEstadisticas(datosActuales || []);
      const statsAnteriores = procesarEstadisticas(datosAnteriores || []);

      // Calcular tendencias
      const tendencias = {
        total: calcularTendencia(statsActuales.total, statsAnteriores.total),
        criticas: calcularTendencia(statsActuales.criticas, statsAnteriores.criticas),
        altas: calcularTendencia(statsActuales.altas, statsAnteriores.altas),
        medias: calcularTendencia(statsActuales.medias, statsAnteriores.medias),
        bajas: calcularTendencia(statsActuales.bajas, statsAnteriores.bajas)
      };

      // Análisis de reincidencias por SALA (no por área)
      const reincidenciasActuales = analizarReincidenciasPorSala(datosActuales || []);
      const reincidenciasAnteriores = analizarReincidenciasPorSala(datosAnteriores || []);

      return {
        mesActual: {
          nombre: format(mesActual.inicio, 'MMMM yyyy', { locale: es }),
          stats: statsActuales,
          reincidencias: reincidenciasActuales
        },
        mesAnterior: {
          nombre: format(mesAnterior.inicio, 'MMMM yyyy', { locale: es }),
          stats: statsAnteriores,
          reincidencias: reincidenciasAnteriores
        },
        tendencias,
        comparacion: {
          mejorSala: encontrarMejorSala(reincidenciasActuales, reincidenciasAnteriores),
          peorSala: encontrarPeorSala(reincidenciasActuales, reincidenciasAnteriores)
        }
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
  });
};

const procesarEstadisticas = (datos: any[]) => {
  return {
    total: datos.length,
    criticas: datos.filter(d => d.prioridad === 'critica').length,
    altas: datos.filter(d => d.prioridad === 'alta').length,
    medias: datos.filter(d => d.prioridad === 'media').length,
    bajas: datos.filter(d => d.prioridad === 'baja').length,
    porArea: datos.reduce((acc: any, item: any) => {
      const area = item.areas?.nombre || 'Sin área';
      acc[area] = (acc[area] || 0) + 1;
      return acc;
    }, {}),
    porSala: datos.reduce((acc: any, item: any) => {
      const sala = item.salas?.nombre || 'Sin sala';
      acc[sala] = (acc[sala] || 0) + 1;
      return acc;
    }, {}),
    porClasificacion: datos.reduce((acc: any, item: any) => {
      const clasificacion = item.clasificaciones?.nombre || 'Sin clasificación';
      acc[clasificacion] = (acc[clasificacion] || 0) + 1;
      return acc;
    }, {})
  };
};

const calcularTendencia = (actual: number, anterior: number) => {
  if (anterior === 0) return actual > 0 ? 100 : 0;
  return Math.round(((actual - anterior) / anterior) * 100);
};

const analizarReincidenciasPorSala = (datos: any[]) => {
  const reincidencias: any = {};
  
  datos.forEach(item => {
    const sala = item.salas?.nombre || 'Sin sala';
    const clasificacion = item.clasificaciones?.nombre || 'Sin clasificación';
    const key = `${sala}-${clasificacion}`;
    
    if (!reincidencias[key]) {
      reincidencias[key] = {
        sala,
        clasificacion,
        count: 0,
        tiempoTotal: 0,
        incidencias: []
      };
    }
    
    reincidencias[key].count += 1;
    reincidencias[key].tiempoTotal += item.tiempo_minutos || 0;
    reincidencias[key].incidencias.push(item);
  });

  return Object.values(reincidencias)
    .filter((r: any) => r.count > 1)
    .sort((a: any, b: any) => b.count - a.count);
};

const encontrarMejorSala = (actuales: any[], anteriores: any[]) => {
  const mejoras = actuales.map(actual => {
    const anterior = anteriores.find(a => a.sala === actual.sala);
    if (!anterior) return null;
    
    const reduccion = anterior.count - actual.count;
    return {
      sala: actual.sala,
      reduccion,
      porcentaje: anterior.count > 0 ? Math.round((reduccion / anterior.count) * 100) : 0
    };
  }).filter(Boolean).sort((a: any, b: any) => b.reduccion - a.reduccion);

  return mejoras[0] || null;
};

const encontrarPeorSala = (actuales: any[], anteriores: any[]) => {
  const empeoramientos = actuales.map(actual => {
    const anterior = anteriores.find(a => a.sala === actual.sala) || { count: 0 };
    const aumento = actual.count - anterior.count;
    
    return {
      sala: actual.sala,
      aumento,
      porcentaje: anterior.count > 0 ? Math.round((aumento / anterior.count) * 100) : 100
    };
  }).filter((e: any) => e.aumento > 0).sort((a: any, b: any) => b.aumento - a.aumento);

  return empeoramientos[0] || null;
};
