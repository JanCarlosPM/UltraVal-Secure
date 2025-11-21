import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
  LineChart,
  Line,
} from 'recharts';
import { TrendingUp, DollarSign, Clock, CheckCircle2, XCircle, CreditCard } from 'lucide-react';
import { useGestionPagos } from '@/hooks/useGestionPagos';

const COLORS = {
  pendiente: '#f59e0b',
  aprobado: '#17ed50ff',
  rechazado: '#ef4444',
  pagado: '#170ce9ff',
}
export const EstadisticasPagos = () => {
  const { estadisticas, solicitudes } = useGestionPagos();

  if (!estadisticas) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Datos para gráfico de estados
  const datosEstados = [
    { nombre: 'Pendiente', valor: estadisticas.solicitudes_pendientes, color: COLORS.pendiente },
    { nombre: 'Aprobado', valor: estadisticas.solicitudes_aprobadas, color: COLORS.aprobado },
    { nombre: 'Rechazado', valor: estadisticas.solicitudes_rechazadas, color: COLORS.rechazado },
    //{ nombre: 'Pagado', valor: estadisticas.solicitudes_pagadas, color: COLORS.pagado },
  ];

  // Datos para gráfico de montos
  const datosMontos = [
    { 
      nombre: 'Pendiente', 
      monto: Number(estadisticas.monto_total_pendiente) || 0, 
      color: COLORS.pendiente 
    },
    { 
      nombre: 'Aprobado', 
      monto: Number(estadisticas.monto_total_aprobado) || 0, 
      color: COLORS.aprobado 
    },
    /*{ 
      nombre: 'Pagado', 
      monto: Number(estadisticas.monto_total_pagado) || 0, 
      color: COLORS.pagado 
    },*/
  ];

  // Calcular porcentajes de eficiencia
  const totalSolicitudes = estadisticas.total_solicitudes;
  const porcentajeAprobacion = totalSolicitudes > 0 
    ? ((estadisticas.solicitudes_aprobadas + estadisticas.solicitudes_pagadas) / totalSolicitudes) * 100 
    : 0;

  const porcentajeProcesadas = totalSolicitudes > 0 
    ? ((totalSolicitudes - estadisticas.solicitudes_pendientes) / totalSolicitudes) * 100 
    : 0;

  // Datos de tendencia por mes (simulados - en producción vendrían de la DB)
  const tendenciaMensual = [
    { mes: 'Ene', solicitudes: 45, montoTotal: 125000 },
    { mes: 'Feb', solicitudes: 52, montoTotal: 148000 },
    { mes: 'Mar', solicitudes: 38, montoTotal: 95000 },
    { mes: 'Abr', solicitudes: 61, montoTotal: 175000 },
    { mes: 'May', solicitudes: 55, montoTotal: 162000 },
    { mes: 'Jun', solicitudes: estadisticas.total_solicitudes, montoTotal: Number(estadisticas.monto_total_pagado) + Number(estadisticas.monto_total_aprobado) + Number(estadisticas.monto_total_pendiente) },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Solicitudes</p>
                <p className="text-3xl font-bold">{estadisticas.total_solicitudes}</p>
                <p className="text-xs text-muted-foreground">Este mes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monto Total</p>
                <p className="text-3xl font-bold">
                  ${(Number(estadisticas.monto_total_pagado) + Number(estadisticas.monto_total_aprobado) + Number(estadisticas.monto_total_pendiente)).toLocaleString()}
                </p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +12% vs mes anterior
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tiempo Promedio</p>
                <p className="text-3xl font-bold">2.5</p>
                <p className="text-xs text-muted-foreground">días de procesamiento</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tasa de Aprobación</p>
                <p className="text-3xl font-bold">{porcentajeAprobacion.toFixed(1)}%</p>
                <p className="text-xs text-purple-600">Excelente rendimiento</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por estados */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Estados</CardTitle>
            <CardDescription>
              Solicitudes agrupadas por su estado actual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={datosEstados}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="valor"
                  label={({ nombre, valor }) => `${nombre}: ${valor}`}
                >
                  {datosEstados.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Montos por estado */}
        <Card>
          <CardHeader>
            <CardTitle>Montos por Estado</CardTitle>
            <CardDescription>
              Distribución de montos según el estado de las solicitudes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosMontos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Monto']} />
                <Bar dataKey="monto" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Métricas de eficiencia */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Eficiencia de Procesamiento</CardTitle>
            <CardDescription>
              Porcentaje de solicitudes procesadas vs pendientes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Solicitudes Procesadas</span>
                <span className="text-sm text-muted-foreground">{porcentajeProcesadas.toFixed(1)}%</span>
              </div>
              <Progress value={porcentajeProcesadas} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Tasa de Aprobación</span>
                <span className="text-sm text-muted-foreground">{porcentajeAprobacion.toFixed(1)}%</span>
              </div>
              <Progress value={porcentajeAprobacion} className="h-2" />
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span>Meta mensual:</span>
                <span className="font-medium">95%</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Rendimiento actual:</span>
                <span className={porcentajeProcesadas >= 95 ? 'text-green-600' : 'text-orange-600'}>
                  {porcentajeProcesadas >= 95 ? 'Objetivo alcanzado' : 'Por debajo del objetivo'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tendencia Mensual</CardTitle>
            <CardDescription>
              Evolución de solicitudes y montos en los últimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={tendenciaMensual}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="solicitudes" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Solicitudes"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Resumen ejecutivo */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen Ejecutivo</CardTitle>
          <CardDescription>
            Análisis y recomendaciones basadas en las métricas actuales
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Fortalezas</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Alta tasa de aprobación ({porcentajeAprobacion.toFixed(1)}%)</li>
                <li>• Proceso eficiente de revisión</li>
                <li>• Sistema de trazabilidad completo</li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">Oportunidades</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Automatizar notificaciones</li>
                <li>• Implementar flujos de aprobación</li>
                <li>• Analítica predictiva</li>
              </ul>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Recomendaciones</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Revisar solicitudes pendientes</li>
                <li>• Establecer límites por concepto</li>
                <li>• Capacitar en el proceso</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};