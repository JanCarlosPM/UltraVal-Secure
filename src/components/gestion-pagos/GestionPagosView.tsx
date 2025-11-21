import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, CreditCard, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useGestionPagos } from '@/hooks/useGestionPagos';
import { useAuth } from '@/hooks/useAuth';
import { SolicitudPagoForm } from './SolicitudPagoForm';
import { EstadisticasPagos } from './EstadisticasPagos';
import { HistorialSolicitudes } from './HistorialSolicitudes';
import { SolicitudesPendientes } from './SolicitudesPendientes';

export const GestionPagosView = () => {
  const [showForm, setShowForm] = useState(false);
  const { estadisticas } = useGestionPagos();
  const { isFinanzas, isAdmin } = useAuth();

  const canApprove = isFinanzas || isAdmin;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestión de Pagos</h1>
          <p className="text-muted-foreground">
            Administra las solicitudes de pago y aprobaciones
          </p>
        </div>
      
      </div>

      {/* Estadísticas Rápidas */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Solicitudes</p>
                  <p className="text-2xl font-bold">{estadisticas.total_solicitudes}</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
                  <p className="text-2xl font-bold">{estadisticas.solicitudes_pendientes}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Aprobadas</p>
                  <p className="text-2xl font-bold">{estadisticas.solicitudes_aprobadas}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Monto Pendiente</p>
                  <p className="text-2xl font-bold">
                    ${estadisticas.monto_total_pendiente?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contenido Principal */}
      <Tabs defaultValue="solicitudes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="solicitudes">Mis Solicitudes</TabsTrigger>
          {canApprove && (
            <TabsTrigger value="pendientes">
              Pendientes de Aprobación
              {estadisticas && estadisticas.solicitudes_pendientes > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {estadisticas.solicitudes_pendientes}
                </Badge>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="historial">Historial</TabsTrigger>
          <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="solicitudes" className="space-y-4">
          <HistorialSolicitudes soloMias={true} />
        </TabsContent>

        {canApprove && (
          <TabsContent value="pendientes" className="space-y-4">
            <SolicitudesPendientes />
          </TabsContent>
        )}

        <TabsContent value="historial" className="space-y-4">
          <HistorialSolicitudes />
        </TabsContent>

        <TabsContent value="estadisticas" className="space-y-4">
          <EstadisticasPagos />
        </TabsContent>
      </Tabs>

      {/* Dialog para nueva solicitud */}
      <SolicitudPagoForm 
        open={showForm} 
        onOpenChange={setShowForm}
      />
    </div>
  );
};