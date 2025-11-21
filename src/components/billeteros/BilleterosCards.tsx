import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Wrench, Code, Trash2, AlertTriangle } from "lucide-react";
import { Billetero } from "@/hooks/useBilleteros";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BilleterosCardsProps {
  billeteros: Billetero[];
}

export const BilleterosCards = ({ billeteros }: BilleterosCardsProps) => {
  const totalBilleteros = billeteros.length;
  const totalAsignados = billeteros.filter(b => b.estado === 'asignado').length;
  const enStock = billeteros.filter(b => b.estado === 'en_stock').length;
  const enReparacion = billeteros.filter(b => b.estado === 'reparacion').length;
  const enProgramacion = billeteros.filter(b => b.estado === 'en_programacion').length;
  
  const descarte = billeteros.filter(b => b.estado === 'descarte').length;

  const estadisticas = [
    { 
      titulo: 'Total Billeteros', 
      valor: totalBilleteros,
      icon: Package, 
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
    },
    { 
      titulo: 'Total Asignados', 
      valor: totalAsignados,
      icon: Package, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    { 
      titulo: 'En Stock', 
      valor: enStock, 
      icon: Package, 
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    { 
      titulo: 'En Reparación', 
      valor: enReparacion, 
      icon: Wrench, 
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    { 
      titulo: 'En Programación', 
      valor: enProgramacion, 
      icon: Code, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      titulo: 'Descarte', 
      valor: descarte, 
      icon: Trash2, 
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
  ];

  return (
    <div className="space-y-4">
      {enStock < 10 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ¡Alerta! Stock bajo: Solo quedan {enStock} billeteros disponibles en stock. Se recomienda reabastecer.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {estadisticas.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.titulo}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.titulo}
                </CardTitle>
                <div className={`${stat.bgColor} p-2 rounded-full`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.valor}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.valor === 1 ? 'billetero' : 'billeteros'}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
