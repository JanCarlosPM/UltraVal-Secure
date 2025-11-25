
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useUserStatistics } from "@/hooks/useUserStatistics";
import { Users, TrendingUp, AlertTriangle } from "lucide-react";

const COLORS = {
  criticas: '#DC2626',
  altas: '#EA580C', 
  medias: '#D97706',
  bajas: '#65A30D'
};

const UserStatisticsChart = () => {
  const { data: userStats, isLoading } = useUserStatistics();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Estadísticas por Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!userStats || userStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Estadísticas por Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No hay datos disponibles</p>
        </CardContent>
      </Card>
    );
  }

  // Preparar datos para el gráfico de barras
  const chartData = userStats.slice(0, 3).map((user) => ({
    nombre: user.nombre.split(' ')[0], // Solo primer nombre para que quepa mejor
    total: user.total,
    criticas: user.criticas,
    altas: user.altas,
    medias: user.medias,
    bajas: user.bajas
  }));

  // Datos para el gráfico circular de distribución de prioridades
  const priorityData = [
    { name: 'Críticas', value: userStats.reduce((sum, user) => sum + user.criticas, 0), color: COLORS.criticas },
    { name: 'Altas', value: userStats.reduce((sum, user) => sum + user.altas, 0), color: COLORS.altas },
    { name: 'Medias', value: userStats.reduce((sum, user) => sum + user.medias, 0), color: COLORS.medias },
    { name: 'Bajas', value: userStats.reduce((sum, user) => sum + user.bajas, 0), color: COLORS.bajas }
  ].filter(item => item.value > 0);

  const topUser = userStats[0];
  const totalIncidencias = userStats.reduce((sum, user) => sum + user.total, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Estadísticas por Monitor
        </CardTitle>
        <CardDescription>
          Rendimiento y productividad de cada monitor del sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico de barras */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <h4 className="font-medium mb-2">Incidencias por Monitor (Top 8)</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="nombre" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [value, name === 'total' ? 'Total' : name]}
                  />
                  <Bar dataKey="total" fill="#3B82F6" name="Total" />
                  <Bar dataKey="criticas" fill={COLORS.criticas} name="Críticas" />
                  <Bar dataKey="altas" fill={COLORS.altas} name="Altas" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico circular de prioridades */}
            <div>
              <h4 className="font-medium mb-2">Distribución Global de Prioridades</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserStatisticsChart;
