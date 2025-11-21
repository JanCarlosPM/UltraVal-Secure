
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, TrendingDown, AlertTriangle, BarChart3 } from "lucide-react";
import { usePeriodComparison } from "@/hooks/usePeriodComparison";
import { Badge } from "@/components/ui/badge";

const PeriodComparisonCard = () => {
  const { data: comparison, isLoading } = usePeriodComparison();

  // Verificar que tenemos datos válidos
  const mesActual = comparison?.mesActual || { nombre: 'Mes actual', stats: { total: 0, criticas: 0 } };
  const mesAnterior = comparison?.mesAnterior || { nombre: 'Mes anterior', stats: { total: 0, criticas: 0 } };
  const tendencias = comparison?.tendencias || { total: 0, criticas: 0 };

  const getTrendBadgeVariant = (value: number) => {
    if (value > 0) return 'destructive';
    if (value < 0) return 'secondary';
    return 'outline';
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-3 h-3" />;
    if (value < 0) return <TrendingDown className="w-3 h-3" />;
    return <BarChart3 className="w-3 h-3" />;
  };
};

export default PeriodComparisonCard;
