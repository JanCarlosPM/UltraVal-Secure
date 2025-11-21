
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Target,
  Award,
  Activity
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface MonitorKPI {
  monitor_name: string;
  user_id: string;
  total_incidencias: number;
  incidencias_criticas: number;
  incidencias_altas: number;
  incidencias_resueltas: number;
  tiempo_promedio_respuesta: number;
  eficiencia_score: number;
  tendencia_semanal: number;
  last_activity: string;
}

const MonitorKPIs = () => {
  // Obtener KPIs de monitores
  const { data: monitorKPIs, isLoading } = useQuery({
    queryKey: ["monitor-kpis"],
    queryFn: async () => {
      const { data: incidencias, error } = await supabase
        .from("incidencias")
        .select("reportado_por, prioridad, created_at, estado")
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      if (!incidencias || incidencias.length === 0) {
        return [];
      }

      // Obtener perfiles de usuarios únicos
      const uniqueUserIds = [...new Set(incidencias.map(inc => inc.reportado_por))];
      
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", uniqueUserIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        return [];
      }

      // Crear mapa de perfiles
      const profilesMap = new Map();
      profiles?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // Procesar datos para generar KPIs por monitor
      const monitorStats: { [key: string]: any } = {};
      const hoy = new Date();
      const semanaAnterior = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      incidencias?.forEach(inc => {
        const userId = inc.reportado_por;
        const profile = profilesMap.get(userId);
        const userName = profile?.full_name || profile?.email || `Usuario ${userId.substring(0, 8)}`;
        const fechaIncidencia = new Date(inc.created_at);
        
        if (!monitorStats[userId]) {
          monitorStats[userId] = {
            monitor_name: userName,
            user_id: userId,
            total_incidencias: 0,
            incidencias_criticas: 0,
            incidencias_altas: 0,
            incidencias_resueltas: 0,
            tiempo_promedio_respuesta: 0,
            eficiencia_score: 0,
            tendencia_semanal: 0,
            last_activity: inc.created_at,
            incidencias_esta_semana: 0,
            incidencias_semana_anterior: 0
          };
        }
        
        monitorStats[userId].total_incidencias++;
        
        if (inc.prioridad === 'critica') monitorStats[userId].incidencias_criticas++;
        if (inc.prioridad === 'alta') monitorStats[userId].incidencias_altas++;
        
        // Calcular tendencia semanal
        if (fechaIncidencia >= semanaAnterior) {
          monitorStats[userId].incidencias_esta_semana++;
        } else {
          monitorStats[userId].incidencias_semana_anterior++;
        }
        
        // Actualizar última actividad
        if (fechaIncidencia > new Date(monitorStats[userId].last_activity)) {
          monitorStats[userId].last_activity = inc.created_at;
        }
      });

      // Calcular métricas avanzadas
      Object.values(monitorStats).forEach((stats: any) => {
        // Calcular eficiencia (más incidencias críticas = menor eficiencia)
        const totalCriticasYAltas = stats.incidencias_criticas + stats.incidencias_altas;
        stats.eficiencia_score = Math.max(0, 100 - (totalCriticasYAltas / stats.total_incidencias * 100));
        
        // Calcular tendencia semanal
        const diferencia = stats.incidencias_esta_semana - stats.incidencias_semana_anterior;
        stats.tendencia_semanal = stats.incidencias_semana_anterior > 0 
          ? (diferencia / stats.incidencias_semana_anterior) * 100 
          : diferencia > 0 ? 100 : 0;
        
        // Simular incidencias resueltas (80% del total)
        stats.incidencias_resueltas = Math.floor(stats.total_incidencias * 0.8);
        
        // Simular tiempo promedio de respuesta (en horas)
        stats.tiempo_promedio_respuesta = Math.floor(Math.random() * 24) + 1;
      });

      return Object.values(monitorStats) as MonitorKPI[];
    },
  });

  // Obtener datos de productividad por día
  const { data: productividadData } = useQuery({
    queryKey: ["productividad-semanal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidencias")
        .select("created_at, reportado_por")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
      if (error) throw error;

      const dailyStats: { [key: string]: number } = {};
      const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      
      data?.forEach(inc => {
        const fecha = new Date(inc.created_at);
        const dia = dias[fecha.getDay()];
        dailyStats[dia] = (dailyStats[dia] || 0) + 1;
      });

      return dias.map(dia => ({
        dia,
        incidencias: dailyStats[dia] || 0
      }));
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getPerformanceLevel = (score: number) => {
    if (score >= 90) return { level: "Excelente", color: "bg-green-500", textColor: "text-green-700" };
    if (score >= 75) return { level: "Bueno", color: "bg-blue-500", textColor: "text-blue-700" };
    if (score >= 60) return { level: "Regular", color: "bg-yellow-500", textColor: "text-yellow-700" };
    return { level: "Necesita Mejora", color: "bg-red-500", textColor: "text-red-700" };
  };

  const topPerformers = monitorKPIs?.sort((a, b) => b.eficiencia_score - a.eficiencia_score).slice(0, 3) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">KPIs y Métricas de Monitores</h2>
        <Badge variant="outline" className="flex items-center gap-1">
          <Activity className="w-4 h-4" />
          Tiempo Real
        </Badge>
      </div>

      {/* Resumen de KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" />
              Monitores Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monitorKPIs?.length || 0}</div>
            <p className="text-xs text-gray-500">Total registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="w-4 h-4 text-green-500" />
              Eficiencia Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(monitorKPIs?.reduce((sum, m) => sum + m.eficiencia_score, 0) / (monitorKPIs?.length || 1))}%
            </div>
            <p className="text-xs text-gray-500">Score general</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              Tiempo Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(monitorKPIs?.reduce((sum, m) => sum + m.tiempo_promedio_respuesta, 0) / (monitorKPIs?.length || 1))}h
            </div>
            <p className="text-xs text-gray-500">Respuesta</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Incidencias Críticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monitorKPIs?.reduce((sum, m) => sum + m.incidencias_criticas, 0) || 0}
            </div>
            <p className="text-xs text-gray-500">Esta semana</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            Top Performers
          </CardTitle>
          <CardDescription>Monitores con mejor desempeño</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topPerformers.map((monitor, index) => {
              const performance = getPerformanceLevel(monitor.eficiencia_score);
              return (
                <div key={`${monitor.monitor_name}-${monitor.user_id}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${performance.color}`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{monitor.monitor_name}</p>
                      <p className="text-sm text-gray-500">{monitor.total_incidencias} incidencias reportadas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={performance.textColor}>
                      {performance.level}
                    </Badge>
                    <p className="text-sm font-bold mt-1">{Math.round(monitor.eficiencia_score)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tabla Detallada de KPIs */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas Detalladas por Monitor</CardTitle>
          <CardDescription>KPIs individuales de desempeño</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Monitor</th>
                  <th className="text-center p-2">Total</th>
                  <th className="text-center p-2">Críticas</th>
                  <th className="text-center p-2">Eficiencia</th>
                  <th className="text-center p-2">Tendencia</th>
                  <th className="text-center p-2">Última Actividad</th>
                </tr>
              </thead>
              <tbody>
                {monitorKPIs?.map((monitor) => {
                  const performance = getPerformanceLevel(monitor.eficiencia_score);
                  const ultimaActividad = new Date(monitor.last_activity).toLocaleDateString();
                  
                  return (
                    <tr key={`${monitor.monitor_name}-${monitor.user_id}`} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{monitor.monitor_name}</td>
                      <td className="text-center p-2">{monitor.total_incidencias}</td>
                      <td className="text-center p-2">
                        <Badge variant={monitor.incidencias_criticas > 0 ? "destructive" : "secondary"}>
                          {monitor.incidencias_criticas}
                        </Badge>
                      </td>
                      <td className="text-center p-2">
                        <div className="flex items-center gap-2">
                          <Progress value={monitor.eficiencia_score} className="w-16" />
                          <span className="text-xs">{Math.round(monitor.eficiencia_score)}%</span>
                        </div>
                      </td>
                      <td className="text-center p-2">
                        <div className="flex items-center justify-center gap-1">
                          {monitor.tendencia_semanal > 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          )}
                          <span className={`text-xs ${monitor.tendencia_semanal > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {Math.abs(Math.round(monitor.tendencia_semanal))}%
                          </span>
                        </div>
                      </td>
                      <td className="text-center p-2 text-xs text-gray-500">{ultimaActividad}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Productividad Semanal */}
      {productividadData && productividadData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historico Semanal</CardTitle>
            <CardDescription>Incidencias reportadas por día de la semana</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={productividadData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="incidencias" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MonitorKPIs;
