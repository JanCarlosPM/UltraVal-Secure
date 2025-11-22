import { useState, lazy, Suspense } from "react";
import Dashboard from "@/components/Dashboard";
import IncidenciaForm from "@/components/IncidenciaForm";
import ReportesView from "@/components/ReportesView";
import UserManagement from "@/components/admin/UserManagement";
import ConsolidadoDiario from "@/components/ConsolidadoDiario";
import ImportDataModule from "@/components/ImportDataModule";
import BorradoresView from "@/components/supervisor/BorradoresView";
import SalaTimingModule from "@/components/monitoring/SalaTimingModule";
import { SolicitudesView } from "@/components/solicitudes/SolicitudesView";
import { GestionPagosView } from "@/components/gestion-pagos/GestionPagosView";
import { Pagos724View } from "@/components/pagos724/Pagos724View";
import MovimientoActivos from "@/pages/MovimientoActivos";
import Header from "@/components/Header";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { AlertTriangle, MessageSquare } from "lucide-react";
import { 
  SidebarProvider, 
  SidebarTrigger, 
  SidebarInset 
} from "@/components/ui/sidebar";

// Vista de mis incidencias asignadas
import MisIncidenciasAsignadasView from "@/components/incidencias/MisIncidenciasAsignadasView";

const Index = () => {
  const { 
    isAdmin, 
    isMonitor, 
    isSupervisorMonitoreo, 
    isRRHH, 
    isSupervisorSalas, 
    isFinanzas, 
    isMantenimiento, 
    isLector, 
    isGestorSolicitudes 
  } = useAuth();

  const isMobile = useIsMobile();
  
  const [activeTab, setActiveTab] = useState(() => {
    // Si es gestor de solicitudes, mostrar solicitudes por defecto
    if (isGestorSolicitudes && !isAdmin) return "solicitudes";
    // Si es lector, mostrar reportes por defecto
    if (isLector && !isAdmin) return "reportes";
    // Si es supervisor, mostrar borradores por defecto
    if (isSupervisorMonitoreo && !isAdmin) return "borradores";
    // Si es monitor, mostrar nueva incidencia
    if (isMonitor && !isAdmin && !isSupervisorMonitoreo) return "nueva-incidencia";
    // Si es RRHH, finanzas, supervisor de salas o mantenimiento, mostrar reportes por defecto
    if ((isRRHH || isFinanzas || isSupervisorSalas || isMantenimiento) && !isAdmin) return "reportes";
    // Si es admin, mostrar dashboard
    return "dashboard";
  });

  // El gestor de solicitudes solo ve el módulo de solicitudes (sin sidebar)
  if (isGestorSolicitudes && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-100">
        <Header />
        
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 md:py-8">
          <div className="text-center mb-4 sm:mb-6 md:mb-8">
            <h1 className="text-xl sm:text-2xl md:text-4xl font-bold text-slate-900 mb-2 flex items-center justify-center gap-2 md:gap-3">
              <MessageSquare className="text-emerald-600 h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8" />
              <span>Sistema de Solicitudes - UltraVal</span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-slate-600 px-2 sm:px-4">
              Gestión y seguimiento de solicitudes por área
            </p>
          </div>

          <SolicitudesView />
        </div>
      </div>
    );
  }

  // Función para renderizar el contenido basado en el tab activo
  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <ProtectedRoute requireAdmin>
            <Dashboard />
          </ProtectedRoute>
        );
      case "nueva-incidencia":
        return <IncidenciaForm />;
      case "solicitudes":
        return <SolicitudesView />;
      case "pagos724":
        return <Pagos724View />;
      case "borradores":
        return <BorradoresView />;
      case "consolidado":
        return <ConsolidadoDiario />;
      case "reportes":
        return <ReportesView />;
      case "usuarios":
        return (
          <ProtectedRoute requireAdmin>
            <UserManagement />
          </ProtectedRoute>
        );
      case "monitoreo-salas":
        return (
          <ProtectedRoute requireAdmin={false}>
            <SalaTimingModule />
          </ProtectedRoute>
        );
      case "importar":
        return (
          <ProtectedRoute requireAdmin>
            <ImportDataModule />
          </ProtectedRoute>
        );
      case "gestion-pagos":
        return <GestionPagosView />;
      case "movimiento-activos":
        return <MovimientoActivos />;
      case "billeteros":
        const BilleterosPage = lazy(() => import('@/pages/Billeteros'));
        return (
          <Suspense fallback={<div>Cargando...</div>}>
            <BilleterosPage />
          </Suspense>
        );
      case "mis-incidencias":
        return <MisIncidenciasAsignadasView />;
      default:
        return (
          <ProtectedRoute requireAdmin>
            <Dashboard />
          </ProtectedRoute>
        );
    }
  };

  // Layout principal con sidebar para todos los demás roles
  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
        <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <SidebarInset className="flex-1 flex flex-col">
          {/* Header corporativo */}
          <Header />
          
          {/* Barra superior con trigger + tagline */}
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-emerald-100 px-4 bg-emerald-950/95">
            <SidebarTrigger className="-ml-1 text-emerald-50 hover:text-white" />
            <div className="ml-auto flex items-center gap-2 text-xs sm:text-sm text-emerald-50">
              <AlertTriangle className="h-4 w-4 text-emerald-300" />
              <span>Sistema de Monitoreo - ULTRAVAL Secure Desk</span>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-4 md:p-6">
              {renderContent()}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Index;
