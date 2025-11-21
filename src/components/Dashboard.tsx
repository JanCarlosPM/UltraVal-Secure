
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePageAudit } from '@/hooks/usePageAudit';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatsCard } from "@/components/ui/stats-card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  AlertTriangle, 
  Calendar,
  Activity
} from "lucide-react";

// Lazy load components to improve performance
const IncidenciaForm = React.lazy(() => import('./IncidenciaForm'));
const ReportesView = React.lazy(() => import('./ReportesView'));
const UserManagement = React.lazy(() => import('./admin/UserManagement'));
const AuditLog = React.lazy(() => import('./admin/AuditLog'));
const BorradoresView = React.lazy(() => import('./supervisor/BorradoresView'));
const QuinzenalStatsCard = React.lazy(() => import('./dashboard/QuinzenalStatsCard'));
const PeriodComparisonCard = React.lazy(() => import('./dashboard/PeriodComparisonCard'));
const SalaTimingModule = React.lazy(() => import('./monitoring/SalaTimingModule'));
const EstadoMaquinasModule = React.lazy(() => import('./monitoring/EstadoMaquinasModule'));
const MonitorKPIs = React.lazy(() => import('./dashboard/MonitorKPIs'));
const UserStatisticsChart = React.lazy(() => import('./dashboard/UserStatisticsChart'));

const Dashboard = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const { logPageView } = usePageAudit();

  // Auditoría optimizada del dashboard
  React.useEffect(() => {
    if (profile) {
      logPageView('dashboard', {
        activeTab,
        userRole: profile.role
      });
    }
  }, [activeTab, profile?.role, logPageView]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  // Queries optimizadas con cache
  const { data: totalIncidencias } = useQuery({
    queryKey: ["total-incidencias"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("incidencias")
        .select("*", { count: 'exact', head: true })
        .eq("estado", "aprobado");
      if (error) throw error;
      return count || 0;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: alertasCriticas } = useQuery({
    queryKey: ["alertas-criticas"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("incidencias")
        .select("*", { count: 'exact', head: true })
        .eq("estado", "aprobado")
        .eq("prioridad", "critica");
      if (error) throw error;
      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: eventosHoy } = useQuery({
    queryKey: ["eventos-hoy"],
    queryFn: async () => {
      const hoy = new Date().toISOString().split('T')[0];
      const { count, error } = await supabase
        .from("incidencias")
        .select("*", { count: 'exact', head: true })
        .eq("estado", "aprobado")
        .gte("fecha_incidencia", hoy)
        .lt("fecha_incidencia", hoy + "T23:59:59");
      if (error) throw error;
      return count || 0;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
  });

  const { data: monitoresActivos } = useQuery({
    queryKey: ["monitores-activos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidencias")
        .select("reportado_por")
        .eq("estado", "aprobado");
      if (error) throw error;
      const uniqueMonitors = new Set(data?.map(inc => inc.reportado_por) || []);
      return uniqueMonitors.size;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Tarjetas de estadísticas principales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Incidencias Totales"
                value={totalIncidencias || 0}
                description="Total de incidencias aprobadas"
                icon={Activity}
                gradient="blue"
              />
              <StatsCard
                title="Alertas Críticas"
                value={alertasCriticas || 0}
                description="Requieren atención inmediata"
                icon={AlertTriangle}
                gradient="red"
              />
              <StatsCard
                title="Eventos Hoy"
                value={eventosHoy || 0}
                description="Incidencias registradas hoy"
                icon={Calendar}
                gradient="green"
              />
              <StatsCard
                title="Monitores Activos"
                value={monitoresActivos || 0}
                description="Usuarios reportando incidencias"
                icon={Users}
                gradient="purple"
              />
            </div>

            {/* Gráficos y estadísticas quincenales */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <React.Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
                <QuinzenalStatsCard />
              </React.Suspense>
              <React.Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
                <PeriodComparisonCard />
              </React.Suspense>
            </div>

            {/* Estadísticas detalladas */}
            <div className="grid grid-cols-1 gap-6">
              <React.Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
                <UserStatisticsChart />
              </React.Suspense>
              <React.Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
                <MonitorKPIs />
              </React.Suspense>
            </div>
          </div>
        );
      case 'incidencias':
        return (
          <React.Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
            <IncidenciaForm />
          </React.Suspense>
        );
      case 'reportes':
        return (
          <React.Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
            <ReportesView />
          </React.Suspense>
        );
      case 'admin':
        return profile?.role === 'admin' ? (
          <React.Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
            <UserManagement />
          </React.Suspense>
        ) : (
          <div>No tienes permisos para acceder a esta sección.</div>
        );
      case 'audit':
        return profile?.role === 'admin' ? (
          <React.Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
            <AuditLog />
          </React.Suspense>
        ) : (
          <div>No tienes permisos para acceder a esta sección.</div>
        );
      case 'borradores':
        return (profile?.role === 'supervisor_monitoreo' || profile?.role === 'admin') ? (
          <React.Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
            <BorradoresView />
          </React.Suspense>
        ) : (
          <div>No tienes permisos para acceder a esta sección.</div>
        );
      case 'monitoreo-salas':
        return (
          <React.Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
            <SalaTimingModule />
          </React.Suspense>
        );
      case 'estado-maquinas':
        return (profile?.role === 'admin' || profile?.role === 'tecnico') ? (
          <React.Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
            <EstadoMaquinasModule />
          </React.Suspense>
        ) : (
          <div>No tienes permisos para acceder a esta sección.</div>
        );
      default:
        return <div>Sección no encontrada</div>;
    }
  };

  return (
    <div className="w-full space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
       
        
        <div className="mt-6">
          <TabsContent value={activeTab} className="mt-0">
            {renderContent()}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default Dashboard;
