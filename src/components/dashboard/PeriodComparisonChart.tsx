
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { usePeriodComparison } from "@/hooks/usePeriodComparison";
import { TrendingUp, TrendingDown, Calendar, AlertCircle, Award, Clock } from "lucide-react";

const PeriodComparisonChart = () => {
  const { data: comparison, isLoading } = usePeriodComparison();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Comparación por Períodos
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

  if (!comparison) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Comparación por Períodos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No hay datos disponibles para comparar</p>
        </CardContent>
      </Card>
    );
  }

  // Datos para el gráfico de tendencias
  const trendData = [
    {
      categoria: 'Total',
      actual: comparison.mesActual.stats.total,
      anterior: comparison.mesAnterior.stats.total,
      tendencia: comparison.tendencias.total
    },
    {
      categoria: 'Críticas',
      actual: comparison.mesActual.stats.criticas,
      anterior: comparison.mesAnterior.stats.criticas,
      tendencia: comparison.tendencias.criticas
    },
    {
      categoria: 'Altas',
      actual: comparison.mesActual.stats.altas,
      anterior: comparison.mesAnterior.stats.altas,
      tendencia: comparison.tendencias.altas
    },
    {
      categoria: 'Medias',
      actual: comparison.mesActual.stats.medias,
      anterior: comparison.mesAnterior.stats.medias,
      tendencia: comparison.tendencias.medias
    },
    {
      categoria: 'Bajas',
      actual: comparison.mesActual.stats.bajas,
      anterior: comparison.mesAnterior.stats.bajas,
      tendencia: comparison.tendencias.bajas
    }
  ];

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (value < 0) return <TrendingDown className="w-4 h-4 text-green-500" />;
    return <span className="w-4 h-4 text-gray-400">—</span>;
  };

  const getTrendColor = (value: number) => {
    if (value > 10) return 'text-red-600 bg-red-50';
    if (value < -10) return 'text-green-600 bg-green-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Análisis Comparativo de Períodos
        </CardTitle>
        <CardDescription>
          Comparación entre {comparison.mesActual.nombre} y {comparison.mesAnterior.nombre}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Resumen de tendencias */}
          <div className="space-y-4">
            <h4 className="font-medium text-lg">Tendencias</h4>
            {trendData.map((item) => (
              <div key={item.categoria} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <span className="text-sm font-medium">{item.categoria}</span>
                  <div className="text-xs text-gray-500">
                    {item.anterior} → {item.actual}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(item.tendencia)}
                  <span className={`text-sm px-2 py-1 rounded ${getTrendColor(item.tendencia)}`}>
                    {item.tendencia > 0 ? '+' : ''}{item.tendencia}%
                  </span>
                </div>
              </div>
            ))}

            {/* Highlights de mejores y peores salas */}
            <div className="space-y-3 mt-6">
              {comparison.comparacion.mejorSala && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Mejor Sala</span>
                  </div>
                  <p className="text-sm text-green-700">{comparison.comparacion.mejorSala.sala}</p>
                  <p className="text-xs text-green-600">
                    Reducción del {Math.abs(comparison.comparacion.mejorSala.porcentaje)}%
                  </p>
                </div>
              )}

              {comparison.comparacion.peorSala && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800">Sala Crítica</span>
                  </div>
                  <p className="text-sm text-red-700">{comparison.comparacion.peorSala.sala}</p>
                  <p className="text-xs text-red-600">
                    Aumento del {comparison.comparacion.peorSala.porcentaje}%
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Gráfico comparativo */}
          <div className="lg:col-span-2">
            <h4 className="font-medium mb-4">Comparación Mensual</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="categoria" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    value, 
                    name === 'actual' ? comparison.mesActual.nombre : comparison.mesAnterior.nombre
                  ]}
                />
                <Bar dataKey="anterior" fill="#94A3B8" name="Mes Anterior" />
                <Bar dataKey="actual" fill="#3B82F6" name="Mes Actual" />
              </BarChart>
            </ResponsiveContainer>

            {/* Análisis de reincidencias por SALA */}
            <div className="mt-6">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Reincidencias por Sala (Mes Actual)
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {comparison.mesActual.reincidencias.slice(0, 5).map((reincidencia: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <div>
                      <span className="text-sm font-medium">{reincidencia.sala}</span>
                      <p className="text-xs text-gray-600">{reincidencia.clasificacion}</p>
                      {reincidencia.tiempoTotal > 0 && (
                        <p className="text-xs text-orange-600">
                          {reincidencia.tiempoTotal} min total ({Math.round(reincidencia.tiempoTotal / reincidencia.count)} min promedio)
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                        {reincidencia.count} veces
                      </span>
                    </div>
                  </div>
                ))}
                {comparison.mesActual.reincidencias.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No se detectaron reincidencias significativas por sala este mes
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PeriodComparisonChart;
