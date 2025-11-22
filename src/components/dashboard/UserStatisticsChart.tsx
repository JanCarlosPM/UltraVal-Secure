import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useUserStatistics } from "@/hooks/useUserStatistics";
import { Users, TrendingUp, AlertTriangle } from "lucide-react";

/**
 * Paleta corporativa + colores de severidad
 * UltraVal: verde / blanco / negro
 */
const BRAND_COLORS = {
  primary: "#047857",       // Verde principal
  primaryLight: "#ECFDF3",  // Verde muy claro (fondos suaves)
  primaryDark: "#065F46",   // Verde oscuro (texto/acento)
  neutralBorder: "#E5E7EB",
  neutralText: "#4B5563",
};

const PRIORITY_COLORS = {
  criticas: "#DC2626",  // rojo
  altas: "#EA580C",     // naranja
  medias: "#D97706",    // ámbar
  bajas: "#16A34A",     // verde
};

const UserStatisticsChart = () => {
  const { data: userStats, isLoading } = useUserStatistics();

  /* ================== ESTADOS DE CARGA ================== */

  if (isLoading) {
    return (
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Users className="w-5 h-5 text-emerald-700" />
            Estadísticas por Monitor
          </CardTitle>
          <CardDescription>
            Cargando rendimiento de monitores...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-100 rounded w-3/4" />
            <div className="h-32 bg-slate-100 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!userStats || userStats.length === 0) {
    return (
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Users className="w-5 h-5 text-emerald-700" />
            Estadísticas por Monitor
          </CardTitle>
          <CardDescription>
            Rendimiento y productividad de cada monitor del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            No hay datos disponibles de incidencias registradas por monitores.
          </p>
        </CardContent>
      </Card>
    );
  }

  /* ================== PREPARACIÓN DE DATOS ================== */

  // Top 8 monitores para el gráfico de barras
  const chartData = userStats.slice(0, 8).map((user) => ({
    nombre: user.nombre.split(" ")[0], // solo primer nombre para que quepa mejor
    total: user.total,
    criticas: user.criticas,
    altas: user.altas,
  }));

  // Distribución global de prioridades (para el pie)
  const priorityData = [
    {
      name: "Críticas",
      value: userStats.reduce((sum, u) => sum + u.criticas, 0),
      color: PRIORITY_COLORS.criticas,
    },
    {
      name: "Altas",
      value: userStats.reduce((sum, u) => sum + u.altas, 0),
      color: PRIORITY_COLORS.altas,
    },
    {
      name: "Medias",
      value: userStats.reduce((sum, u) => sum + u.medias, 0),
      color: PRIORITY_COLORS.medias,
    },
    {
      name: "Bajas",
      value: userStats.reduce((sum, u) => sum + u.bajas, 0),
      color: PRIORITY_COLORS.bajas,
    },
  ].filter((item) => item.value > 0);

  const topUser = userStats[0];
  const totalIncidencias = userStats.reduce((sum, u) => sum + u.total, 0);

  /* ================== RENDER ================== */

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <Users className="w-5 h-5 text-emerald-700" />
          Desempeño de Monitores
        </CardTitle>
        <CardDescription className="text-slate-500">
          Visión general de las incidencias registradas por cada monitor y la
          distribución de prioridades en el sistema.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ================== COLUMNA IZQUIERDA: RESUMEN ================== */}
          <div className="space-y-4">
            {/* Monitor más activo */}
            <div
              className="rounded-xl p-4 border"
              style={{
                backgroundColor: BRAND_COLORS.primaryLight,
                borderColor: BRAND_COLORS.neutralBorder,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  Monitor más activo
                </span>
              </div>
              <p className="font-bold text-lg text-slate-900">
                {topUser.nombre}
              </p>
              <p className="text-sm text-slate-600">
                {topUser.total} incidencias registradas
              </p>
            </div>

            {/* Total del sistema */}
            <div className="rounded-xl p-4 border bg-white">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Volumen del sistema
                </span>
              </div>
              <p className="font-bold text-2xl text-slate-900">
                {totalIncidencias}
              </p>
              <p className="text-sm text-slate-600">
                incidencias registradas en el periodo analizado
              </p>
            </div>

            {/* Ranking compacto de monitores */}
            <div className="rounded-xl border bg-slate-50/60 p-3 max-h-60 overflow-y-auto">
              <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                Ranking de monitores (Top 10)
              </p>
              <div className="space-y-2">
                {userStats.slice(0, 10).map((user, index) => (
                  <div
                    key={`${user.nombre}-${index}`}
                    className="flex items-center justify-between rounded-lg bg-white px-2 py-1.5 border border-slate-100"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-semibold bg-slate-800 text-white rounded-full w-6 h-6 flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-slate-800 truncate">
                        {user.nombre}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs font-semibold text-slate-900">
                        {user.total}
                      </span>
                      <div className="flex gap-1 justify-end">
                        {user.criticas > 0 && (
                          <span className="text-[11px] text-red-600 font-medium">
                            C:{user.criticas}
                          </span>
                        )}
                        {user.altas > 0 && (
                          <span className="text-[11px] text-orange-600 font-medium">
                            A:{user.altas}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ================== COLUMNA DERECHA: GRÁFICOS ================== */}
          <div className="lg:col-span-2 space-y-6">
            {/* Gráfico de barras: incidencias por monitor */}
            <div className="rounded-xl border bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm md:text-base text-slate-900">
                  Incidencias por monitor (Top 8)
                </h4>
                <span className="text-[11px] text-slate-500">
                  Total vs incidencias críticas y altas
                </span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="nombre"
                    tick={{ fontSize: 11, fill: "#4B5563" }}
                    angle={-35}
                    textAnchor="end"
                    height={60}
                    axisLine={{ stroke: "#9CA3AF" }}
                    tickLine={{ stroke: "#D1D5DB" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#4B5563" }}
                    axisLine={{ stroke: "#9CA3AF" }}
                    tickLine={{ stroke: "#D1D5DB" }}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(value: any, name: string) => {
                      const labels: Record<string, string> = {
                        total: "Total",
                        criticas: "Críticas",
                        altas: "Altas",
                      };
                      return [value, labels[name] ?? name];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={(value: string) => {
                      const labels: Record<string, string> = {
                        total: "Total",
                        criticas: "Críticas",
                        altas: "Altas",
                      };
                      return labels[value] ?? value;
                    }}
                  />
                  <Bar
                    dataKey="total"
                    name="total"
                    fill={BRAND_COLORS.primary}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="criticas"
                    name="criticas"
                    fill={PRIORITY_COLORS.criticas}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="altas"
                    name="altas"
                    fill={PRIORITY_COLORS.altas}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico circular: distribución de prioridades */}
            <div className="rounded-xl border bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm md:text-base text-slate-900">
                  Distribución global de prioridades
                </h4>
                <span className="text-[11px] text-slate-500">
                  Porcentaje de incidencias por nivel de criticidad
                </span>
              </div>

              {priorityData.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No hay datos de prioridades para mostrar.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {priorityData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke="#FFFFFF"
                          strokeWidth={1}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: string) => [
                        value,
                        name,
                      ]}
                      contentStyle={{ fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserStatisticsChart;
