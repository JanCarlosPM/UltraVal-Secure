
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { User, AlertTriangle, TrendingUp, Clock } from "lucide-react";

const MonitorPerformance = () => {
  const { data: monitorsData, isLoading } = useQuery({
    queryKey: ["monitor-performance"],
    queryFn: async () => {
      // Obtener estadísticas por monitor
      const { data: incidencias, error } = await supabase
        .from("incidencias")
        .select(`
          reportado_por,
          prioridad,
          created_at,
          fecha_incidencia
        `);
      
      if (error) throw error;

      // Obtener información de los usuarios/monitores
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("role", "monitor");
      
      if (profilesError) throw profilesError;

      const monitorsStats: { [key: string]: any } = {};
      const hoy = new Date().toISOString().split('T')[0];
      const hace7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Inicializar estadísticas para cada monitor
      profiles?.forEach(profile => {
        monitorsStats[profile.id] = {
          name: profile.full_name || profile.email,
          email: profile.email,
          totalIncidencias: 0,
          incidenciasHoy: 0,
          incidenciasUltimos7Dias: 0,
          incidenciasCriticas: 0,
          promedioTiempoRespuesta: 0,
          eficiencia: 0
        };
      });

      // Calcular estadísticas de incidencias
      incidencias?.forEach(inc => {
        const monitor = monitorsStats[inc.reportado_por];
        if (monitor) {
          monitor.totalIncidencias++;
          
          const fechaIncidencia = inc.fecha_incidencia.split('T')[0];
          if (fechaIncidencia === hoy) {
            monitor.incidenciasHoy++;
          }
          
          if (fechaIncidencia >= hace7Dias) {
            monitor.incidenciasUltimos7Dias++;
          }
          
          if (inc.prioridad === 'critica') {
            monitor.incidenciasCriticas++;
          }

          // Calcular tiempo de respuesta (diferencia entre created_at y fecha_incidencia)
          const tiempoRespuesta = new Date(inc.created_at).getTime() - new Date(inc.fecha_incidencia).getTime();
          monitor.tiempoRespuestaTotal = (monitor.tiempoRespuestaTotal || 0) + tiempoRespuesta;
        }
      });

      // Finalizar cálculos
      Object.values(monitorsStats).forEach((monitor: any) => {
        if (monitor.totalIncidencias > 0) {
          monitor.promedioTiempoRespuesta = Math.round(
            (monitor.tiempoRespuestaTotal || 0) / monitor.totalIncidencias / (1000 * 60)
          ); // en minutos
          
          // Calcular eficiencia basada en: incidencias últimos 7 días / tiempo promedio respuesta
          monitor.eficiencia = monitor.incidenciasUltimos7Dias * 10 - (monitor.promedioTiempoRespuesta || 0) / 10;
          monitor.eficiencia = Math.max(0, Math.min(100, monitor.eficiencia));
        }
      });

      return Object.values(monitorsStats).filter((m: any) => m.totalIncidencias > 0);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const chartData = monitorsData?.map((monitor: any) => ({
    name: monitor.name.split(' ')[0] || monitor.email.split('@')[0],
    incidencias: monitor.totalIncidencias,
    criticas: monitor.incidenciasCriticas,
    eficiencia: monitor.eficiencia
  })) || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {monitorsData?.slice(0, 4).map((monitor: any, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-blue-500" />
                {monitor.name.split(' ')[0] || 'Monitor'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Total</span>
                <span className="font-bold text-lg">{monitor.totalIncidencias}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Hoy</span>
                <span className="font-semibold text-green-600">{monitor.incidenciasHoy}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Críticas</span>
                <span className="font-semibold text-red-600">{monitor.incidenciasCriticas}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Eficiencia</span>
                <span className="font-semibold text-purple-600">{Math.round(monitor.eficiencia)}%</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rendimiento por Monitor</CardTitle>
            <CardDescription>
              Comparación de incidencias totales y críticas por monitor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="incidencias" fill="#3B82F6" name="Total Incidencias" />
                <Bar dataKey="criticas" fill="#DC2626" name="Críticas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MonitorPerformance;
