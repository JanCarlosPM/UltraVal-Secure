
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePageAudit } from "@/hooks/usePageAudit";
import { useEffect } from "react";
import Index from "@/pages/Index";
import Solicitudes from "@/pages/Solicitudes";
import Pagos724 from "@/pages/Pagos724";
import MovimientoActivos from "@/pages/MovimientoActivos";
import Billeteros from "@/pages/Billeteros";
import AuthPage from "@/components/AuthPage";
import NotFound from "@/pages/NotFound";

const AppContent = () => {
  const { user, profile, loading } = useAuth();
  const { logPageView } = usePageAudit();

  useEffect(() => {
    if (!loading && user && profile) {
      logPageView('app_load', {
        userRole: profile.role,
        userId: user.id,
        timestamp: new Date().toISOString()
      });
    }
  }, [loading, user, profile, logPageView]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthPage />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/solicitudes" element={<Solicitudes />} />
        <Route path="/pagos724" element={<Pagos724 />} />
        <Route path="/movimiento-activos" element={<MovimientoActivos />} />
        <Route path="/billeteros" element={<Billeteros />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppContent;
