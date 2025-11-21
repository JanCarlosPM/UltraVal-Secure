import { PagosFormModule } from "@/components/pagos724/PagosFormModule";
import { PagosHistorialModule } from "@/components/pagos724/PagosHistorialModule";
import { PagosEstadisticasModule } from "@/components/pagos724/PagosEstadisticasModule";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, History, BarChart3 } from "lucide-react";

export const Pagos724View = () => {
  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Módulo 724 - Pagos de Efectivo</h1>
        <p className="text-muted-foreground">
          Sistema para registrar y gestionar pagos de efectivo a clientes
        </p>
      </div>

      <Tabs defaultValue="registro" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="registro" className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4" />
            <span>Registrar Pago</span>
          </TabsTrigger>
          <TabsTrigger value="historial" className="flex items-center space-x-2">
            <History className="h-4 w-4" />
            <span>Historial</span>
          </TabsTrigger>
          <TabsTrigger value="estadisticas" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Estadísticas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registro" className="mt-6">
          <PagosFormModule />
        </TabsContent>

        <TabsContent value="historial" className="mt-6">
          <PagosHistorialModule />
        </TabsContent>

        <TabsContent value="estadisticas" className="mt-6">
          <PagosEstadisticasModule />
        </TabsContent>
      </Tabs>
    </div>
  );
};