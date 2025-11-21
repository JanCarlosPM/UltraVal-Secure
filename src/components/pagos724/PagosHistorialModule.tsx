import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePagos724 } from "@/hooks/usePagos724";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Search, User, DollarSign, FileImage, History } from "lucide-react";
import { cn } from "@/lib/utils";

export const PagosHistorialModule = () => {
  const [filtroFecha, setFiltroFecha] = useState<Date>();
  const [busqueda, setBusqueda] = useState("");
  const { pagos, loading } = usePagos724();

  const pagosFiltrados = pagos.filter(pago => {
    const matchFecha = !filtroFecha || 
      format(new Date(pago.fecha_pago), 'yyyy-MM-dd') === format(filtroFecha, 'yyyy-MM-dd');
    
    const matchBusqueda = !busqueda || 
      pago.nombres.toLowerCase().includes(busqueda.toLowerCase()) ||
      pago.apellidos.toLowerCase().includes(busqueda.toLowerCase()) ||
      pago.monto_pagar.toString().includes(busqueda);

    return matchFecha && matchBusqueda;
  });

  const formatearMonto = (monto: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(monto);
  };

  const formatearHora = (hora: string) => {
    return format(new Date(`1970-01-01T${hora}`), 'HH:mm', { locale: es });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <History className="h-5 w-5" />
          <span>Historial de Pagos</span>
        </CardTitle>
        <CardDescription>
          Consulte el historial completo de pagos registrados
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o monto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !filtroFecha && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filtroFecha ? format(filtroFecha, "PPP", { locale: es }) : "Filtrar por fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filtroFecha}
                onSelect={setFiltroFecha}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {filtroFecha && (
            <Button
              variant="ghost"
              onClick={() => setFiltroFecha(undefined)}
              className="px-2"
            >
              Limpiar
            </Button>
          )}
        </div>

        {/* Lista de Pagos */}
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : pagosFiltrados.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No se encontraron pagos con los filtros aplicados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pagosFiltrados.map((pago) => (
              <Card key={pago.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          <User className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="space-y-2">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {pago.nombres} {pago.apellidos}
                          </h3>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <CalendarIcon className="h-4 w-4" />
                            <span>
                              {format(new Date(pago.fecha_pago), 'dd/MM/yyyy', { locale: es })} 
                              {pago.hora_pago && ` - ${formatearHora(pago.hora_pago)}`}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="flex items-center space-x-1">
                            <DollarSign className="h-3 w-3" />
                            <span>{formatearMonto(pago.monto_pagar)}</span>
                          </Badge>
                          
                          {pago.foto_documento_url && (
                            <Badge variant="outline" className="flex items-center space-x-1">
                              <FileImage className="h-3 w-3" />
                              <span>Documento</span>
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {pago.foto_documento_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(pago.foto_documento_url, '_blank')}
                      >
                        Ver Documento
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};