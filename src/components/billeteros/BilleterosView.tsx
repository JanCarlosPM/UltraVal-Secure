import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, FileDown, Printer } from "lucide-react";
import { BilleterosCards } from "./BilleterosCards";
import { BilleterosFilters } from "./BilleterosFilters";
import { BilleterosForm } from "./BilleterosForm";
import { BilleterosList } from "./BilleterosList";
import { MovimientosBilleterosList } from "./MovimientosBilleterosList";
import { BilleterosExportDialog } from "./BilleterosExportDialog";
import { useBilleteros, FiltrosBilleteros, Billetero } from "@/hooks/useBilleteros";

export const BilleterosView = () => {
  const { billeteros, movimientos, billeterosLoading, obtenerBilleterosFiltrados } = useBilleteros();
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [billeterosFiltrados, setBilleterosFiltrados] = useState<Billetero[]>([]);

  useEffect(() => {
    setBilleterosFiltrados(billeteros);
  }, [billeteros]);

  const handleFiltrar = async (filtros: FiltrosBilleteros) => {
    if (Object.keys(filtros).length === 0) {
      setBilleterosFiltrados(billeteros);
      return;
    }

    try {
      const resultados = await obtenerBilleterosFiltrados(filtros);
      setBilleterosFiltrados(resultados);
    } catch (error) {
      console.error('Error al filtrar billeteros:', error);
      setBilleterosFiltrados([]);
    }
  };

  const handlePrintDirect = () => {
    window.print();
  };

  if (billeterosLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Billeteros</h2>
          <p className="text-muted-foreground">
            Gestión y control de billeteros
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handlePrintDirect}
            disabled={billeteros.length === 0}
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setExportDialogOpen(true)}
            disabled={billeteros.length === 0}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={() => setFormDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Billetero
          </Button>
        </div>
      </div>

      <BilleterosCards billeteros={billeteros} />

      <Tabs defaultValue="billeteros" className="space-y-4">
        <TabsList>
          <TabsTrigger value="billeteros">Billeteros</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
        </TabsList>

        <TabsContent value="billeteros" className="space-y-4">
          <BilleterosFilters onFilter={handleFiltrar} />
          <BilleterosList billeteros={billeterosFiltrados} />
        </TabsContent>

        <TabsContent value="movimientos">
          <MovimientosBilleterosList movimientos={movimientos} />
        </TabsContent>
      </Tabs>

      <BilleterosForm
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
      />
      <BilleterosExportDialog 
        open={exportDialogOpen} 
        onOpenChange={setExportDialogOpen}
        billeteros={billeterosFiltrados.length > 0 ? billeterosFiltrados : billeteros}
      />
    </div>
  );
};
