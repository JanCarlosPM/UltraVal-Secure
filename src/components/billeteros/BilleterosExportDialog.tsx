import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Billetero } from "@/hooks/useBilleteros";
import { FileDown, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

interface BilleterosExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billeteros: Billetero[];
}

interface ColumnConfig {
  key: string;
  label: string;
  enabled: boolean;
}

export const BilleterosExportDialog = ({
  open,
  onOpenChange,
  billeteros,
}: BilleterosExportDialogProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: "codigo", label: "Código", enabled: true },
    { key: "serial", label: "Serial", enabled: true },
    { key: "tipo", label: "Tipo", enabled: true },
    { key: "estado", label: "Estado", enabled: true },
    { key: "sala", label: "Sala", enabled: true },
    { key: "numero_maquina", label: "Número de Máquina", enabled: true },
    { key: "descripcion", label: "Descripción", enabled: false },
    { key: "observaciones", label: "Observaciones", enabled: false },
    { key: "fecha_ingreso", label: "Fecha de Ingreso", enabled: true },
  ]);

  const toggleColumn = (key: string) => {
    setColumns(
      columns.map((col) =>
        col.key === key ? { ...col, enabled: !col.enabled } : col
      )
    );
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const enabledColumns = columns.filter((col) => col.enabled);
      
      // Preparar los datos
      const excelData = billeteros.map((billetero) => {
        const row: any = {};
        enabledColumns.forEach((col) => {
          switch (col.key) {
            case "codigo":
              row[col.label] = billetero.codigo;
              break;
            case "serial":
              row[col.label] = billetero.serial || "-";
              break;
            case "tipo":
              row[col.label] = billetero.tipo === "MJ" ? "Multijuegos" : "Poker";
              break;
            case "estado":
              const estadoLabels: any = {
                en_stock: "En Stock",
                asignado: "Asignado",
                reparacion: "Reparación",
                en_programacion: "En Programación",
                descarte: "Descarte",
              };
              row[col.label] = estadoLabels[billetero.estado] || billetero.estado;
              break;
            case "sala":
              row[col.label] = billetero.salas?.nombre || "-";
              break;
            case "numero_maquina":
              row[col.label] = billetero.numero_maquina || "-";
              break;
            case "descripcion":
              row[col.label] = billetero.descripcion || "-";
              break;
            case "observaciones":
              row[col.label] = billetero.observaciones || "-";
              break;
            case "fecha_ingreso":
              row[col.label] = new Date(billetero.fecha_ingreso).toLocaleDateString(
                "es-ES"
              );
              break;
          }
        });
        return row;
      });

      // Crear el libro de trabajo
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Ajustar el ancho de las columnas
      const colWidths = enabledColumns.map(() => ({ wch: 20 }));
      ws["!cols"] = colWidths;

      // Agregar la hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, "Billeteros");

      // Generar y descargar el archivo
      const fileName = `billeteros_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      onOpenChange(false);
    } catch (error) {
      console.error("Error al exportar:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Billeteros a Excel</DialogTitle>
          <DialogDescription>
            Selecciona las columnas que deseas incluir en el reporte
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            {columns.map((column) => (
              <div key={column.key} className="flex items-center space-x-2">
                <Checkbox
                  id={column.key}
                  checked={column.enabled}
                  onCheckedChange={() => toggleColumn(column.key)}
                />
                <Label
                  htmlFor={column.key}
                  className="text-sm font-normal cursor-pointer"
                >
                  {column.label}
                </Label>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting || !columns.some((col) => col.enabled)}
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              Exportar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
