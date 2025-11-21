import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/ui/stats-card";
import { usePagos724 } from "@/hooks/usePagos724";
import { DollarSign, TrendingUp, Calendar, Clock, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const PagosEstadisticasModule = () => {
  const { estadisticas, loading } = usePagos724();

  const formatearMonto = (monto: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(monto);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Estadísticas Generales</span>
          </CardTitle>
          <CardDescription>
            Resumen general de todos los pagos registrados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatsCard
              title="Total Histórico"
              value={estadisticas?.total_pagos_historico || 0}
              description="Pagos registrados"
              icon={TrendingUp}
            />
            
            <StatsCard
              title="Pagos Hoy"
              value={estadisticas?.pagos_hoy || 0}
              description={format(new Date(), 'dd/MM/yyyy', { locale: es })}
              icon={Calendar}
            />
            
            <StatsCard
              title="Pagos Este Mes"
              value={estadisticas?.pagos_mes_actual || 0}
              description={format(new Date(), 'MMMM yyyy', { locale: es })}
              icon={Calendar}
            />
            
            <div className="p-6 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Suma Total</p>
                  <p className="text-2xl font-bold">{formatearMonto(Number(estadisticas?.suma_total_historica) || 0)}</p>
                  <p className="text-xs text-muted-foreground">Monto total pagado</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>

            <div className="p-6 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Suma Hoy</p>
                  <p className="text-2xl font-bold">{formatearMonto(Number(estadisticas?.suma_hoy) || 0)}</p>
                  <p className="text-xs text-muted-foreground">Total pagado hoy</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>

            <div className="p-6 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Suma Este Mes</p>
                  <p className="text-2xl font-bold">{formatearMonto(Number(estadisticas?.suma_mes_actual) || 0)}</p>
                  <p className="text-xs text-muted-foreground">Total pagado este mes</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Adicionales */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Promedio de Pago</CardTitle>
              <CardDescription>Calculado sobre todos los pagos históricos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {estadisticas.total_pagos_historico > 0
                  ? formatearMonto(Number(estadisticas.suma_total_historica) / estadisticas.total_pagos_historico)
                  : formatearMonto(0)
                }
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Promedio por transacción
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Eficiencia Diaria</CardTitle>
              <CardDescription>Porcentaje de días con al menos un pago</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {estadisticas.pagos_hoy > 0 ? "100%" : "0%"}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Actividad del día actual
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};