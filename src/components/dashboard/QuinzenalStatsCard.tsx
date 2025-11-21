import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuinzenalStats } from '@/hooks/useQuinzenalStats';
import { Clock, LogOut, RefreshCw, TrendingUp, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const QuinzenalStatsCard = () => {
  const { stats, loading, error, refetch } = useQuinzenalStats();
  const { profile } = useAuth();

  // Mostrar para todos los usuarios autenticados para pruebas
  if (!profile) {
    return null;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Error en Estadísticas Quincenales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={refetch} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const MinutosPorSala = ({ minutosPorSala }: { minutosPorSala: Record<string, number> }) => {
    const salasConMinutos = Object.entries(minutosPorSala).filter(([_, minutos]) => minutos > 0);
    
    if (salasConMinutos.length === 0) {
      return <div className="text-sm text-gray-500">No hay minutos registrados</div>;
    }

    return (
      <div className="space-y-2">
        {salasConMinutos.map(([sala, minutos]) => (
          <div key={sala} className="flex justify-between items-center p-2 bg-white rounded border">
            <span className="text-sm font-medium">{sala}</span>
            <Badge variant="outline" className="text-orange-700 border-orange-300">
              {minutos} min
            </Badge>
          </div>
        ))}
      </div>
    );
  };
};

export default QuinzenalStatsCard;